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
import {
  Building2,
  Check,
  Loader2,
  Plug,
  Link2,
  Link2Off,
  AlertCircle,
} from "lucide-react";
import { signOut } from "next-auth/react";

const INDUSTRIES = [
  "Construction & Trades",
  "Metal & Steel",
  "Fencing & Gates",
  "Modular/Partition Walls",
  "Manufacturing",
  "Retail",
  "Wholesale Distribution",
  "HVAC & Mechanical",
  "Electrical",
  "Landscaping",
  "Cleaning Services",
  "Other",
];

const INTEGRATIONS = [
  {
    id: "quickbooks",
    name: "QuickBooks Online",
    description: "Sync invoices, expenses, and bank transactions",
    category: "Accounting",
    comingSoon: true,
  },
  {
    id: "xero",
    name: "Xero",
    description: "Accounting and financial management",
    category: "Accounting",
    comingSoon: true,
  },
  {
    id: "google",
    name: "Google Workspace",
    description: "Gmail for lead parsing, Calendar for job scheduling",
    category: "Productivity",
    comingSoon: true,
  },
  {
    id: "outlook",
    name: "Microsoft Outlook",
    description: "Email and calendar integration",
    category: "Productivity",
    comingSoon: true,
  },
  {
    id: "hubspot",
    name: "HubSpot CRM",
    description: "Sync leads, contacts, and deals",
    category: "CRM",
    comingSoon: true,
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Enterprise CRM sync",
    category: "CRM",
    comingSoon: true,
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Accept online payments, auto-reconcile invoices",
    category: "Payments",
    comingSoon: true,
  },
];

export default function SettingsPage() {
  const { currentBusiness, businesses, setCurrentBusiness, setBusinesses } = useBusiness();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    name: "",
    type: "both",
    industry: "",
    description: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    currency: "USD",
    taxRate: "0",
  });

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
  }, [currentBusiness]);

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

  if (!currentBusiness) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <p className="text-gray-400">No business selected. Add a business first.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your business profile and integrations</p>
      </div>

      {/* Business Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <CardTitle>Business Profile</CardTitle>
          </div>
          <CardDescription>Edit your business information and settings</CardDescription>
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
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
            />
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
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.taxRate}
                onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <Check className="w-4 h-4" />
              ) : null}
              {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plug className="w-5 h-5 text-blue-600" />
            <CardTitle>Integrations</CardTitle>
          </div>
          <CardDescription>Connect your business tools to sync data automatically</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {["Accounting", "Productivity", "CRM", "Payments"].map((category) => {
            const categoryIntegrations = INTEGRATIONS.filter((i) => i.category === category);
            return (
              <div key={category}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{category}</p>
                <div className="space-y-2">
                  {categoryIntegrations.map((integration) => (
                    <div
                      key={integration.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">{integration.name}</p>
                          {integration.comingSoon && (
                            <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{integration.description}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={integration.comingSoon}
                        className="flex-shrink-0"
                      >
                        {integration.comingSoon ? (
                          <>
                            <AlertCircle className="w-3 h-3" />
                            Soon
                          </>
                        ) : (
                          <>
                            <Link2 className="w-3 h-3" />
                            Connect
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
