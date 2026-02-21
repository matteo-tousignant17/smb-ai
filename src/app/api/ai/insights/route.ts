import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { businessId } = await request.json();

  const business = await db.business.findFirst({
    where: { id: businessId, userId: session.user.id },
  });
  if (!business) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 503 });
  }

  // Gather business data for context
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [
    recentInvoices,
    overdueInvoices,
    openJobs,
    activeLeads,
    lowStockProducts,
    recentExpenses,
    allInvoicesLast60,
  ] = await Promise.all([
    db.invoice.findMany({
      where: { businessId, createdAt: { gte: thirtyDaysAgo } },
      include: { customer: true },
    }),
    db.invoice.findMany({
      where: { businessId, status: "overdue" },
    }),
    db.job.findMany({
      where: { businessId, status: { in: ["scheduled", "in_progress"] } },
      include: { customer: true },
    }),
    db.lead.findMany({
      where: { businessId, stage: { notIn: ["won", "lost"] } },
    }),
    db.product.findMany({
      where: { businessId, type: { in: ["product", "material"] } },
    }),
    db.expense.findMany({
      where: { businessId, date: { gte: thirtyDaysAgo } },
    }),
    db.invoice.findMany({
      where: { businessId, createdAt: { gte: sixtyDaysAgo } },
    }),
  ]);

  const revenueLast30 = recentInvoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.total, 0);

  const revenuePrev30 = allInvoicesLast60
    .filter((i) => i.status === "paid" && new Date(i.createdAt) < thirtyDaysAgo)
    .reduce((s, i) => s + i.total, 0);

  const overdueTotal = overdueInvoices.reduce((s, i) => s + i.total, 0);
  const expensesTotal = recentExpenses.reduce((s, e) => s + e.amount, 0);
  const lowStock = lowStockProducts.filter(
    (p) => p.minStock > 0 && p.stockLevel <= p.minStock
  );
  const pipelineValue = activeLeads.reduce((s, l) => s + (l.value ?? 0), 0);

  const prompt = `You are an AI business advisor analyzing data for "${business.name}", a ${business.type} business in the ${business.industry ?? "SMB"} industry.

Current business data (last 30 days):
- Revenue: $${revenueLast30.toFixed(2)} (prev 30 days: $${revenuePrev30.toFixed(2)})
- Outstanding invoices: ${overdueInvoices.length} overdue ($${overdueTotal.toFixed(2)})
- Expenses: $${expensesTotal.toFixed(2)}
- Open jobs: ${openJobs.length}
- Pipeline leads: ${activeLeads.length} worth $${pipelineValue.toFixed(2)}
- Low stock items: ${lowStock.length} items below reorder threshold
- Net profit (est): $${(revenueLast30 - expensesTotal).toFixed(2)}

Analyze this data and provide 4-6 specific, actionable insights. For each insight:
1. Identify the issue or opportunity
2. Explain why it matters
3. Give a specific action to take

Format your response as a JSON array with this exact structure:
[
  {
    "type": "alert|opportunity|action|forecast",
    "priority": "critical|high|medium|low",
    "title": "Short title (max 8 words)",
    "body": "2-3 sentences explaining the insight and what to do about it."
  }
]

Focus on:
- Cash flow and overdue invoice risk
- Revenue trends (growth or decline)
- Job pipeline health
- Inventory risks
- Profitability
- Quick wins

Return ONLY the JSON array, no other text.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    let insights: Array<{
      type: string;
      priority: string;
      title: string;
      body: string;
    }>;

    try {
      insights = JSON.parse(content.text);
    } catch {
      // Try to extract JSON from the text
      const match = content.text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("Could not parse insights");
      insights = JSON.parse(match[0]);
    }

    // Clear old non-dismissed insights and save new ones
    await db.aiInsight.deleteMany({
      where: { businessId, dismissed: false },
    });

    const created = await Promise.all(
      insights.map((insight) =>
        db.aiInsight.create({
          data: {
            businessId,
            type: insight.type,
            priority: insight.priority,
            title: insight.title,
            body: insight.body,
          },
        })
      )
    );

    return NextResponse.json(created);
  } catch (err) {
    console.error("AI insights error:", err);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "businessId required" }, { status: 400 });
  }

  const business = await db.business.findFirst({
    where: { id: businessId, userId: session.user.id },
  });
  if (!business) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const insights = await db.aiInsight.findMany({
    where: { businessId, dismissed: false },
    orderBy: [
      { priority: "asc" },
      { createdAt: "desc" },
    ],
  });

  return NextResponse.json(insights);
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();
  const insight = await db.aiInsight.findFirst({
    where: { id },
    include: { business: { select: { userId: true } } },
  });

  if (!insight || insight.business.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.aiInsight.update({
    where: { id },
    data: { dismissed: true },
  });

  return NextResponse.json(updated);
}
