import { BUCKETS, getSignedUrl } from "@repo/storage";

/**
 * Gera signed URL pra avatar armazenado no bucket privado.
 * TTL default = 1h. Retorna null se path vazio ou erro (não quebra a page).
 */
export async function getAvatarSignedUrl(
  avatarPath: string | null | undefined,
  ttlSeconds = 3600,
): Promise<string | null> {
  if (!avatarPath) return null;
  try {
    return await getSignedUrl(BUCKETS.FotosPerfil, avatarPath, ttlSeconds);
  } catch (error) {
    console.error("[avatar] signed URL failed:", error);
    return null;
  }
}
