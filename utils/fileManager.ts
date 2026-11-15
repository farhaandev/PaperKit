import * as FileSystem from 'expo-file-system/legacy';

const baseDocDir = FileSystem.documentDirectory ?? '';

export const EXPORTS_DIRECTORY = `${baseDocDir}paperkit_exports/`;
export const SIGNATURES_DIRECTORY = `${baseDocDir}paperkit_signatures/`;

/**
 * Ensures that the app-owned exports and signatures directories exist on disk.
 */
export async function ensureDirectoriesExist(): Promise<void> {
  const dirs = [EXPORTS_DIRECTORY, SIGNATURES_DIRECTORY];
  for (const dir of dirs) {
    if (!dir) continue;
    try {
      const info = await FileSystem.getInfoAsync(dir);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
    } catch (error) {
      console.warn(`[fileManager] Failed to ensure directory exists: ${dir}`, error);
    }
  }
}

/**
 * Sanitizes input prefix and appends a timestamp to create a safe, collision-resistant filename.
 */
export function generateSafeFilename(
  prefix: string,
  extension: 'pdf' | 'jpg' | 'png'
): string {
  const sanitized = prefix
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  const safePrefix = sanitized.length > 0 ? sanitized : 'document';
  const timestamp = Date.now();
  return `${safePrefix}_${timestamp}.${extension}`;
}

/**
 * Retrieves the file size in bytes for a given file URI.
 * Returns 0 if the file doesn't exist or on error.
 */
export async function getFileSizeBytes(uri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && typeof info.size === 'number') {
      return info.size;
    }
    return 0;
  } catch (error) {
    console.warn(`[fileManager] Failed to get file size for ${uri}:`, error);
    return 0;
  }
}

/**
 * Formats a raw byte count into a human-readable string (B, KB, MB, GB).
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const digitGroups = Math.floor(Math.log(bytes) / Math.log(1024));
  const groupIndex = Math.min(digitGroups, units.length - 1);
  const size = bytes / Math.pow(1024, groupIndex);
  return `${size < 10 && groupIndex > 0 ? size.toFixed(1) : Math.round(size)} ${units[groupIndex]}`;
}

/**
 * Copies a source file (e.g., from cache or picker) into the app-owned exports directory
 * and returns the new permanent URI and verified size in bytes.
 */
export async function saveFileToExports(
  sourceUri: string,
  filename: string
): Promise<{ uri: string; sizeBytes: number }> {
  await ensureDirectoriesExist();
  const destUri = `${EXPORTS_DIRECTORY}${filename}`;
  await FileSystem.copyAsync({
    from: sourceUri,
    to: destUri,
  });
  const sizeBytes = await getFileSizeBytes(destUri);
  return {
    uri: destUri,
    sizeBytes,
  };
}
