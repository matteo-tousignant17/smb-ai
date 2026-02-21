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
  const customers = await db.customer.findMany({
    where: { businessId },
    include: {
      _count: { select: { jobs: true, invoices: true, leads: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(customers);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { businessId, name, company, email, phone, address, city, state, zip, type, notes } = body;
  const business = await db.business.findFirst({ where: { id: businessId, userId: session.user.id } });
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const customer = await db.customer.create({
    data: { businessId, name, company, email, phone, address, city, state, zip, type: type ?? "business", notes },
  });
  return NextResponse.json(customer, { status: 201 });
}
