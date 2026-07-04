import fs from "fs/promises";

/**
 * Crée récursivement un dossier s'il n'existe pas.
 */
export async function ensureMediaDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}
