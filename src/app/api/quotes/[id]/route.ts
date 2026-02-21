import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const quote = await db.quote.findFirst({
    where: { id },
    include: { business: { select: { userId: true, taxRate: true } } },
  });
  if (!quote || quote.business.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { validUntil, items, ...rest } = body;

  // Recalculate totals if items provided
  let totalsUpdate = {};
  if (items !== undefined) {
    const subtotal = items.reduce(
      (sum: number, i: { quantity: number; unitPrice: number }) =>
        sum + (i.quantity || 1) * (i.unitPrice || 0),
      0
    );
    const taxRate = quote.business.taxRate ?? 0;
    const tax = subtotal * (taxRate / 100);
    totalsUpdate = { subtotal, tax, total: subtotal + tax };

    // Replace items
    await db.quoteItem.deleteMany({ where: { quoteId: id } });
    await db.quoteItem.createMany({
      data: items
        .filter((i: { description: string }) => i.description)
        .map((i: { description: string; quantity: number; unitPrice: number; type?: string }) => ({
          quoteId: id,
          description: i.description,
          quantity: i.quantity || 1,
          unitPrice: i.unitPrice || 0,
          total: (i.quantity || 1) * (i.unitPrice || 0),
          type: i.type || "service",
        })),
    });
  }

  const updated = await db.quote.update({
    where: { id },
    data: {
      ...rest,
      ...(validUntil !== undefined ? { validUntil: validUntil ? new Date(validUntil) : null } : {}),
      ...totalsUpdate,
    },
    include: { customer: true, items: true, lead: { select: { id: true, title: true } } },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const quote = await db.quote.findFirst({
    where: { id },
    include: { business: { select: { userId: true } } },
  });
  if (!quote || quote.business.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await db.quote.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
