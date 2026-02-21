"use client";

import { useEffect, useState } from "react";
import { useBusiness } from "@/lib/business-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  X,
  AlertCircle,
  TrendingUp,
  Zap,
  Eye,
  ChevronRight,
} from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";

interface Insight {
  id: string;
  type: string;
  priority: string;
  title: string;
  body: string;
  createdAt: string;
}

const priorityConfig: Record<string, { color: "destructive" | "warning" | "default" | "secondary"; label: string }> = {
  critical: { color: "destructive", label: "Critical" },
  high: { color: "warning", label: "High" },
  medium: { color: "default", label: "Medium" },
  low: { color: "secondary", label: "Low" },
};

const typeIcon: Record<string, React.ElementType> = {
  alert: AlertCircle,
  opportunity: TrendingUp,
  action: Zap,
  forecast: Eye,
};

const typeColor: Record<string, string> = {
  alert: "text-red-500 bg-red-50",
  opportunity: "text-green-500 bg-green-50",
  action: "text-blue-500 bg-blue-50",
  forecast: "text-purple-500 bg-purple-50",
};

export default function AiInsightsPage() {
  const { currentBusiness } = useBusiness();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [hasApiKey] = useState(!!process.env.NEXT_PUBLIC_HAS_AI);

  useEffect(() => {
    if (!currentBusiness) return;
    setLoading(true);
    fetch(`/api/ai/insights?businessId=${currentBusiness.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setInsights(data);
      })
      .finally(() => setLoading(false));
  }, [currentBusiness]);

  async function generateInsights() {
    if (!currentBusiness) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: currentBusiness.id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setInsights(data);
      } else {
        const err = await res.json();
        alert(err.error ?? "Failed to generate insights");
      }
    } finally {
      setGenerating(false);
    }
  }

  async function dismissInsight(insight: Insight) {
    const res = await fetch("/api/ai/insights", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: insight.id }),
    });
    if (res.ok) {
      setInsights((is) => is.filter((i) => i.id !== insight.id));
    }
  }

  if (!currentBusiness) {
    return <div className="p-6 text-gray-400">No business selected.</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Insights</h1>
            <p className="text-gray-500 text-sm mt-0.5">Powered by Claude — analyzing {currentBusiness.name}</p>
          </div>
        </div>
        <Button onClick={generateInsights} disabled={generating} className="bg-purple-600 hover:bg-purple-700">
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Generate Insights
            </>
          )}
        </Button>
      </div>

      {/* Info banner */}
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="py-4 px-5">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-purple-900">How AI Insights works</p>
              <p className="text-sm text-purple-700 mt-0.5">
                Claude analyzes your revenue trends, outstanding invoices, job pipeline, inventory levels,
                and expenses — then surfaces specific, actionable recommendations. Click &ldquo;Generate Insights&rdquo;
                to get a fresh analysis based on your current data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
        </div>
      ) : insights.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="py-16 text-center">
            <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No insights yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Click &ldquo;Generate Insights&rdquo; to analyze your business data with Claude.
            </p>
            <Button
              className="mt-4 bg-purple-600 hover:bg-purple-700"
              onClick={generateInsights}
              disabled={generating}
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? "Analyzing..." : "Get My Insights"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => {
            const Icon = typeIcon[insight.type] ?? ChevronRight;
            const iconClass = typeColor[insight.type] ?? "text-gray-500 bg-gray-50";
            const priority = priorityConfig[insight.priority] ?? priorityConfig.medium;

            return (
              <Card key={insight.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4 px-5">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${iconClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{insight.title}</p>
                        <Badge variant={priority.color}>{priority.label}</Badge>
                        <Badge variant="secondary" className="capitalize">{insight.type}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{insight.body}</p>
                      <p className="text-xs text-gray-400 mt-2">{formatRelativeDate(insight.createdAt)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                      onClick={() => dismissInsight(insight)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
