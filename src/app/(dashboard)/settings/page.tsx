"use client";

import { useEffect, useState } from "react";
import { useBusiness } from "@/lib/business-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Building2, Check, Loader2, Plug, Link2, Link2Off, Info, Star, Zap, Lock,
} from "lucide-react";
import { signOut } from "next-auth/react";

// ─── Constants ────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  "Construction & Trades", "Metal & Steel", "Fencing & Gates",
  "Modular/Partition Walls", "Manufacturing", "Retail",
  "Wholesale Distribution", "HVAC & Mechanical", "Electrical",
  "Landscaping", "Cleaning Services", "Other",
];

interface IntegrationField {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "password" | "url";
  hint?: string;
}

interface IntegrationDef {
  id: string;
  name: string;
  description: string;         // What it does
  impact: string;              // Concrete value prop
  category: string;
  logo: string;                // 2-char abbreviation
  logoColor: string;
  strategy: "apikey" | "oauth" | "webhook";
  strategyLabel: string;       // How it's built
  recommended?: boolean;
  fields: IntegrationField[];
}

// Integration catalog with explicit build strategy rationale
const INTEGRATIONS: IntegrationDef[] = [
  // ── Accounting ──────────────────────────────────────────────────────────────
  // Strategy: Build native OAuth for each. QuickBooks = 62% US market share,
  // non-negotiable. Xero = strong secondary (#2 internationally). Merge.dev
  // ($650/mo minimum) is only worth it at scale — native OAuth is the right
  // call for early stage where we control the full integration surface.
  {
    id: "quickbooks",
    name: "QuickBooks Online",
    description: "Push invoices, expenses, and customers to QBO automatically.",
    impact: "Stop double-entry. Every invoice you create here syncs to QBO in real time.",
    category: "Accounting",
    logo: "QB",
    logoColor: "bg-green-600",
    strategy: "oauth",
    strategyLabel: "Native OAuth (in development)",
    recommended: true,
    fields: [],
  },
  {
    id: "xero",
    name: "Xero",
    description: "Accounting, bank reconciliation, and payroll — popular in CA, AU, UK.",
    impact: "Invoices, expenses, and contacts sync to Xero's ledger automatically.",
    category: "Accounting",
    logo: "Xe",
    logoColor: "bg-[#13B5EA]",
    strategy: "oauth",
    strategyLabel: "Native OAuth (in development)",
    fields: [],
  },
  // ── Payments ─────────────────────────────────────────────────────────────────
  // Strategy: Build native for all three. PayPal = 43% market share (largest
  // by reach), Stripe = 21% and preferred by tech-forward SMBs, Square = best
  // for physical/hybrid businesses. All three have excellent API docs and
  // webhooks. A "Pay Now" link on invoices drives immediate cash flow.
  {
    id: "stripe",
    name: "Stripe",
    description: "Add a 'Pay Now' button to every invoice. Auto-mark paid on checkout.",
    impact: "Customers pay online instantly. Invoices close themselves.",
    category: "Payments",
    logo: "St",
    logoColor: "bg-indigo-600",
    strategy: "apikey",
    strategyLabel: "Built native (API key)",
    recommended: true,
    fields: [
      {
        key: "secret_key",
        label: "Secret Key",
        placeholder: "sk_live_...",
        type: "password",
        hint: "Stripe Dashboard → Developers → API keys. Use sk_test_... for testing.",
      },
      {
        key: "webhook_secret",
        label: "Webhook Secret",
        placeholder: "whsec_...",
        type: "password",
        hint: "Required for automatic invoice reconciliation. Stripe Dashboard → Webhooks.",
      },
    ],
  },
  {
    id: "paypal",
    name: "PayPal",
    description: "Accept PayPal payments on invoices. Reaches customers who prefer PayPal.",
    impact: "43% of SMB online payments go through PayPal — don't lose those sales.",
    category: "Payments",
    logo: "PP",
    logoColor: "bg-blue-700",
    strategy: "apikey",
    strategyLabel: "Built native (API key)",
    recommended: true,
    fields: [
      {
        key: "client_id",
        label: "Client ID",
        placeholder: "AXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        type: "text",
        hint: "PayPal Developer → My Apps & Credentials → your app → Client ID",
      },
      {
        key: "client_secret",
        label: "Client Secret",
        placeholder: "EJxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        type: "password",
        hint: "PayPal Developer → My Apps & Credentials → your app → Secret",
      },
    ],
  },
  {
    id: "square",
    name: "Square",
    description: "Sync Square transactions and in-person payments with your invoices.",
    impact: "All your Square sales appear as reconciled invoices automatically.",
    category: "Payments",
    logo: "Sq",
    logoColor: "bg-gray-900",
    strategy: "apikey",
    strategyLabel: "Built native (API key)",
    fields: [
      {
        key: "access_token",
        label: "Access Token",
        placeholder: "EAAAl...",
        type: "password",
        hint: "Square Developer → Applications → your app → OAuth → Production Access Token",
      },
      {
        key: "location_id",
        label: "Location ID",
        placeholder: "LXXXXXXXXXXXXXXXXXX",
        type: "text",
        hint: "Square Dashboard → Account → Business Locations",
      },
    ],
  },
  // ── Communication ────────────────────────────────────────────────────────────
  // Strategy: Build native. Twilio is API-key only (no OAuth), minimal setup.
  // Slack incoming webhooks are URL-only — literally one field. High ROI for
  // small teams who live in Slack.
  {
    id: "twilio",
    name: "Twilio SMS",
    description: "Send job reminders, quote follow-ups, and payment alerts via SMS.",
    impact: "Automated SMS cuts no-shows and accelerates quote-to-close.",
    category: "Communication",
    logo: "Tw",
    logoColor: "bg-red-600",
    strategy: "apikey",
    strategyLabel: "Built native (API key)",
    recommended: true,
    fields: [
      {
        key: "account_sid",
        label: "Account SID",
        placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        type: "text",
        hint: "Twilio Console → Account → Account SID",
      },
      {
        key: "auth_token",
        label: "Auth Token",
        placeholder: "your_auth_token",
        type: "password",
        hint: "Twilio Console → Account → Auth Token",
      },
      {
        key: "from_number",
        label: "From Phone Number",
        placeholder: "+15551234567",
        type: "text",
        hint: "A Twilio phone number you own, in E.164 format",
      },
    ],
  },
  {
    id: "slack",
    name: "Slack",
    description: "Post new jobs, overdue invoices, and daily summaries to a channel.",
    impact: "Your team knows what's happening without checking the dashboard.",
    category: "Communication",
    logo: "Sl",
    logoColor: "bg-purple-700",
    strategy: "webhook",
    strategyLabel: "Built native (webhook URL)",
    fields: [
      {
        key: "webhook_url",
        label: "Incoming Webhook URL",
        placeholder: "https://hooks.slack.com/services/T.../B.../...",
        type: "url",
        hint: "Slack → Apps → Incoming Webhooks → Add to Slack → Copy webhook URL",
      },
    ],
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    description: "Sync customers to your audience for email campaigns and newsletters.",
    impact: "Turn completed jobs into repeat business with targeted follow-up emails.",
    category: "Communication",
    logo: "Mc",
    logoColor: "bg-yellow-500",
    strategy: "apikey",
    strategyLabel: "Built native (API key)",
    fields: [
      {
        key: "api_key",
        label: "API Key",
        placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us1",
        type: "password",
        hint: "Mailchimp → Account → Extras → API keys",
      },
      {
        key: "list_id",
        label: "Audience ID",
        placeholder: "abc123def4",
        type: "text",
        hint: "Mailchimp → Audience → Settings → Audience name and defaults → Audience ID",
      },
    ],
  },
  // ── Scheduling ───────────────────────────────────────────────────────────────
  // Strategy: Build native OAuth. Google Calendar and Outlook both have well-
  // documented OAuth + REST APIs. Worth building for the high adoption rate.
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Auto-create calendar events for every scheduled job.",
    impact: "Jobs appear on your team's calendars the moment they're created.",
    category: "Scheduling",
    logo: "Gc",
    logoColor: "bg-blue-600",
    strategy: "oauth",
    strategyLabel: "Built native (OAuth)",
    recommended: true,
    fields: [],
  },
  {
    id: "outlook",
    name: "Microsoft Outlook",
    description: "Calendar sync and email integration for job scheduling and lead capture.",
    impact: "Jobs sync to Outlook. Incoming emails can create leads automatically.",
    category: "Scheduling",
    logo: "Ms",
    logoColor: "bg-blue-800",
    strategy: "oauth",
    strategyLabel: "Built native (OAuth)",
    fields: [],
  },
];

const CATEGORIES = ["Accounting", "Payments", "Communication", "Scheduling"];

const STRATEGY_INFO: Record<string, { label: string; color: string }> = {
  "apikey": { label: "API Key", color: "bg-green-100 text-green-700" },
  "webhook": { label: "Webhook", color: "bg-blue-100 text-blue-700" },
  "oauth": { label: "OAuth", color: "bg-orange-100 text-orange-700" },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedIntegration {
  id: string;
  type: string;
  status: string;
  config: string | null;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { currentBusiness, businesses, setCurrentBusiness, setBusinesses } = useBusiness();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    name: "", type: "both", industry: "", description: "",
    phone: "", email: "", website: "",
    address: "", city: "", state: "", zip: "",
    currency: "USD", taxRate: "0",
  });

  // Integration state
  const [savedIntegrations, setSavedIntegrations] = useState<SavedIntegration[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [dialogIntegration, setDialogIntegration] = useState<IntegrationDef | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!currentBusiness) return;
    setForm({
      name: currentBusiness.name,
      type: currentBusiness.type,
      industry: (currentBusiness as unknown as Record<string, string>).industry ?? "",
      description: (currentBusiness as unknown as Record<string, string>).description ?? "",
      phone: (currentBusiness as unknown as Record<string, string>).phone ?? "",
      email: (currentBusiness as unknown as Record<string, string>).email ?? "",
      website: (currentBusiness as unknown as Record<string, string>).website ?? "",
      address: (currentBusiness as unknown as Record<string, string>).address ?? "",
      city: (currentBusiness as unknown as Record<string, string>).city ?? "",
      state: (currentBusiness as unknown as Record<string, string>).state ?? "",
      zip: (currentBusiness as unknown as Record<string, string>).zip ?? "",
      currency: currentBusiness.currency,
      taxRate: String((currentBusiness as unknown as Record<string, number>).taxRate ?? 0),
    });
    loadIntegrations(currentBusiness.id);
  }, [currentBusiness]);

  async function loadIntegrations(businessId: string) {
    setIntegrationsLoading(true);
    try {
      const res = await fetch(`/api/integrations?businessId=${businessId}`);
      if (res.ok) setSavedIntegrations(await res.json());
    } finally {
      setIntegrationsLoading(false);
    }
  }

  async function handleSave() {
    if (!currentBusiness) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/businesses/${currentBusiness.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, taxRate: parseFloat(form.taxRate) || 0 }),
      });
      if (res.ok) {
        const updated = { ...currentBusiness, ...form, taxRate: parseFloat(form.taxRate) || 0 };
        setCurrentBusiness(updated);
        setBusinesses(businesses.map((b) => (b.id === currentBusiness.id ? updated : b)));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  function openConnectDialog(integration: IntegrationDef) {
    if (integration.strategy === "oauth") return; // OAuth is not yet implemented
    const existing = savedIntegrations.find(i => i.type === integration.id);
    const existingConfig = existing?.config ? JSON.parse(existing.config) : {};
    const defaults: Record<string, string> = {};
    for (const field of integration.fields) {
      defaults[field.key] = existingConfig[field.key] ?? "";
    }
    setConfigForm(defaults);
    setDialogIntegration(integration);
  }

  async function handleConnect() {
    if (!currentBusiness || !dialogIntegration) return;
    setConnectingId(dialogIntegration.id);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          type: dialogIntegration.id,
          config: configForm,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setSavedIntegrations(prev => {
          const exists = prev.find(i => i.type === saved.type);
          return exists ? prev.map(i => i.type === saved.type ? saved : i) : [...prev, saved];
        });
        setDialogIntegration(null);
      }
    } finally {
      setConnectingId(null);
    }
  }

  async function handleDisconnect(integrationId: string) {
    if (!currentBusiness) return;
    setDisconnectingId(integrationId);
    try {
      await fetch(`/api/integrations/${integrationId}?businessId=${currentBusiness.id}`, { method: "DELETE" });
      setSavedIntegrations(prev =>
        prev.map(i => i.type === integrationId ? { ...i, status: "disconnected", config: null } : i)
      );
    } finally {
      setDisconnectingId(null);
    }
  }

  function getStatus(id: string) {
    return savedIntegrations.find(i => i.type === id)?.status ?? "disconnected";
  }

  if (!currentBusiness) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <p className="text-gray-400">No business selected. Add a business first.</p>
      </div>
    );
  }

  const connectedCount = INTEGRATIONS.filter(i => getStatus(i.id) === "connected").length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Business profile and integrations</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Business Profile</TabsTrigger>
          <TabsTrigger value="integrations">
            Integrations
            {connectedCount > 0 && (
              <span className="ml-2 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {connectedCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Business Profile ─────────────────────────────────────────────────── */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <CardTitle>Business Profile</CardTitle>
              </div>
              <CardDescription>Edit your business information and default settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Business name</Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Business type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Products &amp; Services</SelectItem>
                      <SelectItem value="products">Products only</SelectItem>
                      <SelectItem value="services">Services only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Select value={form.industry} onValueChange={(v) => setForm((f) => ({ ...f, industry: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} />
              </div>

              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Input value={form.state} maxLength={2} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>ZIP</Label>
                  <Input value={form.zip} onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))} />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD — US Dollar</SelectItem>
                      <SelectItem value="CAD">CAD — Canadian Dollar</SelectItem>
                      <SelectItem value="EUR">EUR — Euro</SelectItem>
                      <SelectItem value="GBP">GBP — British Pound</SelectItem>
                      <SelectItem value="AUD">AUD — Australian Dollar</SelectItem>
                      <SelectItem value="MXN">MXN — Mexican Peso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Default tax rate (%)</Label>
                  <Input
                    type="number" min="0" max="100" step="0.01"
                    value={form.taxRate}
                    onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
                  {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account */}
          <Card>
            <CardHeader><CardTitle>Account</CardTitle></CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Integrations ─────────────────────────────────────────────────────── */}
        <TabsContent value="integrations" className="space-y-6">
          {/* Strategy callout */}
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 flex gap-3">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 space-y-2">
              <p className="font-semibold">Integration strategy</p>
              <p>
                <span className="font-medium">Live now —</span> API key integrations (Stripe, PayPal, Square, Twilio, Slack, Mailchimp): paste your key and connect instantly.
              </p>
              <p>
                <span className="font-medium">In development —</span> OAuth integrations (QuickBooks, Xero, Google Calendar, Outlook): built natively so we own the full sync surface. QuickBooks has 62% US market share; Stripe + PayPal cover 65% of online payments. These are the highest-ROI connections.
              </p>
              <p className="text-blue-700">
                We evaluated Merge.dev and Apideck (unified API platforms) but both cost $600–650/mo minimum — not the right fit at this stage. Native OAuth costs zero and gives us more control.
              </p>
            </div>
          </div>

          {integrationsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          ) : (
            CATEGORIES.map(category => {
              const items = INTEGRATIONS.filter(i => i.category === category);
              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{category}</h2>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="grid gap-3">
                    {items.map(integration => {
                      const status = getStatus(integration.id);
                      const isConnected = status === "connected";
                      const isOAuth = integration.strategy === "oauth";
                      const strategyMeta = STRATEGY_INFO[integration.strategy];

                      return (
                        <Card
                          key={integration.id}
                          className={`transition-all ${isConnected ? "border-green-200 bg-green-50/30" : ""}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              {/* Logo */}
                              <div className={`w-10 h-10 rounded-lg ${integration.logoColor} flex items-center justify-center flex-shrink-0`}>
                                <span className="text-white text-xs font-bold">{integration.logo}</span>
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-gray-900 text-sm">{integration.name}</span>
                                  {integration.recommended && (
                                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs flex items-center gap-0.5">
                                      <Star className="w-2.5 h-2.5" />Recommended
                                    </Badge>
                                  )}
                                  {isConnected && (
                                    <Badge className="bg-green-100 text-green-700 border-green-200 text-xs flex items-center gap-0.5">
                                      <Check className="w-2.5 h-2.5" />Connected
                                    </Badge>
                                  )}
                                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${strategyMeta.color}`}>
                                    {strategyMeta.label}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">{integration.description}</p>
                                <p className="text-xs text-gray-700 mt-1 flex items-start gap-1">
                                  <Zap className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                                  {integration.impact}
                                </p>
                                {isOAuth && !isConnected && (
                                  <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                                    <Lock className="w-3 h-3" />
                                    OAuth setup coming soon
                                  </p>
                                )}
                              </div>

                              {/* Action */}
                              <div className="flex-shrink-0">
                                {isConnected ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-500 border-red-200 hover:bg-red-50"
                                    onClick={() => handleDisconnect(integration.id)}
                                    disabled={disconnectingId === integration.id}
                                  >
                                    {disconnectingId === integration.id
                                      ? <Loader2 className="w-3 h-3 animate-spin" />
                                      : <Link2Off className="w-3 h-3" />}
                                    Disconnect
                                  </Button>
                                ) : isOAuth ? (
                                  <Button variant="outline" size="sm" disabled>
                                    <Link2 className="w-3 h-3" />
                                    Coming Soon
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openConnectDialog(integration)}
                                  >
                                    <Link2 className="w-3 h-3" />
                                    Connect
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* ── Connect Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={!!dialogIntegration} onOpenChange={open => !open && setDialogIntegration(null)}>
        {dialogIntegration && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${dialogIntegration.logoColor} flex items-center justify-center`}>
                  <span className="text-white text-xs font-bold">{dialogIntegration.logo}</span>
                </div>
                <DialogTitle>Connect {dialogIntegration.name}</DialogTitle>
              </div>
            </DialogHeader>
            <p className="text-sm text-gray-500">{dialogIntegration.description}</p>
            <div className="space-y-4">
              {dialogIntegration.fields.map(field => (
                <div key={field.key} className="space-y-1.5">
                  <Label>{field.label}</Label>
                  <Input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={configForm[field.key] ?? ""}
                    onChange={e => setConfigForm(f => ({ ...f, [field.key]: e.target.value }))}
                    autoComplete="off"
                  />
                  {field.hint && (
                    <p className="text-xs text-gray-400">{field.hint}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-100">
              <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-500">
                Keys are stored encrypted in your business account and never shared.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogIntegration(null)}>Cancel</Button>
              <Button
                onClick={handleConnect}
                disabled={connectingId === dialogIntegration.id || dialogIntegration.fields.some(f => !configForm[f.key]?.trim())}
              >
                {connectingId === dialogIntegration.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save & Connect
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
