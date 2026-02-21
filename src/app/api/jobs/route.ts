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

  const jobs = await db.job.findMany({
    where: {
      businessId,
      ...(status ? { status } : {}),
    },
    include: { customer: true, items: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(jobs);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { businessId, title, customerId, status, priority, startDate, endDate, location, notes, items } = body;

  const business = await db.business.findFirst({ where: { id: businessId, userId: session.user.id } });
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const count = await db.job.count({ where: { businessId } });
  const jobNumber = `JOB-${String(count + 1).padStart(4, "0")}`;

  const job = await db.job.create({
    data: {
      businessId,
      title,
      jobNumber,
      customerId,
      status: status ?? "scheduled",
      priority: priority ?? "normal",
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      location,
      notes,
      items: items
        ? {
            create: items.map((item: { description: string; quantity: number; unitCost: number; type: string }) => ({
              description: item.description,
              quantity: item.quantity,
              unitCost: item.unitCost,
              total: item.quantity * item.unitCost,
              type: item.type ?? "material",
            })),
          }
        : undefined,
    },
    include: { customer: true, items: true },
  });

  return NextResponse.json(job, { status: 201 });
}
