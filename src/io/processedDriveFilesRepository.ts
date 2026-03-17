import type { Pool, RowDataPacket } from "mysql2/promise";
import type { DrivePdfFile } from "../integrations/googleDrive/types.js";

interface ProcessedDriveFileRow extends RowDataPacket {
  drive_file_id: string;
  modified_time: string;
  status: string;
}

function normalizeErrorMessage(message: string): string {
  return message.length > 4000 ? message.slice(0, 4000) : message;
}

export async function filterDriveFilesToProcess(
  pool: Pool,
  files: DrivePdfFile[],
): Promise<DrivePdfFile[]> {
  if (files.length === 0) {
    return [];
  }

  const placeholders = files.map(() => "?").join(", ");
  const [rows] = await pool.query<ProcessedDriveFileRow[]>(
    `
      SELECT drive_file_id, modified_time, status
      FROM processed_drive_files
      WHERE drive_file_id IN (${placeholders})
    `,
    files.map((file) => file.id),
  );

  const byId = new Map(rows.map((row) => [row.drive_file_id, row]));

  return files.filter((file) => {
    const record = byId.get(file.id);
    if (!record) {
      return true;
    }

    return !(
      record.status === "success" &&
      record.modified_time === file.modifiedTime
    );
  });
}

export async function markDriveFileAsSuccess(
  pool: Pool,
  file: DrivePdfFile,
): Promise<void> {
  await pool.execute(
    `
      INSERT INTO processed_drive_files (
        drive_file_id,
        file_name,
        modified_time,
        status,
        last_processed_at,
        error_message
      ) VALUES (?, ?, ?, 'success', CURRENT_TIMESTAMP, NULL)
      ON DUPLICATE KEY UPDATE
        file_name = VALUES(file_name),
        modified_time = VALUES(modified_time),
        status = 'success',
        last_processed_at = CURRENT_TIMESTAMP,
        error_message = NULL
    `,
    [file.id, file.name, file.modifiedTime],
  );
}

export async function markDriveFileAsFailure(
  pool: Pool,
  file: DrivePdfFile,
  errorMessage: string,
): Promise<void> {
  await pool.execute(
    `
      INSERT INTO processed_drive_files (
        drive_file_id,
        file_name,
        modified_time,
        status,
        last_processed_at,
        error_message
      ) VALUES (?, ?, ?, 'failed', CURRENT_TIMESTAMP, ?)
      ON DUPLICATE KEY UPDATE
        file_name = VALUES(file_name),
        modified_time = VALUES(modified_time),
        status = 'failed',
        last_processed_at = CURRENT_TIMESTAMP,
        error_message = VALUES(error_message)
    `,
    [file.id, file.name, file.modifiedTime, normalizeErrorMessage(errorMessage)],
  );
}
