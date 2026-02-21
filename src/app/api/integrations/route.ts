import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });
  const business = await db.business.findFirst({ where: { id: businessId, userId: session.user.id } });
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const integrations = await db.businessIntegration.findMany({ where: { businessId } });
  return NextResponse.json(integrations);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { businessId, type, config } = await request.json();
  if (!businessId || !type) return NextResponse.json({ error: "businessId and type required" }, { status: 400 });
  const business = await db.business.findFirst({ where: { id: businessId, userId: session.user.id } });
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const integration = await db.businessIntegration.upsert({
    where: { businessId_type: { businessId, type } },
    create: { businessId, type, status: "connected", config: config ? JSON.stringify(config) : null },
    update: { status: "connected", config: config ? JSON.stringify(config) : null },
  });
  return NextResponse.json(integration);
}
