import fs from "node:fs/promises";
import path from "node:path";
import { paths } from "../config/paths.js";
import { closeDbPool, getDbPool } from "../io/dbConnection.js";
import { ensureDatabaseSchema } from "../io/ensureDatabaseSchema.js";
import { processPdfBatch } from "../ingestion/processPdfBatch.js";
import type { IngestedPdfFile } from "../ingestion/types.js";

const EXCLUDED_PDF_FILE_NAMES = new Set(["pdf-escaneado.pdf"]);

export interface BatchSummary {
  succeeded: string[];
  failed: Array<{ fileName: string; error: string }>;
}

async function listWorkspacePdfFiles(): Promise<IngestedPdfFile[]> {
  const entries = await fs.readdir(paths.workspaceRoot, {
    withFileTypes: true,
  });

  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.toLowerCase().endsWith(".pdf") &&
        !EXCLUDED_PDF_FILE_NAMES.has(entry.name.toLowerCase()),
    )
    .map((entry) => ({
      source: "local" as const,
      fileName: entry.name,
      localPath: path.join(paths.workspaceRoot, entry.name),
    }))
    .sort((left, right) => left.fileName.localeCompare(right.fileName));
}

export async function processAllPdfs(): Promise<BatchSummary> {
  const dbPool = getDbPool();

  try {
    await ensureDatabaseSchema(dbPool);
    const files = await listWorkspacePdfFiles();
    const summary = await processPdfBatch(dbPool, files);

    return {
      succeeded: summary.succeeded.map((entry) => entry.file.fileName),
      failed: summary.failed.map((entry) => ({
        fileName: entry.file.fileName,
        error: entry.error,
      })),
    };
  } finally {
    await closeDbPool();
  }
}
