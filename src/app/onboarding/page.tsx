"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Building2, ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { useBusiness } from "@/lib/business-context";

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

const STEPS = ["Business Info", "Details", "Financials"];

export default function OnboardingPage() {
  const router = useRouter();
  const { setBusinesses, setCurrentBusiness } = useBusiness();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name) { setError("Business name is required"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, taxRate: parseFloat(form.taxRate) }),
      });
      if (!res.ok) throw new Error("Failed to create business");
      const biz = await res.json();
      const listRes = await fetch("/api/businesses");
      const list = await listRes.json();
      setBusinesses(list);
      setCurrentBusiness(biz);
      router.push("/");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-2xl mb-3 shadow-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Add Your Business</h1>
          <p className="text-gray-500 text-sm mt-1">Set up your business profile in a few steps.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < step ? "bg-blue-600 text-white" :
                i === step ? "bg-blue-600 text-white ring-4 ring-blue-100" :
                "bg-gray-200 text-gray-400"
              }`}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs font-medium ${i === step ? "text-blue-600" : "text-gray-400"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-300 mx-1" />}
            </div>
          ))}
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader>
            <CardTitle>{STEPS[step]}</CardTitle>
            <CardDescription>
              {step === 0 && "Tell us about your business"}
              {step === 1 && "Contact and location info"}
              {step === 2 && "Currency and tax settings"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{error}</p>}

            {step === 0 && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Business name *</Label>
                  <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Acme Metal Works" />
                </div>
                <div className="space-y-1.5">
                  <Label>Business type</Label>
                  <Select value={form.type} onValueChange={(v) => update("type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Products &amp; Services</SelectItem>
                      <SelectItem value="products">Products only</SelectItem>
                      <SelectItem value="services">Services only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Industry</Label>
                  <Select value={form.industry} onValueChange={(v) => update("industry", v)}>
                    <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((ind) => (
                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">What do you do? (optional)</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="We supply and install steel fencing and modular partition walls for commercial properties..."
                    rows={3}
                  />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(555) 123-4567" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="info@business.com" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="www.business.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address">Street address</Label>
                  <Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="123 Main St" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1 space-y-1.5">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Dallas" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="state">State</Label>
                    <Input id="state" value={form.state} onChange={(e) => update("state", e.target.value)} placeholder="TX" maxLength={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="zip">ZIP</Label>
                    <Input id="zip" value={form.zip} onChange={(e) => update("zip", e.target.value)} placeholder="75001" />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Select value={form.currency} onValueChange={(v) => update("currency", v)}>
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
                  <Label htmlFor="taxRate">Default tax rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.taxRate}
                    onChange={(e) => update("taxRate", e.target.value)}
                    placeholder="8.25"
                  />
                  <p className="text-xs text-gray-400">Applied to invoices by default. You can override per invoice.</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 mt-2">
                  <p className="text-sm font-semibold text-blue-900">Ready to launch</p>
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>{form.name || "Your business"}</strong> will be set up with a dashboard for jobs, leads, invoices, and inventory.
                  </p>
                </div>
              </>
            )}

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => step === 0 ? router.push("/") : setStep(s => s - 1)}
              >
                <ArrowLeft className="w-4 h-4" />
                {step === 0 ? "Back" : "Previous"}
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={() => { setError(""); setStep(s => s + 1); }}>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {loading ? "Creating..." : "Create Business"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
