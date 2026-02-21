"use client";

import { useEffect, useState } from "react";
import { useBusiness } from "@/lib/business-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Search, Loader2, DollarSign, AlertCircle, CheckCircle2, Clock, FileText, Trash2, ChevronRight, X
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const INVOICE_STATUSES = [
  { value: "draft", label: "Draft", color: "secondary" as const },
  { value: "sent", label: "Sent", color: "default" as const },
  { value: "paid", label: "Paid", color: "success" as const },
  { value: "overdue", label: "Overdue", color: "destructive" as const },
  { value: "cancelled", label: "Cancelled", color: "outline" as const },
];

const EXPENSE_CATEGORIES = ["Materials", "Labor", "Equipment", "Marketing", "Overhead", "Utilities", "Travel", "General"];

interface Invoice {
  id: string;
  number: string;
  status: string;
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  customer: { id: string; name: string } | null;
  job: { title: string; jobNumber: string | null } | null;
  items: Array<{ id: string; description: string; quantity: number; unitPrice: number; total: number }>;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  vendor: string | null;
  notes: string | null;
}

interface Customer {
  id: string;
  name: string;
}

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

function statusIcon(status: string) {
  switch (status) {
    case "paid": return <CheckCircle2 className="w-3 h-3" />;
    case "overdue": return <AlertCircle className="w-3 h-3" />;
    case "sent": return <Clock className="w-3 h-3" />;
    default: return <FileText className="w-3 h-3" />;
  }
}

export default function FinancialsPage() {
  const { currentBusiness } = useBusiness();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [invoiceForm, setInvoiceForm] = useState({
    customerId: "",
    dueDate: "",
    notes: "",
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: "", quantity: "1", unitPrice: "" }]);

  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: "",
    category: "general",
    date: new Date().toISOString().split("T")[0],
    vendor: "",
    notes: "",
  });

  useEffect(() => {
    if (!currentBusiness) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/invoices?businessId=${currentBusiness.id}`).then(r => r.json()),
      fetch(`/api/expenses?businessId=${currentBusiness.id}`).then(r => r.json()),
      fetch(`/api/customers?businessId=${currentBusiness.id}`).then(r => r.json()),
    ]).then(([inv, exp, cust]) => {
      setInvoices(inv);
      setExpenses(exp);
      setCustomers(cust);
    }).finally(() => setLoading(false));
  }, [currentBusiness]);

  function openNewInvoice() {
    setInvoiceForm({ customerId: "", dueDate: "", notes: "" });
    setLineItems([{ description: "", quantity: "1", unitPrice: "" }]);
    setSelectedInvoice(null);
    setFormErrors({});
    setShowInvoiceDialog(true);
  }

  function openEditInvoice(invoice: Invoice) {
    setInvoiceForm({
      customerId: invoice.customer?.id ?? "",
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split("T")[0] : "",
      notes: invoice.notes ?? "",
    });
    setLineItems(invoice.items.map(i => ({
      description: i.description,
      quantity: String(i.quantity),
      unitPrice: String(i.unitPrice),
    })));
    setSelectedInvoice(invoice);
    setFormErrors({});
    setShowInvoiceDialog(true);
  }

  function addLineItem() {
    setLineItems(li => [...li, { description: "", quantity: "1", unitPrice: "" }]);
  }

  function removeLineItem(idx: number) {
    setLineItems(li => li.filter((_, i) => i !== idx));
  }

  function updateLineItem(idx: number, field: keyof LineItem, value: string) {
    setLineItems(li => li.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  const invoiceSubtotal = lineItems.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0);
  const invoiceTax = invoiceSubtotal * ((currentBusiness?.taxRate ?? 0) / 100);
  const invoiceTotal = invoiceSubtotal + invoiceTax;

  function validateInvoice() {
    const errs: Record<string, string> = {};
    const hasItems = lineItems.some(i => i.description.trim() && parseFloat(i.unitPrice) > 0);
    if (!hasItems) errs.items = "At least one line item with a description and price is required.";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function saveInvoice() {
    if (!currentBusiness || !validateInvoice()) return;
    setSaving(true);
    try {
      const body = {
        businessId: currentBusiness.id,
        customerId: invoiceForm.customerId || null,
        dueDate: invoiceForm.dueDate || null,
        notes: invoiceForm.notes || null,
        items: lineItems.filter(i => i.description.trim()).map(i => ({
          description: i.description,
          quantity: parseFloat(i.quantity) || 1,
          unitPrice: parseFloat(i.unitPrice) || 0,
        })),
      };
      if (selectedInvoice) {
        const res = await fetch(`/api/invoices/${selectedInvoice.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const updated = await res.json();
          setInvoices(inv => inv.map(i => i.id === updated.id ? updated : i));
          setShowInvoiceDialog(false);
        }
      } else {
        const res = await fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (res.ok) {
          const saved = await res.json();
          setInvoices(inv => [saved, ...inv]);
          setShowInvoiceDialog(false);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteInvoice(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (res.ok) setInvoices(inv => inv.filter(i => i.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  async function deleteExpense(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) setExpenses(exp => exp.filter(e => e.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  function validateExpense() {
    const errs: Record<string, string> = {};
    if (!expenseForm.description.trim()) errs.description = "Description is required.";
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) errs.amount = "Amount must be greater than 0.";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function updateInvoiceStatus(invoice: Invoice, status: string) {
    const body: Record<string, unknown> = { status };
    if (status === "paid") body.paidAt = new Date().toISOString();
    const res = await fetch(`/api/invoices/${invoice.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const updated = await res.json();
      setInvoices(inv => inv.map(i => i.id === updated.id ? updated : i));
    }
  }

  async function saveExpense() {
    if (!currentBusiness || !validateExpense()) return;
    setSaving(true);
    try {
      const body = { ...expenseForm, businessId: currentBusiness.id };
      const res = await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        const saved = await res.json();
        setExpenses(exp => [saved, ...exp]);
        setShowExpenseDialog(false);
        setFormErrors({});
        setExpenseForm({ description: "", amount: "", category: "general", date: new Date().toISOString().split("T")[0], vendor: "", notes: "" });
      }
    } finally {
      setSaving(false);
    }
  }

  const filteredInvoices = invoices.filter(inv => {
    const matchSearch = inv.number.toLowerCase().includes(search.toLowerCase()) || inv.customer?.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || inv.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Metrics
  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const outstanding = invoices.filter(i => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + i.total, 0);
  const overdueAmount = invoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.total, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  // Monthly revenue chart data (last 6 months)
  const monthlyData = (() => {
    const months: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString("en-US", { month: "short" });
      months[key] = 0;
    }
    invoices.filter(i => i.status === "paid" && i.paidAt).forEach(inv => {
      const key = new Date(inv.paidAt!).toLocaleString("en-US", { month: "short" });
      if (key in months) months[key] += inv.total;
    });
    return Object.entries(months).map(([month, revenue]) => ({ month, revenue }));
  })();

  if (!currentBusiness) return <div className="p-6 text-gray-400">No business selected.</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financials</h1>
          <p className="text-gray-500 text-sm mt-0.5">Invoices, expenses, and cash flow</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowExpenseDialog(true)}>
            <Plus className="w-4 h-4" />
            Expense
          </Button>
          <Button onClick={openNewInvoice}>
            <Plus className="w-4 h-4" />
            Invoice
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: formatCurrency(totalRevenue, currentBusiness.currency, true), color: "text-green-600", icon: CheckCircle2 },
          { label: "Outstanding", value: formatCurrency(outstanding, currentBusiness.currency, true), color: "text-blue-600", icon: Clock },
          { label: "Overdue", value: formatCurrency(overdueAmount, currentBusiness.currency, true), color: "text-red-600", icon: AlertCircle },
          { label: "Total Expenses", value: formatCurrency(totalExpenses, currentBusiness.currency, true), color: "text-gray-600", icon: DollarSign },
        ].map(({ label, value, color, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                </div>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader><CardTitle>Revenue — Last 6 Months</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
              <Tooltip formatter={(v) => v != null ? formatCurrency(Number(v), currentBusiness.currency) : ""} />
              <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input className="pl-9" placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {INVOICE_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
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
                    <th className="text-left py-3 px-4 font-semibold text-gray-500">Invoice</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-500">Customer</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-500">Issue Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-500">Due Date</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-500">Status</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-gray-400">No invoices found</td></tr>
                  ) : filteredInvoices.map(inv => {
                    const statusMeta = INVOICE_STATUSES.find(s => s.value === inv.status);
                    return (
                      <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-blue-600">{inv.number}</td>
                        <td className="py-3 px-4 text-gray-700">{inv.customer?.name ?? "—"}</td>
                        <td className="py-3 px-4 text-gray-500">{formatDate(inv.issueDate)}</td>
                        <td className="py-3 px-4 text-gray-500">{inv.dueDate ? formatDate(inv.dueDate) : "—"}</td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">{formatCurrency(inv.total, currentBusiness.currency)}</td>
                        <td className="py-3 px-4">
                          <Badge variant={statusMeta?.color ?? "secondary"} className="flex items-center gap-1 w-fit">
                            {statusIcon(inv.status)}{statusMeta?.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            {inv.status === "draft" && (
                              <Button variant="ghost" size="sm" onClick={() => updateInvoiceStatus(inv, "sent")}>Send</Button>
                            )}
                            {inv.status === "sent" && (
                              <Button variant="ghost" size="sm" className="text-green-600" onClick={() => updateInvoiceStatus(inv, "paid")}>Mark Paid</Button>
                            )}
                            {inv.status === "overdue" && (
                              <Button variant="ghost" size="sm" className="text-green-600" onClick={() => updateInvoiceStatus(inv, "paid")}>Mark Paid</Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => openEditInvoice(inv)}>
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-400 hover:text-red-600"
                              onClick={() => deleteInvoice(inv.id)}
                              disabled={deleting === inv.id}
                            >
                              {deleting === inv.id
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
      </div>

      {/* Expenses List */}
      {expenses.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Expenses</h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 font-semibold text-gray-500">Description</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-500">Category</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-500">Vendor</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-500">Date</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500">Amount</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-900">{exp.description}</td>
                      <td className="py-3 px-4 text-gray-500 capitalize">{exp.category}</td>
                      <td className="py-3 px-4 text-gray-500">{exp.vendor ?? "—"}</td>
                      <td className="py-3 px-4 text-gray-500">{formatDate(exp.date)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">{formatCurrency(exp.amount, currentBusiness.currency)}</td>
                      <td className="py-3 px-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:text-red-600"
                          onClick={() => deleteExpense(exp.id)}
                          disabled={deleting === exp.id}
                        >
                          {deleting === exp.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Invoice Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedInvoice ? `Invoice ${selectedInvoice.number}` : "New Invoice"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Customer</Label>
                <Select value={invoiceForm.customerId} onValueChange={v => setInvoiceForm(f => ({ ...f, customerId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due date</Label>
                <Input type="date" value={invoiceForm.dueDate} onChange={e => setInvoiceForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  Line Items{formErrors.items && <span className="text-red-500 text-xs ml-2">{formErrors.items}</span>}
                </Label>
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
                    <Input className="col-span-6" value={item.description} onChange={e => updateLineItem(idx, "description", e.target.value)} placeholder="Labor, materials, etc." />
                    <Input className="col-span-2" type="number" value={item.quantity} onChange={e => updateLineItem(idx, "quantity", e.target.value)} />
                    <Input className="col-span-3" type="number" value={item.unitPrice} onChange={e => updateLineItem(idx, "unitPrice", e.target.value)} placeholder="0.00" />
                    <Button variant="ghost" size="icon" className="col-span-1 h-8 w-8" onClick={() => removeLineItem(idx)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-2 space-y-1 text-sm text-right">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(invoiceSubtotal, currentBusiness.currency)}</span></div>
                {currentBusiness.taxRate > 0 && (
                  <div className="flex justify-between text-gray-500"><span>Tax ({currentBusiness.taxRate}%)</span><span>{formatCurrency(invoiceTax, currentBusiness.currency)}</span></div>
                )}
                <div className="flex justify-between font-bold text-gray-900"><span>Total</span><span>{formatCurrency(invoiceTotal, currentBusiness.currency)}</span></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={invoiceForm.notes} onChange={e => setInvoiceForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Payment terms, thank you notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceDialog(false)}>Cancel</Button>
            <Button onClick={saveInvoice} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {selectedInvoice ? "Save Changes" : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Description *{formErrors.description && <span className="text-red-500 text-xs ml-2">{formErrors.description}</span>}</Label>
              <Input value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} placeholder="Steel pipe purchase" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount ($) *{formErrors.amount && <span className="text-red-500 text-xs ml-2">{formErrors.amount}</span>}</Label>
                <Input type="number" min="0" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={expenseForm.category} onValueChange={v => setExpenseForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Vendor</Label>
                <Input value={expenseForm.vendor} onChange={e => setExpenseForm(f => ({ ...f, vendor: e.target.value }))} placeholder="Supplier name" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExpenseDialog(false)}>Cancel</Button>
            <Button onClick={saveExpense} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Add Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
