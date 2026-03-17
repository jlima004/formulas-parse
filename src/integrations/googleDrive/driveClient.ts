import { google, type drive_v3 } from "googleapis";
import { getGoogleDriveConfig } from "../../config/env.js";

const DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

let driveClient: drive_v3.Drive | null = null;

export function createDriveClient(): drive_v3.Drive {
  if (driveClient) {
    return driveClient;
  }

  const config = getGoogleDriveConfig();
  const auth = new google.auth.GoogleAuth({
    keyFile: config.credentialsPath,
    scopes: [DRIVE_READONLY_SCOPE],
  });

  driveClient = google.drive({
    version: "v3",
    auth,
  });

  return driveClient;
}
