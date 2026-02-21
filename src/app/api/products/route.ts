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
  const products = await db.product.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { businessId, name, sku, description, type, unitCost, unitPrice, unit, stockLevel, minStock, category, supplier } = body;
  const business = await db.business.findFirst({ where: { id: businessId, userId: session.user.id } });
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const product = await db.product.create({
    data: {
      businessId, name, sku, description,
      type: type ?? "product",
      unitCost: unitCost ?? 0,
      unitPrice: unitPrice ?? 0,
      unit: unit ?? "each",
      stockLevel: stockLevel ?? 0,
      minStock: minStock ?? 0,
      category, supplier,
    },
  });
  return NextResponse.json(product, { status: 201 });
}
