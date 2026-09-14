import sharp from "sharp";
import { serverClient } from "./client";
import type { BucketName } from "./buckets";
import { StorageUploadError, StorageValidationError } from "./errors";

const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // Leaves headroom below Vercel request limits.

type UploadImageInput = {
  bucket: BucketName;
  path: string; // ex: "courses/<uuid>.webp"
  file: File | Blob;
  webpQuality?: number;
};

type UploadImageResult = {
  path: string;
  bucket: BucketName;
};

export async function uploadImage(
  input: UploadImageInput,
): Promise<UploadImageResult> {
  const { bucket, path, file, webpQuality = 85 } = input;

  if (!ALLOWED_IMAGE_MIMES.includes(file.type as never)) {
    throw new StorageValidationError(
      `Tipo de imagem não suportado: ${file.type || "desconhecido"}`,
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new StorageValidationError(
      `Imagem maior que ${MAX_IMAGE_BYTES / 1024 / 1024}MB`,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let webpBuffer: Buffer;
  try {
    webpBuffer = await sharp(buffer, { limitInputPixels: 16_000_000, sequentialRead: true, animated: false })
      .rotate() // honra EXIF orientation
      .resize({ width: bucket === "fotos-perfil" ? 1024 : 2560, height: bucket === "fotos-perfil" ? 1024 : 2560, fit: "inside", withoutEnlargement: true })
      .webp({ quality: webpQuality })
      .toBuffer();
  } catch (error) {
    throw new StorageUploadError("Falha ao converter imagem para WebP", error);
  }

  const supabase = serverClient();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, webpBuffer, {
      contentType: "image/webp",
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    throw new StorageUploadError(
      `Falha ao subir para ${bucket}/${path}: ${error.message}`,
      error,
    );
  }

  return { path, bucket };
}

const MAX_FILE_BYTES = 3 * 1024 * 1024; // Server Action transport limit.

type UploadFileInput = {
  bucket: BucketName;
  path: string;
  file: File | Blob;
  maxBytes?: number;
  allowedMimes?: string[];
};

export async function uploadFile(
  input: UploadFileInput,
): Promise<{ path: string; bucket: BucketName; sizeBytes: number; mimeType: string }> {
  const {
    bucket,
    path,
    file,
    maxBytes = MAX_FILE_BYTES,
    allowedMimes,
  } = input;

  const mimeType = file.type || "application/octet-stream";

  if (allowedMimes && !allowedMimes.includes(mimeType)) {
    throw new StorageValidationError(`Tipo não suportado: ${mimeType}`);
  }
  if (file.size > Math.min(maxBytes, MAX_FILE_BYTES)) {
    throw new StorageValidationError(
      `Arquivo maior que ${Math.round(Math.min(maxBytes, MAX_FILE_BYTES) / 1024 / 1024)}MB`,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const supabase = serverClient();
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: mimeType,
    cacheControl: "3600",
    upsert: true,
  });

  if (error) {
    throw new StorageUploadError(
      `Falha ao subir para ${bucket}/${path}: ${error.message}`,
      error,
    );
  }

  return { path, bucket, sizeBytes: file.size, mimeType };
}

export async function deleteObject(
  bucket: BucketName,
  path: string,
): Promise<void> {
  const supabase = serverClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    throw new StorageUploadError(
      `Falha ao remover ${bucket}/${path}: ${error.message}`,
      error,
    );
  }
}
