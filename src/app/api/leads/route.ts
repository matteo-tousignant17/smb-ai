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
  const leads = await db.lead.findMany({
    where: { businessId },
    include: { customer: true, quotes: { include: { items: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(leads);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { businessId, title, customerId, value, source, probability, notes, followUpAt, stage } = body;
  const business = await db.business.findFirst({ where: { id: businessId, userId: session.user.id } });
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const lead = await db.lead.create({
    data: {
      businessId,
      title,
      customerId,
      value: value ? parseFloat(value) : null,
      source,
      probability: probability ?? 50,
      notes,
      stage: stage ?? "new",
      followUpAt: followUpAt ? new Date(followUpAt) : null,
    },
    include: { customer: true },
  });
  return NextResponse.json(lead, { status: 201 });
}
