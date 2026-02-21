import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const status = searchParams.get("status");
  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });
  const business = await db.business.findFirst({ where: { id: businessId, userId: session.user.id } });
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Auto-mark overdue invoices
  await db.invoice.updateMany({
    where: {
      businessId,
      status: "sent",
      dueDate: { lt: new Date() },
    },
    data: { status: "overdue" },
  });

  const invoices = await db.invoice.findMany({
    where: { businessId, ...(status ? { status } : {}) },
    include: { customer: true, items: true, job: { select: { title: true, jobNumber: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invoices);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { businessId, customerId, jobId, dueDate, notes, taxRate, items } = body;
  const business = await db.business.findFirst({ where: { id: businessId, userId: session.user.id } });
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const count = await db.invoice.count({ where: { businessId } });
  const number = `INV-${String(count + 1).padStart(4, "0")}`;

  const lineItems = items ?? [];
  const subtotal = lineItems.reduce((s: number, i: { quantity: number; unitPrice: number }) => s + i.quantity * i.unitPrice, 0);
  const rate = taxRate ?? business.taxRate ?? 0;
  const tax = subtotal * (rate / 100);
  const total = subtotal + tax;

  const invoice = await db.invoice.create({
    data: {
      businessId,
      number,
      customerId,
      jobId,
      dueDate: dueDate ? new Date(dueDate) : null,
      notes,
      subtotal,
      taxRate: rate,
      tax,
      total,
      status: "draft",
      items: {
        create: lineItems.map((item: { description: string; quantity: number; unitPrice: number }) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
        })),
      },
    },
    include: { customer: true, items: true },
  });
  return NextResponse.json(invoice, { status: 201 });
}
