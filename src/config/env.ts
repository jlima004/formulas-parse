import "dotenv/config";

export interface MysqlConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface GoogleDriveConfig {
  credentialsPath: string;
  folderId: string;
  pollIntervalSeconds: number;
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria nao definida: ${name}`);
  }

  return value;
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function parsePositiveInteger(value: string, envName: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${envName} deve ser um numero inteiro positivo.`);
  }

  return parsed;
}

export function getMysqlConfig(): MysqlConfig {
  return {
    host: readOptionalEnv("MYSQL_HOST") ?? "127.0.0.1",
    port: parsePositiveInteger(readRequiredEnv("MYSQL_PORT"), "MYSQL_PORT"),
    database: readRequiredEnv("MYSQL_DATABASE"),
    user: readRequiredEnv("MYSQL_USER"),
    password: readRequiredEnv("MYSQL_PASSWORD"),
  };
}

export function getGoogleDriveConfig(): GoogleDriveConfig {
  const pollIntervalRaw = readOptionalEnv("POLL_INTERVAL_SECONDS") ?? "300";

  return {
    credentialsPath: readRequiredEnv("GOOGLE_APPLICATION_CREDENTIALS"),
    folderId: readRequiredEnv("GOOGLE_DRIVE_FOLDER_ID"),
    pollIntervalSeconds: parsePositiveInteger(
      pollIntervalRaw,
      "POLL_INTERVAL_SECONDS",
    ),
  };
}

export function getPdfStagingDir(): string {
  return readOptionalEnv("PDF_STAGING_DIR") ?? "staging/pdfs";
}
