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
  const expense = await db.expense.findFirst({
    where: { id },
    include: { business: { select: { userId: true } } },
  });
  if (!expense || expense.business.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { date, ...rest } = body;
  const updated = await db.expense.update({
    where: { id },
    data: {
      ...rest,
      ...(rest.amount !== undefined ? { amount: parseFloat(rest.amount) } : {}),
      ...(date !== undefined ? { date: date ? new Date(date) : new Date() } : {}),
    },
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
  const expense = await db.expense.findFirst({
    where: { id },
    include: { business: { select: { userId: true } } },
  });
  if (!expense || expense.business.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await db.expense.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
