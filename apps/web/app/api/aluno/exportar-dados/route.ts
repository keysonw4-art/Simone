import { NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { auth } from "@repo/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findFirst({
    where: { id: session.user.id, deletedAt: null },
    select: {
      id: true,
      publicId: true,
      email: true,
      name: true,
      role: true,
      acceptedTermsAt: true,
      createdAt: true,
      updatedAt: true,
      subscriptions: {
        select: {
          planType: true,
          isActive: true,
          expiresAt: true,
          createdAt: true,
        },
      },
      progress: {
        select: {
          lessonId: true,
          isCompleted: true,
          completedAt: true,
          lastWatchedAt: true,
        },
      },
      supportTickets: {
        where: { deletedAt: null },
        select: {
          publicId: true,
          subject: true,
          status: true,
          priority: true,
          createdAt: true,
          updatedAt: true,
          closedAt: true,
          messages: {
            where: { isInternal: false },
            select: {
              body: true,
              isInternal: true,
              createdAt: true,
              authorId: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    user,
  };

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "user.data_exported",
      details: JSON.stringify({ publicId: user.publicId, schemaVersion: 1 }),
    },
  });

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="meus-dados-${user.publicId}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
