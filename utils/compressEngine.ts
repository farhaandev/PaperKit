import { manipulateAsync, SaveFormat, Action } from 'expo-image-manipulator';
import { PDFDocument } from 'pdf-lib';
import * as FileSystem from 'expo-file-system/legacy';
import { RecentFile } from '@/constants/types';
import { addRecentFile, incrementExportCounter } from '@/db';
import {
  EXPORTS_DIRECTORY,
  ensureDirectoriesExist,
  generateSafeFilename,
  getFileSizeBytes,
  saveFileToExports,
} from './fileManager';

export interface CompressImageOptions {
  sourceUri: string;
  targetKb?: number;
  manualQuality?: number;
  maxWidth?: number;
}

export interface CompressImageResult {
  uri: string;
  sizeBytes: number;
  width: number;
  height: number;
  qualityUsed: number;
}

export interface SaveCompressedImageOptions {
  compressedUri: string;
  outputTitle: string;
  exportAsPdf?: boolean;
}

/**
 * Deterministically compresses an image using expo-image-manipulator.
 * Supports Target-KB mode (iterative binary/step-down search) or Manual Quality mode.
 */
export async function compressImageToTarget(
  options: CompressImageOptions
): Promise<CompressImageResult> {
  const { sourceUri, targetKb, manualQuality, maxWidth } = options;

  if (!sourceUri) {
    throw new Error('A valid sourceUri is required for compression.');
  }

  // 1. Manual Quality Mode
  if (typeof manualQuality === 'number') {
    const quality = Math.min(Math.max(manualQuality, 0.1), 1.0);
    const actions: Action[] = [];
    if (typeof maxWidth === 'number' && maxWidth > 0) {
      actions.push({ resize: { width: maxWidth } });
    }

    const manipResult = await manipulateAsync(sourceUri, actions, {
      compress: quality,
      format: SaveFormat.JPEG,
    });
    const sizeBytes = await getFileSizeBytes(manipResult.uri);

    return {
      uri: manipResult.uri,
      sizeBytes,
      width: manipResult.width,
      height: manipResult.height,
      qualityUsed: quality,
    };
  }

  // 2. Target-KB Mode
  const targetBytes = (targetKb && targetKb > 0 ? targetKb : 200) * 1024;

  // Initial probe to get baseline dimensions and size at quality 0.9
  const initial = await manipulateAsync(sourceUri, [], {
    compress: 0.9,
    format: SaveFormat.JPEG,
  });
  const origWidth = initial.width;
  const origHeight = initial.height;
  const initialSize = await getFileSizeBytes(initial.uri);

  // If already under target at 0.9 quality, return immediately
  if (initialSize <= targetBytes) {
    return {
      uri: initial.uri,
      sizeBytes: initialSize,
      width: origWidth,
      height: origHeight,
      qualityUsed: 0.9,
    };
  }

  // Width ladder for progressive downscaling
  const widthLadder = [origWidth, 1600, 1200, 900, 640].filter(
    (w, idx, arr) => arr.indexOf(w) === idx && w <= origWidth
  );

  let widthIdx = 0;
  // If target size is tiny compared to original, start with a scaled-down resolution
  if (initialSize > targetBytes * 4 && widthLadder.length > 2) {
    widthIdx = 1;
  }
  if (initialSize > targetBytes * 8 && widthLadder.length > 3) {
    widthIdx = 2;
  }

  let lowQ = 0.15;
  let highQ = 0.88;
  const initialRatio = targetBytes / initialSize;
  let currentQ = Math.min(0.85, Math.max(0.35, initialRatio));

  let bestResult: CompressImageResult | null = null;

  // Maximum 6 iterations
  for (let iter = 0; iter < 6; iter++) {
    const currentWidth = widthLadder[widthIdx];
    const actions: Action[] = [];
    if (currentWidth < origWidth) {
      actions.push({ resize: { width: currentWidth } });
    }

    const pass = await manipulateAsync(sourceUri, actions, {
      compress: currentQ,
      format: SaveFormat.JPEG,
    });
    const passSize = await getFileSizeBytes(pass.uri);

    const candidate: CompressImageResult = {
      uri: pass.uri,
      sizeBytes: passSize,
      width: pass.width,
      height: pass.height,
      qualityUsed: Math.round(currentQ * 100) / 100,
    };

    if (passSize <= targetBytes) {
      // Valid candidate under target
      if (!bestResult || candidate.sizeBytes > bestResult.sizeBytes) {
        bestResult = candidate;
      }

      // If within 85%-100% of target, it's the optimal fidelity under the limit
      if (passSize >= targetBytes * 0.85) {
        return candidate;
      }

      // Try increasing quality slightly to get closer to target
      lowQ = currentQ;
      currentQ = Math.min(0.92, (lowQ + highQ) / 2);
    } else {
      // Still over target
      if (!bestResult || (bestResult.sizeBytes > targetBytes && passSize < bestResult.sizeBytes)) {
        bestResult = candidate;
      }

      highQ = currentQ;

      // If quality is already low or size is far over target, step down resolution
      if ((currentQ <= 0.35 || passSize > targetBytes * 1.8) && widthIdx + 1 < widthLadder.length) {
        widthIdx++;
        lowQ = 0.22;
        highQ = 0.8;
        currentQ = 0.58;
        continue;
      }

      // Otherwise binary step down quality
      currentQ = Math.max(0.15, (lowQ + highQ) / 2);
    }
  }

  return (
    bestResult ?? {
      uri: initial.uri,
      sizeBytes: initialSize,
      width: origWidth,
      height: origHeight,
      qualityUsed: 0.9,
    }
  );
}

/**
 * Persists a compressed image to exports as either a JPEG or single-page PDF.
 * Records the file in SQLite and increments the export counter.
 */
export async function saveCompressedImage(
  options: SaveCompressedImageOptions
): Promise<RecentFile> {
  const { compressedUri, outputTitle, exportAsPdf = false } = options;
  await ensureDirectoriesExist();

  const cleanTitle = outputTitle.trim().length > 0 ? outputTitle.trim() : 'Compressed_Image';

  if (exportAsPdf) {
    // 1. Wrap the compressed JPEG directly into a PDF using pdf-lib
    const pdfDoc = await PDFDocument.create();

    const manip = await manipulateAsync(compressedUri, [], {
      base64: true,
      format: SaveFormat.JPEG,
    });

    if (!manip.base64) {
      throw new Error('Failed to encode compressed image for PDF conversion.');
    }

    const embeddedImage = await pdfDoc.embedJpg(manip.base64);
    const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
    page.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: embeddedImage.width,
      height: embeddedImage.height,
    });

    const pdfBase64 = await pdfDoc.saveAsBase64({ dataUri: false });
    const safeFilename = generateSafeFilename(cleanTitle, 'pdf');
    const fileUri = `${EXPORTS_DIRECTORY}${safeFilename}`;

    await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const sizeBytes = await getFileSizeBytes(fileUri);
    const finalTitle = cleanTitle.toLowerCase().endsWith('.pdf') ? cleanTitle : `${cleanTitle}.pdf`;

    const recentFile = await addRecentFile({
      title: finalTitle,
      file_uri: fileUri,
      mime_type: 'application/pdf',
      size_bytes: sizeBytes,
      tool_type: 'compress',
      created_at: Date.now(),
    });

    await incrementExportCounter();
    return recentFile;
  } else {
    // 2. Save directly as JPEG
    const safeFilename = generateSafeFilename(cleanTitle, 'jpg');
    const saved = await saveFileToExports(compressedUri, safeFilename);

    const finalTitle =
      cleanTitle.toLowerCase().endsWith('.jpg') || cleanTitle.toLowerCase().endsWith('.jpeg')
        ? cleanTitle
        : `${cleanTitle}.jpg`;

    const recentFile = await addRecentFile({
      title: finalTitle,
      file_uri: saved.uri,
      mime_type: 'image/jpeg',
      size_bytes: saved.sizeBytes,
      tool_type: 'compress',
      created_at: Date.now(),
    });

    await incrementExportCounter();
    return recentFile;
  }
}
