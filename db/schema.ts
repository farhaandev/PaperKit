import { SQLiteDatabase } from "expo-sqlite";

/**
 * Initialize application tables and migrations.
 */
export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);
}

