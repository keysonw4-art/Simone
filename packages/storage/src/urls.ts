import { serverClient } from "./client";
import { BUCKETS, isPublicBucket, type BucketName } from "./buckets";

export function getPublicUrl(bucket: BucketName, path: string): string {
  const supabase = serverClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function getSignedUrl(
  bucket: BucketName,
  path: string,
  expiresInSeconds = 3600,
  downloadFilename?: string,
): Promise<string> {
  const supabase = serverClient();
  const options = downloadFilename
    ? { download: downloadFilename }
    : undefined;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds, options);

  if (error || !data?.signedUrl) {
    throw new Error(
      `Falha ao gerar signed URL para ${bucket}/${path}: ${error?.message ?? "unknown"}`,
    );
  }
  return data.signedUrl;
}

/**
 * Resolve um valor armazenado em campo "thumbnail" / "avatar" / etc.
 * - Se for null/empty → null
 * - Se já for uma URL absoluta (legacy) → retorna como está
 * - Senão trata como path no bucket dado e gera URL
 *   (sync pra public, async wrapper externo pra private)
 */
export function resolveImageUrl(
  value: string | null | undefined,
  bucket: BucketName = BUCKETS.ImagensPublicas,
): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (!isPublicBucket(bucket)) {
    throw new Error(
      `resolveImageUrl: bucket ${bucket} é privado — use getSignedUrl explicitamente`,
    );
  }
  return getPublicUrl(bucket, value);
}
