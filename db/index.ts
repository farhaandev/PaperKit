import * as SQLite from "expo-sqlite";

export const DATABASE_NAME = "paperkit.db";

/**
 * Open or retrieve the primary PaperKit relational SQLite database instance.
 */
export function openPaperKitDatabase(): SQLite.SQLiteDatabase {
  return SQLite.openDatabaseSync(DATABASE_NAME);
}

export * from "./schema";

