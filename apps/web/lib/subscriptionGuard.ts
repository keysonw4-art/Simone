import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@repo/database";
import { auth } from "@repo/auth";

type SessionUser = {
  id: string;
  email: string | null;
  name: string | null;
  role: "STUDENT" | "SUPPORT" | "ADMIN" | "SUPER_ADMIN";
};

async function getOriginFromHeaders(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }
    const realIp = h.get("x-real-ip");
    if (realIp) return realIp;
  } catch {
    // headers() may throw outside server-component context
  }
  return "unknown";
}

async function logAccessDenied(params: {
  userId: string | null;
  reason: string;
  resource: string;
}): Promise<void> {
  try {
    const origin = await getOriginFromHeaders();
    await prisma.systemLog.create({
      data: {
        userId: params.userId,
        event: "access_denied",
        origin,
        description: JSON.stringify({
          reason: params.reason,
          resource: params.resource,
        }),
      },
    });
  } catch (error) {
    console.error("[subscriptionGuard] failed to write SystemLog:", error);
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    role: session.user.role,
  };
}

export async function requireActiveSubscription(): Promise<SessionUser> {
  const user = await requireSession();

  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
    return user;
  }

  const active = await prisma.subscription.findFirst({
    where: {
      userId: user.id,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });

  if (!active) {
    await logAccessDenied({
      userId: user.id,
      reason: "no_active_subscription",
      resource: "subscriber_area",
    });
    redirect("/aluno");
  }

  return user;
}

export async function requireLessonAccess(lessonId: string): Promise<{
  user: SessionUser;
  lesson: { id: string; isProtected: boolean };
}> {
  const user = await requireSession();

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, deletedAt: null },
    select: { id: true, isProtected: true },
  });

  if (!lesson) {
    await logAccessDenied({
      userId: user.id,
      reason: "lesson_not_found",
      resource: `lesson:${lessonId}`,
    });
    redirect("/aluno");
  }

  if (!lesson.isProtected) {
    return { user, lesson };
  }

  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
    return { user, lesson };
  }

  const active = await prisma.subscription.findFirst({
    where: {
      userId: user.id,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });

  if (!active) {
    await logAccessDenied({
      userId: user.id,
      reason: "no_active_subscription",
      resource: `protected_lesson:${lessonId}`,
    });
    redirect("/aluno");
  }

  return { user, lesson };
}
