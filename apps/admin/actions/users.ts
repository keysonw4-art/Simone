"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@repo/database";
import type { Role } from "@repo/database";
import { requireAdmin, UnauthorizedError } from "../lib/requireAdmin";
import { logAuditEvent } from "../lib/audit";

const ASSIGNABLE_ROLES: Role[] = ["STUDENT", "SUPPORT", "ADMIN"];

export type UserActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireAdminOrRedirect() {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login");
    throw error;
  }
}

export async function updateUserRoleAction(
  targetUserId: string,
  newRole: Role,
): Promise<UserActionResult> {
  const admin = await requireAdminOrRedirect();

  if (!ASSIGNABLE_ROLES.includes(newRole)) {
    return { ok: false, error: "Perfil inválido." };
  }

  const target = await prisma.user.findFirst({
    where: { id: targetUserId, deletedAt: null },
    select: { id: true, role: true, publicId: true, email: true },
  });
  if (!target) return { ok: false, error: "Usuário não encontrado." };

  if (target.role === "SUPER_ADMIN") {
    return { ok: false, error: "SUPER_ADMIN não pode ser rebaixado pelo painel." };
  }
  if (target.id === admin.id) {
    return { ok: false, error: "Você não pode alterar o próprio perfil." };
  }
  if (newRole === "ADMIN" && admin.role !== "SUPER_ADMIN") {
    return { ok: false, error: "Apenas SUPER_ADMIN pode conceder perfil ADMIN." };
  }
  if (target.role === newRole) return { ok: true };

  await prisma.user.update({
    where: { id: targetUserId },
    data: { role: newRole },
  });

  await logAuditEvent({
    userId: admin.id,
    action: "user.role_change",
    details: {
      targetUserId,
      targetPublicId: target.publicId,
      from: target.role,
      to: newRole,
    },
  });

  revalidatePath("/alunos");
  revalidatePath(`/alunos/${targetUserId}`);
  return { ok: true };
}

export async function toggleUserBlockAction(
  targetUserId: string,
): Promise<UserActionResult> {
  const admin = await requireAdminOrRedirect();

  const target = await prisma.user.findFirst({
    where: { id: targetUserId, deletedAt: null },
    select: {
      id: true,
      role: true,
      publicId: true,
      email: true,
      blockedAt: true,
    },
  });
  if (!target) return { ok: false, error: "Usuário não encontrado." };

  if (target.id === admin.id) {
    return { ok: false, error: "Você não pode bloquear sua própria conta." };
  }
  if (target.role === "SUPER_ADMIN") {
    return { ok: false, error: "SUPER_ADMIN não pode ser bloqueado pelo painel." };
  }

  const wasBlocked = !!target.blockedAt;
  const nextBlockedAt = wasBlocked ? null : new Date();

  // O acesso é cortado imediatamente pelo choke point isUserActive (entitlements),
  // então basta marcar/desmarcar blockedAt.
  await prisma.user.update({
    where: { id: targetUserId },
    data: { blockedAt: nextBlockedAt },
  });

  await logAuditEvent({
    userId: admin.id,
    action: wasBlocked ? "user.unblock" : "user.block",
    details: { targetUserId, targetPublicId: target.publicId },
  });

  revalidatePath("/alunos");
  revalidatePath(`/alunos/${targetUserId}`);
  return { ok: true };
}
