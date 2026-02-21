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
  const lead = await db.lead.findFirst({
    where: { id },
    include: { business: { select: { userId: true } } },
  });
  if (!lead || lead.business.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { value, followUpAt, closedAt, ...rest } = body;
  const updated = await db.lead.update({
    where: { id },
    data: {
      ...rest,
      ...(value !== undefined ? { value: parseFloat(value) } : {}),
      ...(followUpAt !== undefined ? { followUpAt: followUpAt ? new Date(followUpAt) : null } : {}),
      ...(closedAt !== undefined ? { closedAt: closedAt ? new Date(closedAt) : null } : {}),
    },
    include: { customer: true },
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
  const lead = await db.lead.findFirst({
    where: { id },
    include: { business: { select: { userId: true } } },
  });
  if (!lead || lead.business.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await db.lead.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
