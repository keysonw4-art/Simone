import { auth } from "@repo/auth";

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
  const user = session?.user;

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
