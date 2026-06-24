// User file uploads (CV, pitch deck, …). Unlike avatars (small images stored
// as bytea in Postgres), these can be several MB, so the bytes live on a
// persistent server volume and only the metadata is kept in the DB. The volume
// must be mounted in Coolify and pointed to by UPLOAD_DIR, otherwise uploads
// are lost on every deploy.
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

/** Root directory for uploaded files. Relative paths in user_files.storage_path
 *  are resolved against this. Defaults to ./uploads for local dev. */
const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? "./uploads");

/** Per-file size cap (10 MB) — safe for a server volume and quick uploads. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** How many files a single user may keep. */
export const MAX_FILES_PER_USER = 5;

/** Accepted MIME types: documents (PDF/Word/PowerPoint) + images. */
export const ALLOWED_MIME = new Set<string>([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
]);

function abs(relPath: string): string {
  return join(UPLOAD_DIR, relPath);
}

/** Write bytes to the volume, creating the per-user subdirectory as needed. */
export async function saveFile(relPath: string, data: Buffer): Promise<void> {
  const full = abs(relPath);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, data);
}

/** Read a stored file's bytes; throws if it's missing on disk. */
export async function readFileBytes(relPath: string): Promise<Buffer> {
  return readFile(abs(relPath));
}

/** Delete a stored file; missing files are ignored (DB row is source of truth). */
export async function deleteFile(relPath: string): Promise<void> {
  await unlink(abs(relPath)).catch(() => {});
}
