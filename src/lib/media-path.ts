import path from "path";

/**
 * Résout le chemin racine de stockage des médias.
 * Défaut dev : ./public/ibc-media, prod : /var/www/ibc-media.
 */
export function getMediaStoragePath(): string {
  const envPath = process.env.MEDIA_STORAGE_PATH;
  if (envPath) return path.resolve(envPath);
  return process.env.NODE_ENV === "production"
    ? "/var/www/ibc-media"
    : path.resolve("./public/ibc-media");
}

/**
 * Résout le dossier de stockage d'une couverture d'événement.
 */
export function getEventCoverDir(eventId: string): string {
  return path.join(getMediaStoragePath(), "events", eventId);
}

/**
 * Construit le chemin disque absolu d'une couverture d'événement.
 */
export function getEventCoverFilePath(eventId: string, extension: string): string {
  const ext = extension.startsWith(".") ? extension : `.${extension}`;
  return path.join(getEventCoverDir(eventId), `cover${ext}`);
}

/**
 * Chemin relatif au volume de stockage, persisté en base dans coverImagePath.
 * Exemple : /events/{eventId}/cover.{ext}
 */
export function getEventCoverRelativePath(eventId: string, extension: string): string {
  const ext = extension.startsWith(".") ? extension : `.${extension}`;
  return `/events/${eventId}/cover${ext}`;
}
