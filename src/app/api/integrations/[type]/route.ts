import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { type } = await params;
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });

  const business = await db.business.findFirst({ where: { id: businessId, userId: session.user.id } });
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.businessIntegration.upsert({
    where: { businessId_type: { businessId, type } },
    create: { businessId, type, status: "disconnected", config: null },
    update: { status: "disconnected", config: null },
  });
  return NextResponse.json({ success: true });
}
