"use client";

import { useEffect, useState } from "react";
import { useBusiness } from "@/lib/business-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  AlertCircle,
  Users,
  Package,
  Clock,
  ArrowRight,
  Building2,
  Plus,
  RefreshCw,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface DashboardData {
  revenueMTD: number;
  revenueLastMonth: number;
  revenueChange: number;
  totalOutstanding: number;
  overdueAmount: number;
  openJobs: number;
  jobsToday: number;
  activeLeads: number;
  pipelineValue: number;
  expensesMTD: number;
  actionItems: {
    overdueInvoices: Array<{ id: string; number: string; amount: number; dueDate: string; status: string }>;
    staleLeads: Array<{ id: string; title: string; value: number | null; customer?: string; followUpAt: string }>;
    lowStockAlerts: Array<{ id: string; name: string; stockLevel: number; minStock: number; unit: string }>;
    jobsToday: Array<{ id: string; title: string; status: string; customer?: string; startDate: string }>;
  };
}

function StatCard({
  title,
  value,
  sub,
  trend,
  icon: Icon,
  color = "blue",
  href,
}: {
  title: string;
  value: string;
  sub?: string;
  trend?: number;
  icon: React.ElementType;
  color?: "blue" | "green" | "orange" | "red" | "purple";
  href?: string;
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
  };

  const card = (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {sub && (
              <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
            )}
            {trend !== undefined && (
              <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
                {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(trend).toFixed(1)}% vs last month
              </div>
            )}
          </div>
          <div className={`p-2.5 rounded-xl ${colors[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href}>{card}</Link>;
  return card;
}

export default function LaunchCenterPage() {
  const { currentBusiness, isLoading: bizLoading } = useBusiness();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!currentBusiness) return;
    setLoading(true);
    fetch(`/api/businesses/${currentBusiness.id}/dashboard`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [currentBusiness]);

  if (bizLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!currentBusiness) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
          <Building2 className="w-8 h-8 text-blue-600" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">Add your first business</h2>
          <p className="text-gray-500 mt-1">Start tracking your business in under a minute.</p>
        </div>
        <Button onClick={() => router.push("/onboarding")}>
          <Plus className="w-4 h-4" />
          Add Business
        </Button>
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Launch Center</h1>
          <p className="text-gray-500 text-sm mt-0.5">{today} &middot; {currentBusiness.name}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setLoading(true)} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Revenue MTD"
          value={formatCurrency(data?.revenueMTD ?? 0, currentBusiness.currency, true)}
          trend={data?.revenueChange}
          icon={DollarSign}
          color="green"
          href="/financials"
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(data?.totalOutstanding ?? 0, currentBusiness.currency, true)}
          sub={data?.overdueAmount ? `${formatCurrency(data.overdueAmount, currentBusiness.currency, true)} overdue` : undefined}
          icon={AlertCircle}
          color={data?.overdueAmount ? "red" : "blue"}
          href="/financials"
        />
        <StatCard
          title="Open Jobs"
          value={String(data?.openJobs ?? 0)}
          sub={data?.jobsToday ? `${data.jobsToday} scheduled today` : undefined}
          icon={Briefcase}
          color="orange"
          href="/jobs"
        />
        <StatCard
          title="Pipeline"
          value={formatCurrency(data?.pipelineValue ?? 0, currentBusiness.currency, true)}
          sub={`${data?.activeLeads ?? 0} active leads`}
          icon={TrendingUp}
          color="purple"
          href="/leads"
        />
      </div>

      {/* Action Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Overdue Invoices */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                Overdue Invoices
                {(data?.actionItems.overdueInvoices.length ?? 0) > 0 && (
                  <Badge variant="destructive">{data?.actionItems.overdueInvoices.length}</Badge>
                )}
              </CardTitle>
              <Link href="/financials" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!data || data.actionItems.overdueInvoices.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No overdue invoices</p>
            ) : (
              <div className="space-y-2">
                {data.actionItems.overdueInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{inv.number}</p>
                      <p className="text-xs text-gray-400">Due {formatDate(inv.dueDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600">{formatCurrency(inv.amount, currentBusiness.currency)}</p>
                      <Badge variant="destructive" className="text-xs">Overdue</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Jobs Today */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                Jobs Today
                {(data?.actionItems.jobsToday.length ?? 0) > 0 && (
                  <Badge variant="orange">{data?.actionItems.jobsToday.length}</Badge>
                )}
              </CardTitle>
              <Link href="/jobs" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!data || data.actionItems.jobsToday.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No jobs scheduled today</p>
            ) : (
              <div className="space-y-2">
                {data.actionItems.jobsToday.map((job) => (
                  <div key={job.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{job.title}</p>
                      <p className="text-xs text-gray-400">{job.customer ?? "No customer"}</p>
                    </div>
                    <Badge variant={job.status === "in_progress" ? "default" : "secondary"}>
                      {job.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stale Leads */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-500" />
                Follow-up Needed
                {(data?.actionItems.staleLeads.length ?? 0) > 0 && (
                  <Badge variant="purple">{data?.actionItems.staleLeads.length}</Badge>
                )}
              </CardTitle>
              <Link href="/leads" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!data || data.actionItems.staleLeads.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">All leads are up to date</p>
            ) : (
              <div className="space-y-2">
                {data.actionItems.staleLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{lead.title}</p>
                      <p className="text-xs text-gray-400">{lead.customer ?? "No customer"}</p>
                    </div>
                    <div className="text-right">
                      {lead.value && (
                        <p className="text-sm font-medium text-gray-700">{formatCurrency(lead.value, currentBusiness.currency)}</p>
                      )}
                      <p className="text-xs text-orange-500">Follow-up overdue</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-4 h-4 text-yellow-500" />
                Low Stock Alerts
                {(data?.actionItems.lowStockAlerts.length ?? 0) > 0 && (
                  <Badge variant="warning">{data?.actionItems.lowStockAlerts.length}</Badge>
                )}
              </CardTitle>
              <Link href="/inventory" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!data || data.actionItems.lowStockAlerts.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">All stock levels are fine</p>
            ) : (
              <div className="space-y-2">
                {data.actionItems.lowStockAlerts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-400">Min: {product.minStock} {product.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-yellow-600">{product.stockLevel} {product.unit}</p>
                      <p className="text-xs text-red-500">Reorder needed</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
