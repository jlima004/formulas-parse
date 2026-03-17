export type IngestionSource = "google-drive" | "local";

export interface IngestedPdfFile {
  source: IngestionSource;
  sourceFileId?: string;
  sourceModifiedTime?: string;
  fileName: string;
  localPath: string;
}

export interface ProcessPdfSuccess {
  file: IngestedPdfFile;
}

export interface ProcessPdfFailure {
  file: IngestedPdfFile;
  error: string;
}

export interface ProcessPdfBatchSummary {
  succeeded: ProcessPdfSuccess[];
  failed: ProcessPdfFailure[];
}
