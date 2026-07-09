import { NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { auth } from "@repo/auth";
import { BUCKETS, getSignedUrl } from "@repo/storage";
import {
  canAccessTier,
  getHighestActivePlanTier,
} from "@/lib/planTiers";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ materialId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { materialId } = await ctx.params;

  const material = await prisma.material.findFirst({
    where: { id: materialId, deletedAt: null },
    select: {
      id: true,
      path: true,
      filename: true,
      requiredPlan: true,
      courseId: true,
    },
  });
  if (!material || !material.path) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const role = session.user.role;
  const isStaff = role === "ADMIN" || role === "SUPER_ADMIN";

  if (!isStaff) {
    const userTier = await getHighestActivePlanTier(session.user.id);
    if (!canAccessTier(userTier, material.requiredPlan)) {
      await prisma.systemLog
        .create({
          data: {
            userId: session.user.id,
            event: "access_denied",
            origin: "material_download",
            description: JSON.stringify({
              materialId: material.id,
              userTier,
              requiredPlan: material.requiredPlan,
            }),
          },
        })
        .catch(() => {});
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  let url: string;
  try {
    url = await getSignedUrl(
      BUCKETS.ArquivosAlunos,
      material.path,
      60,
      material.filename,
    );
  } catch (error) {
    console.error("[download] signed URL failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.redirect(url, 302);
}
