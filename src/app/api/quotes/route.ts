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
  const quotes = await db.quote.findMany({
    where: { businessId },
    include: { customer: true, items: true, lead: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(quotes);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { businessId, customerId, leadId, validUntil, notes, items = [] } = body;

  const business = await db.business.findFirst({ where: { id: businessId, userId: session.user.id } });
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Auto-generate quote number
  const count = await db.quote.count({ where: { businessId } });
  const number = `Q-${String(count + 1).padStart(4, "0")}`;

  const subtotal = items.reduce(
    (sum: number, i: { quantity: number; unitPrice: number }) =>
      sum + (i.quantity || 1) * (i.unitPrice || 0),
    0
  );
  const taxRate = business.taxRate ?? 0;
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const quote = await db.quote.create({
    data: {
      number,
      businessId,
      customerId: customerId || null,
      leadId: leadId || null,
      validUntil: validUntil ? new Date(validUntil) : null,
      notes: notes || null,
      subtotal,
      taxRate,
      tax,
      total,
      items: {
        create: items
          .filter((i: { description: string }) => i.description)
          .map((i: { description: string; quantity: number; unitPrice: number; type?: string }) => ({
            description: i.description,
            quantity: i.quantity || 1,
            unitPrice: i.unitPrice || 0,
            total: (i.quantity || 1) * (i.unitPrice || 0),
            type: i.type || "service",
          })),
      },
    },
    include: { customer: true, items: true, lead: { select: { id: true, title: true } } },
  });
  return NextResponse.json(quote, { status: 201 });
}
