import Storage from 'expo-sqlite/kv-store';
import { AppSettings } from '@/constants/types';

const KEYS = {
  SAVED_SIGNATURE_URI: 'paperkit_saved_signature_uri',
  DEFAULT_COMPRESSION_KB: 'paperkit_default_compression_kb',
  EXPORT_COUNTER: 'paperkit_export_counter',
} as const;

export const DEFAULT_COMPRESSION_KB = 200;
export const DEFAULT_EXPORT_COUNTER = 0;

/**
 * Retrieves the saved signature URI or null if not set.
 */
export async function getSavedSignatureUri(): Promise<string | null> {
  try {
    return await Storage.getItem(KEYS.SAVED_SIGNATURE_URI);
  } catch (error) {
    console.warn('[db/settings] Failed to get savedSignatureUri:', error);
    return null;
  }
}

/**
 * Persists or clears the saved signature URI.
 */
export async function setSavedSignatureUri(uri: string | null): Promise<void> {
  try {
    if (uri === null) {
      await Storage.removeItem(KEYS.SAVED_SIGNATURE_URI);
    } else {
      await Storage.setItem(KEYS.SAVED_SIGNATURE_URI, uri);
    }
  } catch (error) {
    console.warn('[db/settings] Failed to set savedSignatureUri:', error);
  }
}

/**
 * Retrieves the default target compression in KB (defaults to 200).
 */
export async function getDefaultCompressionKb(): Promise<number> {
  try {
    const value = await Storage.getItem(KEYS.DEFAULT_COMPRESSION_KB);
    if (value !== null) {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return DEFAULT_COMPRESSION_KB;
  } catch (error) {
    console.warn('[db/settings] Failed to get defaultCompressionKb:', error);
    return DEFAULT_COMPRESSION_KB;
  }
}

/**
 * Sets the default target compression size in KB.
 */
export async function setDefaultCompressionKb(kb: number): Promise<void> {
  try {
    await Storage.setItem(KEYS.DEFAULT_COMPRESSION_KB, kb.toString());
  } catch (error) {
    console.warn('[db/settings] Failed to set defaultCompressionKb:', error);
  }
}

/**
 * Retrieves the cumulative export counter (defaults to 0).
 */
export async function getExportCounter(): Promise<number> {
  try {
    const value = await Storage.getItem(KEYS.EXPORT_COUNTER);
    if (value !== null) {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
    return DEFAULT_EXPORT_COUNTER;
  } catch (error) {
    console.warn('[db/settings] Failed to get exportCounter:', error);
    return DEFAULT_EXPORT_COUNTER;
  }
}

/**
 * Sets the cumulative export counter.
 */
export async function setExportCounter(counter: number): Promise<void> {
  try {
    await Storage.setItem(KEYS.EXPORT_COUNTER, counter.toString());
  } catch (error) {
    console.warn('[db/settings] Failed to set exportCounter:', error);
  }
}

/**
 * Increments the export counter atomically and returns the updated count.
 */
export async function incrementExportCounter(): Promise<number> {
  const current = await getExportCounter();
  const next = current + 1;
  await setExportCounter(next);
  return next;
}

/**
 * Loads all app settings in a single call.
 */
export async function getAllSettings(): Promise<AppSettings> {
  const [savedSignatureUri, defaultCompressionKb, exportCounter] = await Promise.all([
    getSavedSignatureUri(),
    getDefaultCompressionKb(),
    getExportCounter(),
  ]);

  return {
    savedSignatureUri,
    defaultCompressionKb,
    exportCounter,
  };
}
