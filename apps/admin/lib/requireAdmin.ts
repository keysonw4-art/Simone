import { auth } from "@repo/auth";
import { prisma } from '@repo/database';
import { redirect } from 'next/navigation';

export async function requireAdminPage() {
  try { return await requireAdmin(); }
  catch (error) {
    if (error instanceof UnauthorizedError) redirect('/login');
    throw error;
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function requireAdmin(): Promise<{
  id: string;
  email: string | null;
  name: string | null;
  role: "ADMIN" | "SUPER_ADMIN";
}> {
  const session = await auth();
  const claim = session?.user;
  const user = claim && await prisma.user.findFirst({
    where: { id: claim.id, sessionVersion: claim.sessionVersion, blockedAt: null, deletedAt: null },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    throw new UnauthorizedError();
  }

  return {
    id: user.id,
    email: user.email ?? null,
    name: user.name ?? null,
    role: user.role,
  };
}
