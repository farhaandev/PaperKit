/**
 * PaperKit Core Domain Types & Interfaces
 */

export type ToolType = 'images-to-pdf' | 'merge-pdf' | 'compress' | 'e-sign';

export interface RecentFile {
  id: number;
  title: string;
  file_uri: string;
  mime_type: string;
  size_bytes: number;
  tool_type: ToolType;
  created_at: number;
}

export interface AppSettings {
  savedSignatureUri: string | null;
  defaultCompressionKb: number;
  exportCounter: number;
}
