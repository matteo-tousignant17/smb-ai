import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businesses = await db.business.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(businesses);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const { name, type, industry, description, address, city, state, zip, phone, email, website, currency, taxRate } = body;
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  const business = await db.business.create({
    data: {
      name,
      type: type ?? "both",
      industry,
      description,
      address,
      city,
      state,
      zip,
      phone,
      email,
      website,
      currency: currency ?? "USD",
      taxRate: taxRate ?? 0,
      userId: session.user.id,
    },
  });
  return NextResponse.json(business, { status: 201 });
}
