import { PDFDocument, EncryptedPDFError } from 'pdf-lib';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { RecentFile } from '@/constants/types';
import { addRecentFile, incrementExportCounter } from '@/db';
import {
  EXPORTS_DIRECTORY,
  ensureDirectoriesExist,
  generateSafeFilename,
  getFileSizeBytes,
} from './fileManager';

export interface BuildPdfFromImagesOptions {
  imageUris: string[];
  pageSize: 'A4' | 'fit';
  margin: number;
  outputTitle: string;
}

export interface PdfMetadata {
  pageCount: number;
  isEncrypted: boolean;
}

export interface MergePdfOptions {
  pdfUris: string[];
  outputTitle: string;
}

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

/**
 * Safely resolves an Android content:// URI or external URI into a local cached file:// URI
 * so that native read operations and pdf-lib can access the bytes directly.
 */
export async function prepareLocalPdfUri(
  sourceUri: string,
  suggestedName?: string
): Promise<string> {
  // If already a local file:// that exists, return directly
  if (sourceUri.startsWith('file://')) {
    try {
      const info = await FileSystem.getInfoAsync(sourceUri);
      if (info.exists) {
        return sourceUri;
      }
    } catch {}
  }

  // Copy content:// or inaccessible URI into app cache directory
  const safeName = suggestedName
    ? suggestedName.replace(/[^a-zA-Z0-9._-]/g, '_')
    : `doc_${Date.now()}.pdf`;
  const cleanName = safeName.toLowerCase().endsWith('.pdf') ? safeName : `${safeName}.pdf`;
  const targetCacheUri = `${FileSystem.cacheDirectory}${Date.now()}_${cleanName}`;

  await FileSystem.copyAsync({
    from: sourceUri,
    to: targetCacheUri,
  });

  return targetCacheUri;
}

/**
 * Reads local or content file content as Base64, with copyAsync normalization
 * and an XMLHttpRequest blob fallback.
 */
export async function readLocalFileAsBase64(uri: string): Promise<string> {
  let readableUri = uri;

  // 1. If it's a content:// URI, copy it to cache first
  if (uri.startsWith('content://')) {
    try {
      readableUri = await prepareLocalPdfUri(uri);
    } catch (copyErr) {
      console.warn('[readLocalFileAsBase64] Failed to copy content URI to cache:', copyErr);
    }
  }

  // 2. Try native FileSystem readAsStringAsync
  try {
    return await FileSystem.readAsStringAsync(readableUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch (fsErr) {
    console.warn('[readLocalFileAsBase64] readAsStringAsync failed, attempting XHR fallback:', fsErr);
  }

  // 3. Fallback: XMLHttpRequest blob -> FileReader base64
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', readableUri, true);
    xhr.responseType = 'blob';
    xhr.onload = () => {
      const blob = xhr.response as Blob;
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = (reader.result as string) || '';
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('FileReader failed to encode blob'));
      reader.readAsDataURL(blob);
    };
    xhr.onerror = (e) => reject(new Error(`XHR failed to read file: ${JSON.stringify(e)}`));
    xhr.send();
  });
}

/**
 * Inspects a PDF file's metadata (page count and encryption status)
 * without modifying it. Gracefully catches password/encryption errors.
 */
export async function inspectPdfMetadata(uri: string): Promise<PdfMetadata> {
  try {
    const base64 = await readLocalFileAsBase64(uri);

    const doc = await PDFDocument.load(base64, { ignoreEncryption: false });
    return {
      pageCount: doc.getPageCount(),
      isEncrypted: false,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      error instanceof EncryptedPDFError ||
      errorMessage.toLowerCase().includes('encrypted') ||
      errorMessage.toLowerCase().includes('password')
    ) {
      return {
        pageCount: 0,
        isEncrypted: true,
      };
    }
    console.warn('[inspectPdfMetadata] Failed to parse PDF at uri:', uri, error);
    throw error;
  }
}

/**
 * Merges multiple PDF documents into a single document in exact sequence order.
 * Saves the merged PDF directly into EXPORTS_DIRECTORY, records in SQLite,
 * increments the export counter, and returns the created RecentFile.
 */
export async function mergePdfDocuments(
  options: MergePdfOptions
): Promise<RecentFile> {
  const { pdfUris, outputTitle } = options;

  if (!pdfUris || pdfUris.length < 2) {
    throw new Error('At least two PDF files are required to merge.');
  }

  // 1. Create a master PDF document
  const mergedPdf = await PDFDocument.create();

  // 2. Loop through each PDF in exact order
  for (const uri of pdfUris) {
    const base64 = await readLocalFileAsBase64(uri);
    const srcDoc = await PDFDocument.load(base64, { ignoreEncryption: false });
    const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }
  }

  // 3. Serialize merged document to base64
  const pdfBase64 = await mergedPdf.saveAsBase64({ dataUri: false });

  // 4. Save directly into EXPORTS_DIRECTORY
  await ensureDirectoriesExist();
  const safeFilename = generateSafeFilename(outputTitle || 'merged', 'pdf');
  const fileUri = `${EXPORTS_DIRECTORY}${safeFilename}`;

  await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const sizeBytes = await getFileSizeBytes(fileUri);

  // 5. Store record in SQLite database
  const title = outputTitle.trim().length > 0 ? outputTitle.trim() : 'Merged Document';
  const displayTitle = title.toLowerCase().endsWith('.pdf') ? title : `${title}.pdf`;

  const recentFile = await addRecentFile({
    title: displayTitle,
    file_uri: fileUri,
    mime_type: 'application/pdf',
    size_bytes: sizeBytes,
    tool_type: 'merge-pdf',
    created_at: Date.now(),
  });

  // 6. Increment global export counter
  await incrementExportCounter();

  return recentFile;
}

/**
 * Builds a multi-page PDF document from an array of image URIs.
 * Normalizes all images through expo-image-manipulator to prevent crashes from HEIC/WebP/raw formats.
 * Persists the resulting PDF in app exports and saves a record in SQLite.
 */
export async function buildPdfFromImages(
  options: BuildPdfFromImagesOptions
): Promise<RecentFile> {
  const { imageUris, pageSize, margin, outputTitle } = options;

  if (!imageUris || imageUris.length === 0) {
    throw new Error('At least one image is required to generate a PDF.');
  }

  // 1. Create a fresh PDF document
  const pdfDoc = await PDFDocument.create();

  // 2. Process each image sequentially
  for (const uri of imageUris) {
    // Normalize to JPEG with 0.88 compression and base64 export
    const manipResult = await manipulateAsync(
      uri,
      [],
      {
        compress: 0.88,
        format: SaveFormat.JPEG,
        base64: true,
      }
    );

    if (!manipResult.base64) {
      throw new Error(`Failed to encode image at: ${uri}`);
    }

    // Embed the JPEG into the PDF
    const embeddedImage = await pdfDoc.embedJpg(manipResult.base64);
    const { width: imgWidth, height: imgHeight } = embeddedImage;

    if (pageSize === 'A4') {
      const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      const availWidth = A4_WIDTH - margin * 2;
      const availHeight = A4_HEIGHT - margin * 2;

      const scale = Math.min(availWidth / imgWidth, availHeight / imgHeight);
      const drawWidth = imgWidth * scale;
      const drawHeight = imgHeight * scale;

      const x = margin + (availWidth - drawWidth) / 2;
      const y = margin + (availHeight - drawHeight) / 2;

      page.drawImage(embeddedImage, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
      });
    } else {
      // Fit to image with optional max bound to avoid gigantic points
      const maxDim = 1200;
      const scale =
        imgWidth > maxDim || imgHeight > maxDim
          ? Math.min(maxDim / imgWidth, maxDim / imgHeight)
          : 1;

      const drawWidth = imgWidth * scale;
      const drawHeight = imgHeight * scale;
      const pageWidth = drawWidth + margin * 2;
      const pageHeight = drawHeight + margin * 2;

      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      page.drawImage(embeddedImage, {
        x: margin,
        y: margin,
        width: drawWidth,
        height: drawHeight,
      });
    }
  }

  // 3. Serialize to base64
  const pdfBase64 = await pdfDoc.saveAsBase64({ dataUri: false });

  // 4. Save directly into EXPORTS_DIRECTORY
  await ensureDirectoriesExist();
  const safeFilename = generateSafeFilename(outputTitle || 'scan', 'pdf');
  const fileUri = `${EXPORTS_DIRECTORY}${safeFilename}`;

  await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const sizeBytes = await getFileSizeBytes(fileUri);

  // 5. Store record in SQLite database
  const title = outputTitle.trim().length > 0 ? outputTitle.trim() : 'Document';
  const displayTitle = title.toLowerCase().endsWith('.pdf') ? title : `${title}.pdf`;

  const recentFile = await addRecentFile({
    title: displayTitle,
    file_uri: fileUri,
    mime_type: 'application/pdf',
    size_bytes: sizeBytes,
    tool_type: 'images-to-pdf',
    created_at: Date.now(),
  });

  // 6. Increment global export counter
  await incrementExportCounter();

  return recentFile;
}
