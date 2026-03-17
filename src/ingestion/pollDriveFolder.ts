import path from "node:path";
import { getGoogleDriveConfig } from "../config/env.js";
import { paths } from "../config/paths.js";
import { downloadDriveFile } from "../integrations/googleDrive/downloadDriveFile.js";
import { listDrivePdfFiles } from "../integrations/googleDrive/listDrivePdfFiles.js";
import type { DrivePdfFile } from "../integrations/googleDrive/types.js";
import { closeDbPool, getDbPool } from "../io/dbConnection.js";
import { ensureDatabaseSchema } from "../io/ensureDatabaseSchema.js";
import {
  filterDriveFilesToProcess,
  markDriveFileAsFailure,
  markDriveFileAsSuccess,
} from "../io/processedDriveFilesRepository.js";
import { processPdfBatch } from "./processPdfBatch.js";
import type { IngestedPdfFile } from "./types.js";

interface DriveCycleSummary {
  discovered: number;
  queued: number;
  succeeded: number;
  failed: number;
  skipped: number;
}

let isRunning = false;

function mapByFileId(files: DrivePdfFile[]): Map<string, DrivePdfFile> {
  return new Map(files.map((file) => [file.id, file]));
}

async function downloadQueuedFiles(
  files: DrivePdfFile[],
): Promise<{
  downloadedFiles: IngestedPdfFile[];
  failedDownloads: Array<{ file: DrivePdfFile; error: string }>;
}> {
  const downloadedFiles: IngestedPdfFile[] = [];
  const failedDownloads: Array<{ file: DrivePdfFile; error: string }> = [];

  for (const file of files) {
    try {
      const localPath = await downloadDriveFile(
        file.id,
        file.name,
        paths.pdfStagingDir,
      );

      downloadedFiles.push({
        source: "google-drive",
        sourceFileId: file.id,
        sourceModifiedTime: file.modifiedTime,
        fileName: path.basename(localPath),
        localPath,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[drive] Falha no download de ${file.name} (${file.id}): ${message}`,
      );
      failedDownloads.push({ file, error: message });
    }
  }

  return { downloadedFiles, failedDownloads };
}

export async function processDriveFolderOnce(): Promise<DriveCycleSummary> {
  const dbPool = getDbPool();

  try {
    await ensureDatabaseSchema(dbPool);

    const discoveredFiles = await listDrivePdfFiles();
    const queuedFiles = await filterDriveFilesToProcess(dbPool, discoveredFiles);
    const discoveredMap = mapByFileId(discoveredFiles);

    const { downloadedFiles, failedDownloads } =
      await downloadQueuedFiles(queuedFiles);
    const processingSummary = await processPdfBatch(dbPool, downloadedFiles);

    for (const success of processingSummary.succeeded) {
      const sourceFileId = success.file.sourceFileId;
      if (!sourceFileId) {
        continue;
      }

      const driveFile = discoveredMap.get(sourceFileId);
      if (!driveFile) {
        continue;
      }

      await markDriveFileAsSuccess(dbPool, driveFile);
    }

    for (const failure of processingSummary.failed) {
      const sourceFileId = failure.file.sourceFileId;
      if (!sourceFileId) {
        continue;
      }

      const driveFile = discoveredMap.get(sourceFileId);
      if (!driveFile) {
        continue;
      }

      await markDriveFileAsFailure(dbPool, driveFile, failure.error);
    }

    for (const failedDownload of failedDownloads) {
      await markDriveFileAsFailure(
        dbPool,
        failedDownload.file,
        failedDownload.error,
      );
    }

    return {
      discovered: discoveredFiles.length,
      queued: queuedFiles.length,
      succeeded: processingSummary.succeeded.length,
      failed: processingSummary.failed.length + failedDownloads.length,
      skipped: discoveredFiles.length - queuedFiles.length,
    };
  } finally {
    await closeDbPool();
  }
}

export async function startDrivePolling(): Promise<void> {
  const config = getGoogleDriveConfig();

  const runCycle = async (): Promise<void> => {
    if (isRunning) {
      console.log("[drive] Ciclo anterior ainda em execucao; pulando.");
      return;
    }

    isRunning = true;
    const startedAt = Date.now();

    try {
      const summary = await processDriveFolderOnce();
      const elapsedMs = Date.now() - startedAt;

      console.log(
        `[drive] Ciclo concluido em ${elapsedMs}ms | encontrados=${summary.discovered} enfileirados=${summary.queued} sucesso=${summary.succeeded} falhas=${summary.failed} pulados=${summary.skipped}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[drive] Ciclo com erro: ${message}`);
    } finally {
      isRunning = false;
    }
  };

  await runCycle();
  setInterval(runCycle, config.pollIntervalSeconds * 1000);
}
