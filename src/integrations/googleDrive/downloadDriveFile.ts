import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createDriveClient } from "./driveClient.js";

function sanitizeFileName(fileName: string): string {
  const sanitized = fileName
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  if (!sanitized) {
    return "file.pdf";
  }

  return sanitized;
}

export async function downloadDriveFile(
  fileId: string,
  fileName: string,
  destinationDir: string,
): Promise<string> {
  const drive = createDriveClient();
  const safeName = `${fileId}-${sanitizeFileName(fileName)}`;
  const destinationPath = path.join(destinationDir, safeName);

  await fs.promises.mkdir(destinationDir, { recursive: true });

  const response = await drive.files.get(
    {
      fileId,
      alt: "media",
      supportsAllDrives: true,
    },
    {
      responseType: "stream",
    },
  );

  await pipeline(
    response.data as NodeJS.ReadableStream,
    fs.createWriteStream(destinationPath),
  );

  return destinationPath;
}
