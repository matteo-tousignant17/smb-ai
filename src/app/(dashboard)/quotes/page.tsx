"use client";

import { useEffect, useState } from "react";
import { useBusiness } from "@/lib/business-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Plus, Search, Loader2, FileCheck, Clock, X, Trash2, ChevronRight, Send,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUSES = [
  { value: "draft", label: "Draft", color: "secondary" as const },
  { value: "sent", label: "Sent", color: "default" as const },
  { value: "accepted", label: "Accepted", color: "success" as const },
  { value: "declined", label: "Declined", color: "destructive" as const },
  { value: "expired", label: "Expired", color: "outline" as const },
];

interface QuoteItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Quote {
  id: string;
  number: string;
  status: string;
  validUntil: string | null;
  notes: string | null;
  subtotal: number;
  tax: number;
  total: number;
  customer: { id: string; name: string } | null;
  lead: { id: string; title: string } | null;
  items: QuoteItem[];
}

interface Customer { id: string; name: string }
interface Lead { id: string; title: string }

interface LineItemForm {
  description: string;
  quantity: string;
  unitPrice: string;
}

function statusIcon(status: string) {
  switch (status) {
    case "accepted": return <FileCheck className="w-3 h-3" />;
    case "sent": return <Send className="w-3 h-3" />;
    case "expired": return <Clock className="w-3 h-3" />;
    case "declined": return <X className="w-3 h-3" />;
    default: return null;
  }
}

export default function QuotesPage() {
  const { currentBusiness } = useBusiness();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    customerId: "",
    leadId: "",
    validUntil: "",
    notes: "",
  });
  const [lineItems, setLineItems] = useState<LineItemForm[]>([
    { description: "", quantity: "1", unitPrice: "" },
  ]);

  useEffect(() => {
    if (!currentBusiness) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/quotes?businessId=${currentBusiness.id}`).then(r => r.json()),
      fetch(`/api/customers?businessId=${currentBusiness.id}`).then(r => r.json()),
      fetch(`/api/leads?businessId=${currentBusiness.id}`).then(r => r.json()),
    ]).then(([q, c, l]) => {
      setQuotes(Array.isArray(q) ? q : []);
      setCustomers(Array.isArray(c) ? c : []);
      setLeads(Array.isArray(l) ? l : []);
    }).finally(() => setLoading(false));
  }, [currentBusiness]);

  function openNew() {
    setForm({ customerId: "", leadId: "", validUntil: "", notes: "" });
    setLineItems([{ description: "", quantity: "1", unitPrice: "" }]);
    setSelectedQuote(null);
    setErrors({});
    setShowDialog(true);
  }

  function openEdit(quote: Quote) {
    setForm({
      customerId: quote.customer?.id ?? "",
      leadId: quote.lead?.id ?? "",
      validUntil: quote.validUntil ? new Date(quote.validUntil).toISOString().split("T")[0] : "",
      notes: quote.notes ?? "",
    });
    setLineItems(quote.items.map(i => ({
      description: i.description,
      quantity: String(i.quantity),
      unitPrice: String(i.unitPrice),
    })));
    setSelectedQuote(quote);
    setErrors({});
    setShowDialog(true);
  }

  function addLineItem() {
    setLineItems(li => [...li, { description: "", quantity: "1", unitPrice: "" }]);
  }

  function removeLineItem(idx: number) {
    setLineItems(li => li.filter((_, i) => i !== idx));
  }

  function updateLineItem(idx: number, field: keyof LineItemForm, value: string) {
    setLineItems(li => li.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  const subtotal = lineItems.reduce(
    (s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0),
    0
  );
  const tax = subtotal * ((currentBusiness?.taxRate ?? 0) / 100);
  const total = subtotal + tax;

  function validate() {
    const errs: Record<string, string> = {};
    const hasItems = lineItems.some(i => i.description.trim() && parseFloat(i.unitPrice) > 0);
    if (!hasItems) errs.items = "At least one line item with a description and price is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!currentBusiness || !validate()) return;
    setSaving(true);
    try {
      const body = {
        businessId: currentBusiness.id,
        customerId: form.customerId || null,
        leadId: form.leadId || null,
        validUntil: form.validUntil || null,
        notes: form.notes || null,
        items: lineItems
          .filter(i => i.description.trim())
          .map(i => ({
            description: i.description,
            quantity: parseFloat(i.quantity) || 1,
            unitPrice: parseFloat(i.unitPrice) || 0,
          })),
      };
      if (selectedQuote) {
        const res = await fetch(`/api/quotes/${selectedQuote.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const updated = await res.json();
          setQuotes(qs => qs.map(q => q.id === updated.id ? updated : q));
          setShowDialog(false);
        }
      } else {
        const res = await fetch("/api/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const created = await res.json();
          setQuotes(qs => [created, ...qs]);
          setShowDialog(false);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(quote: Quote, status: string) {
    const res = await fetch(`/api/quotes/${quote.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setQuotes(qs => qs.map(q => q.id === updated.id ? updated : q));
    }
  }

  async function deleteQuote(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/quotes/${id}`, { method: "DELETE" });
      if (res.ok) setQuotes(qs => qs.filter(q => q.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  const filtered = quotes.filter(q => {
    const matchSearch =
      q.number.toLowerCase().includes(search.toLowerCase()) ||
      (q.customer?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (q.lead?.title ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || q.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalValue = quotes.filter(q => q.status !== "declined" && q.status !== "expired").reduce((s, q) => s + q.total, 0);
  const acceptedValue = quotes.filter(q => q.status === "accepted").reduce((s, q) => s + q.total, 0);

  if (!currentBusiness) return <div className="p-6 text-gray-400">No business selected.</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
          <p className="text-gray-500 text-sm mt-0.5">{quotes.length} total quotes</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4" />
          New Quote
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pipeline Value", value: formatCurrency(totalValue, currentBusiness.currency, true), color: "text-blue-600" },
          { label: "Accepted", value: formatCurrency(acceptedValue, currentBusiness.currency, true), color: "text-green-600" },
          { label: "Total Quotes", value: String(quotes.length), color: "text-gray-700" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <p className="text-sm text-gray-500">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-9" placeholder="Search quotes..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Quote</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Customer / Lead</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Valid Until</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500">Total</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Status</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400">No quotes found</td></tr>
                ) : filtered.map(q => {
                  const statusMeta = STATUSES.find(s => s.value === q.status);
                  return (
                    <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-blue-600">{q.number}</td>
                      <td className="py-3 px-4 text-gray-700">
                        {q.customer?.name ?? q.lead?.title ?? "—"}
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {q.validUntil ? formatDate(q.validUntil) : "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">
                        {formatCurrency(q.total, currentBusiness.currency)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={statusMeta?.color ?? "secondary"} className="flex items-center gap-1 w-fit">
                          {statusIcon(q.status)}{statusMeta?.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          {q.status === "draft" && (
                            <Button variant="ghost" size="sm" onClick={() => updateStatus(q, "sent")}>Send</Button>
                          )}
                          {q.status === "sent" && (
                            <>
                              <Button variant="ghost" size="sm" className="text-green-600" onClick={() => updateStatus(q, "accepted")}>Accept</Button>
                              <Button variant="ghost" size="sm" className="text-red-500" onClick={() => updateStatus(q, "declined")}>Decline</Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => openEdit(q)}>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:text-red-600"
                            onClick={() => deleteQuote(q.id)}
                            disabled={deleting === q.id}
                          >
                            {deleting === q.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Quote Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedQuote ? `Edit ${selectedQuote.number}` : "New Quote"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Customer</Label>
                <Select value={form.customerId} onValueChange={v => setForm(f => ({ ...f, customerId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Linked Lead</Label>
                <Select value={form.leadId} onValueChange={v => setForm(f => ({ ...f, leadId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Link to lead" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {leads.filter(l => !["won","lost"].includes((l as Lead & {stage?: string}).stage ?? "")).map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Valid until</Label>
              <Input type="date" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} />
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line Items {errors.items && <span className="text-red-500 text-xs ml-2">{errors.items}</span>}</Label>
                <Button variant="ghost" size="sm" onClick={addLineItem}><Plus className="w-3 h-3 mr-1" />Add Item</Button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                  <span className="col-span-6">Description</span>
                  <span className="col-span-2 text-right">Qty</span>
                  <span className="col-span-3 text-right">Unit Price</span>
                  <span className="col-span-1" />
                </div>
                {lineItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <Input
                      className="col-span-6"
                      value={item.description}
                      onChange={e => updateLineItem(idx, "description", e.target.value)}
                      placeholder="Labor, materials, etc."
                    />
                    <Input
                      className="col-span-2"
                      type="number"
                      min="0"
                      value={item.quantity}
                      onChange={e => updateLineItem(idx, "quantity", e.target.value)}
                    />
                    <Input
                      className="col-span-3"
                      type="number"
                      min="0"
                      value={item.unitPrice}
                      onChange={e => updateLineItem(idx, "unitPrice", e.target.value)}
                      placeholder="0.00"
                    />
                    <Button variant="ghost" size="icon" className="col-span-1 h-8 w-8" onClick={() => removeLineItem(idx)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-2 space-y-1 text-sm text-right">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal, currentBusiness.currency)}</span>
                </div>
                {currentBusiness.taxRate > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Tax ({currentBusiness.taxRate}%)</span>
                    <span>{formatCurrency(tax, currentBusiness.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Total</span>
                  <span>{formatCurrency(total, currentBusiness.currency)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Terms, scope details, expiry conditions..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {selectedQuote ? "Save Changes" : "Create Quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
