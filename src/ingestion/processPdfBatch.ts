import fs from "node:fs/promises";
import { parseFormulaPdf } from "../parser/parseFormulaPdf.js";
import { persistFormula } from "../io/persistFormula.js";
import type { Pool } from "mysql2/promise";
import type {
  IngestedPdfFile,
  ProcessPdfBatchSummary,
  ProcessPdfFailure,
  ProcessPdfSuccess,
} from "./types.js";

async function cleanupFile(file: IngestedPdfFile): Promise<void> {
  if (file.source !== "google-drive") {
    return;
  }

  try {
    await fs.unlink(file.localPath);
  } catch {
    // no-op
  }
}

export async function processPdfBatch(
  pool: Pool,
  files: IngestedPdfFile[],
): Promise<ProcessPdfBatchSummary> {
  const succeeded: ProcessPdfSuccess[] = [];
  const failed: ProcessPdfFailure[] = [];

  for (const file of files) {
    try {
      const result = await parseFormulaPdf(file.localPath);
      await persistFormula(pool, result);
      succeeded.push({ file });
      await cleanupFile(file);
    } catch (error) {
      failed.push({
        file,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { succeeded, failed };
}
