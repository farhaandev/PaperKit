import { PDFDocument } from 'pdf-lib';
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

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

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
