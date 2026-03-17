import { getGoogleDriveConfig } from "../../config/env.js";
import { createDriveClient } from "./driveClient.js";
import type { DrivePdfFile } from "./types.js";

export async function listDrivePdfFiles(): Promise<DrivePdfFile[]> {
  const drive = createDriveClient();
  const config = getGoogleDriveConfig();

  const response = await drive.files.list({
    q: `'${config.folderId}' in parents and trashed = false and mimeType = 'application/pdf'`,
    fields: "files(id,name,mimeType,modifiedTime)",
    orderBy: "name",
    pageSize: 1000,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return (response.data.files ?? [])
    .filter(
      (file): file is Required<Pick<DrivePdfFile, "id" | "name" | "mimeType" | "modifiedTime">> =>
        Boolean(file.id && file.name && file.mimeType && file.modifiedTime),
    )
    .map((file) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      modifiedTime: file.modifiedTime,
    }));
}
