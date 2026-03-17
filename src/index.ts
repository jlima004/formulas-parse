import { getGoogleDriveConfig } from "./config/env.js";
import { startDrivePolling } from "./ingestion/pollDriveFolder.js";

async function main(): Promise<void> {
  const config = getGoogleDriveConfig();
  console.log(
    `[drive] Polling iniciado (intervalo=${config.pollIntervalSeconds}s).`,
  );
  await startDrivePolling();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
