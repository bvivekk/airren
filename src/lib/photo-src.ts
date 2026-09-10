export const STORAGE_SRC_PREFIX = "storage:";

export function storagePhotoSrc(bucket: string, path: string): string {
  return `${STORAGE_SRC_PREFIX}${bucket}/${path}`;
}

export function resolveStoragePhotoSrc(src: string): string {
  if (!src.startsWith(STORAGE_SRC_PREFIX)) {
    return src;
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be set");
  }
  const rest = src.slice(STORAGE_SRC_PREFIX.length);
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${rest}`;
}
