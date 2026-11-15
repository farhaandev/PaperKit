import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { RecentFile } from '@/constants/types';

export const DATABASE_NAME = 'paperkit.db';

let dbInstancePromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Returns a singleton connection to the PaperKit SQLite database.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstancePromise) {
    dbInstancePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  return dbInstancePromise;
}

/**
 * Initializes database pragmas, tables, and indexes.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await getDatabase();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS recent_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      file_uri TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      tool_type TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_recent_files_created_at ON recent_files (created_at DESC);
  `);
  return db;
}

/**
 * Inserts a new recent file record and returns the complete entity with generated ID.
 */
export async function addRecentFile(
  file: Omit<RecentFile, 'id'>
): Promise<RecentFile> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO recent_files (title, file_uri, mime_type, size_bytes, tool_type, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      file.title,
      file.file_uri,
      file.mime_type,
      file.size_bytes,
      file.tool_type,
      file.created_at,
    ]
  );

  return {
    ...file,
    id: result.lastInsertRowId,
  };
}

/**
 * Retrieves recent files ordered by created_at DESC, with an optional limit.
 */
export async function getRecentFiles(limit?: number): Promise<RecentFile[]> {
  const db = await getDatabase();
  if (typeof limit === 'number' && limit > 0) {
    return await db.getAllAsync<RecentFile>(
      `SELECT * FROM recent_files ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
  }
  return await db.getAllAsync<RecentFile>(
    `SELECT * FROM recent_files ORDER BY created_at DESC`
  );
}

/**
 * Retrieves the total count of stored recent files.
 */
export async function getRecentFilesCount(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM recent_files`
  );
  return row?.count ?? 0;
}

/**
 * Updates the title of an existing recent file.
 */
export async function renameRecentFile(
  id: number,
  newTitle: string
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE recent_files SET title = ? WHERE id = ?`,
    [newTitle, id]
  );
}

/**
 * Deletes a recent file record from SQLite and safely deletes its physical file from disk if present.
 */
export async function deleteRecentFile(id: number): Promise<void> {
  const db = await getDatabase();
  const record = await db.getFirstAsync<{ file_uri: string }>(
    `SELECT file_uri FROM recent_files WHERE id = ?`,
    [id]
  );

  if (record?.file_uri) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(record.file_uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(record.file_uri, { idempotent: true });
      }
    } catch (err) {
      console.warn(`[db/database] Failed to delete physical file at ${record.file_uri}:`, err);
    }
  }

  await db.runAsync(`DELETE FROM recent_files WHERE id = ?`, [id]);
}

/**
 * Deletes all recent file records and cleans up their physical files.
 */
export async function clearAllRecentFiles(): Promise<void> {
  const db = await getDatabase();
  const records = await db.getAllAsync<{ file_uri: string }>(
    `SELECT file_uri FROM recent_files`
  );

  for (const record of records) {
    if (record?.file_uri) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(record.file_uri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(record.file_uri, { idempotent: true });
        }
      } catch (err) {
        console.warn(`[db/database] Failed to delete file at ${record.file_uri}:`, err);
      }
    }
  }

  await db.runAsync(`DELETE FROM recent_files`);
}
