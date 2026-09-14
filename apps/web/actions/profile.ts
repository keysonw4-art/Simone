"use server";

import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@repo/database";
import { auth, signOut } from "@repo/auth";
import { consumeRateLimit } from '@repo/auth/security';
import {
  BUCKETS,
  StorageUploadError,
  StorageValidationError,
  deleteObject,
  getSignedUrl,
  uploadImage,
} from "@repo/storage";

export type DeleteAccountState =
  | { error: string }
  | undefined;

const CONFIRMATION_WORD = "EXCLUIR";

export async function deleteAccountAction(
  _prev: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const rawConfirmation = formData.get("confirmation");
  const confirmation = typeof rawConfirmation === "string" ? rawConfirmation.trim() : "";
  if (confirmation !== CONFIRMATION_WORD) {
    return { error: `Digite "${CONFIRMATION_WORD}" para confirmar.` };
  }

  const userId = session.user.id;
  if (!await consumeRateLimit("delete-account", userId, 5, 900)) return { error: "Aguarde antes de tentar novamente." };
  const password = formData.get("password");
  const current = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true, sessionVersion: true } });
  if (typeof password !== "string" || Buffer.byteLength(password) > 72 || !current?.passwordHash || !await bcrypt.compare(password, current.passwordHash)) return { error: "Senha atual incorreta." };

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({
        where: { id: userId, deletedAt: null, sessionVersion: current.sessionVersion },
        select: { id: true, role: true, publicId: true },
      });
      if (!user) return;

      // Bloqueia auto-deleção do super admin pra não derrubar a operação
      if (user.role === "SUPER_ADMIN") {
        throw new Error("Conta super admin não pode ser excluída pelo painel do aluno.");
      }

      const anonEmail = `deleted-${randomUUID()}@example.invalid`;

      await tx.user.update({
        where: { id: userId },
        data: {
          email: anonEmail,
          name: "[Conta excluída]",
          passwordHash: null,
          deletedAt: new Date(),
          sessionVersion: { increment: 1 },
        },
      });

      // Acesso já cai com deletedAt (choke point isUserActive nos entitlements).

      await tx.systemLog.create({
        data: {
          userId,
          event: "account_deleted",
          origin: "self_service",
          description: JSON.stringify({
            publicId: user.publicId,
            anonymizedEmail: anonEmail,
          }),
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "user.account_deleted",
          details: JSON.stringify({
            publicId: user.publicId,
            selfRequested: true,
          }),
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("super admin")) {
      return { error: error.message };
    }
    console.error("[profile] account delete failed:", error);
    return { error: "Não foi possível excluir a conta. Tente novamente." };
  }

  await signOut({ redirectTo: "/" });
}

export type AvatarUploadState =
  | { ok: true; url: string }
  | { ok: false; error: string }
  | undefined;

export async function uploadAvatarAction(
  _prev: AvatarUploadState,
  formData: FormData,
): Promise<AvatarUploadState> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!await consumeRateLimit('avatar', session.user.id, 5, 600)) return { ok: false, error: 'Aguarde antes de alterar a foto novamente.' };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione uma imagem." };
  }

  const userId = session.user.id;
  const path = `users/${userId}.webp`;

  try {
    await uploadImage({ bucket: BUCKETS.FotosPerfil, path, file });
  } catch (error) {
    if (
      error instanceof StorageValidationError ||
      error instanceof StorageUploadError
    ) {
      return { ok: false, error: error.message };
    }
    console.error("[avatar] upload failed:", error);
    return { ok: false, error: "Falha inesperada ao processar a imagem." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { avatarPath: path },
  });

  let signedUrl: string;
  try {
    signedUrl = await getSignedUrl(BUCKETS.FotosPerfil, path, 3600);
  } catch (error) {
    console.error("[avatar] signed URL after upload failed:", error);
    return { ok: false, error: "Upload feito, mas falha ao gerar preview." };
  }

  revalidatePath("/aluno/perfil");
  return { ok: true, url: signedUrl };
}

export type AvatarRemoveResult = { ok: true } | { ok: false; error: string };

export async function removeAvatarAction(): Promise<AvatarRemoveResult> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!await consumeRateLimit('avatar', session.user.id, 5, 600)) return { ok: false, error: 'Aguarde antes de alterar a foto novamente.' };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarPath: true },
  });
  if (!user?.avatarPath) return { ok: true };

  try {
    await deleteObject(BUCKETS.FotosPerfil, user.avatarPath);
  } catch (error) {
    console.error("[avatar] storage delete failed (orphan warning):", error);
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarPath: null },
  });

  revalidatePath("/aluno/perfil");
  return { ok: true };
}
