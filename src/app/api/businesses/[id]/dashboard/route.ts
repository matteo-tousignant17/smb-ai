import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: businessId } = await params;

  const business = await db.business.findFirst({
    where: { id: businessId, userId: session.user.id },
  });
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    invoices,
    overdueInvoices,
    openJobs,
    jobsToday,
    activeLeads,
    staleLeads,
    lowStockProducts,
    recentExpenses,
    monthInvoices,
    lastMonthInvoices,
  ] = await Promise.all([
    db.invoice.findMany({
      where: { businessId, status: { in: ["sent", "overdue"] } },
      include: { customer: true },
      orderBy: { dueDate: "asc" },
    }),
    db.invoice.findMany({
      where: { businessId, status: "overdue" },
    }),
    db.job.count({
      where: { businessId, status: { in: ["scheduled", "in_progress"] } },
    }),
    db.job.findMany({
      where: {
        businessId,
        status: { in: ["scheduled", "in_progress"] },
        startDate: { gte: new Date(now.setHours(0,0,0,0)), lt: new Date(now.setHours(23,59,59,999)) },
      },
      include: { customer: true },
    }),
    db.lead.count({ where: { businessId, stage: { in: ["new", "contacted", "quoted", "negotiating"] } } }),
    db.lead.findMany({
      where: {
        businessId,
        stage: { notIn: ["won", "lost"] },
        followUpAt: { lt: now },
      },
      include: { customer: true },
    }),
    db.product.findMany({
      where: { businessId, type: { in: ["product", "material"] } },
      orderBy: { stockLevel: "asc" },
    }),
    db.expense.aggregate({
      where: { businessId, date: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    db.invoice.aggregate({
      where: { businessId, status: "paid", paidAt: { gte: startOfMonth } },
      _sum: { total: true },
    }),
    db.invoice.aggregate({
      where: { businessId, status: "paid", paidAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      _sum: { total: true },
    }),
  ]);

  const totalOutstanding = invoices.reduce((s, i) => s + i.total, 0);
  const overdueAmount = overdueInvoices.reduce((s, i) => s + i.total, 0);
  const revenueMTD = monthInvoices._sum.total ?? 0;
  const revenueLastMonth = lastMonthInvoices._sum.total ?? 0;
  const revenueChange = revenueLastMonth > 0 ? ((revenueMTD - revenueLastMonth) / revenueLastMonth) * 100 : 0;

  const lowStockAlerts = lowStockProducts.filter(
    (p) => p.stockLevel <= p.minStock && p.minStock > 0
  );

  const pipelineLeads = await db.lead.findMany({
    where: { businessId, stage: { in: ["new", "contacted", "quoted", "negotiating"] } },
  });
  const pipelineValue = pipelineLeads.reduce((s, l) => s + (l.value ?? 0), 0);

  return NextResponse.json({
    revenueMTD,
    revenueLastMonth,
    revenueChange,
    totalOutstanding,
    overdueAmount,
    openJobs,
    jobsToday: jobsToday.length,
    activeLeads,
    pipelineValue,
    expensesMTD: recentExpenses._sum.amount ?? 0,
    actionItems: {
      overdueInvoices: overdueInvoices.map((i) => ({
        id: i.id,
        number: i.number,
        amount: i.total,
        dueDate: i.dueDate,
        status: i.status,
      })),
      staleLeads: staleLeads.slice(0, 5).map((l) => ({
        id: l.id,
        title: l.title,
        value: l.value,
        customer: l.customer?.name,
        followUpAt: l.followUpAt,
      })),
      lowStockAlerts: lowStockAlerts.slice(0, 5).map((p) => ({
        id: p.id,
        name: p.name,
        stockLevel: p.stockLevel,
        minStock: p.minStock,
        unit: p.unit,
      })),
      jobsToday: jobsToday.slice(0, 5).map((j) => ({
        id: j.id,
        title: j.title,
        status: j.status,
        customer: j.customer?.name,
        startDate: j.startDate,
      })),
    },
  });
}
