import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPdfStagingDir } from "./env.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const workspaceRoot = path.resolve(currentDir, "..", "..");
const pdfStagingDir = path.resolve(workspaceRoot, getPdfStagingDir());

export const paths = {
  workspaceRoot,
  pdfStagingDir,
};

export function resolveWorkspacePath(...segments: string[]): string {
  return path.join(paths.workspaceRoot, ...segments);
}
