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
import { Plus, Search, Loader2, User, Building2, Phone, Mail, MapPin, ChevronRight, Trash2 } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Customer {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  type: string;
  notes?: string | null;
  _count?: { jobs: number; invoices: number; leads: number };
}

export default function CustomersPage() {
  const { currentBusiness } = useBusiness();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    type: "business",
    notes: "",
  });

  useEffect(() => {
    if (!currentBusiness) return;
    setLoading(true);
    fetch(`/api/customers?businessId=${currentBusiness.id}`)
      .then(r => r.json())
      .then(setCustomers)
      .finally(() => setLoading(false));
  }, [currentBusiness]);

  function openNew() {
    setForm({ name: "", company: "", email: "", phone: "", address: "", city: "", state: "", zip: "", type: "business", notes: "" });
    setSelectedCustomer(null);
    setShowDialog(true);
  }

  function openEdit(customer: Customer) {
    setForm({
      name: customer.name,
      company: customer.company ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      address: customer.address ?? "",
      city: customer.city ?? "",
      state: customer.state ?? "",
      zip: "",
      type: customer.type,
      notes: customer.notes ?? "",
    });
    setSelectedCustomer(customer);
    setShowDialog(true);
  }

  async function handleSave() {
    if (!currentBusiness || !form.name) return;
    setSaving(true);
    try {
      const body = { ...form, businessId: currentBusiness.id };
      let res;
      if (selectedCustomer) {
        res = await fetch(`/api/customers/${selectedCustomer.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      } else {
        res = await fetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      }
      if (res.ok) {
        const saved = await res.json();
        if (selectedCustomer) {
          setCustomers(cs => cs.map(c => c.id === saved.id ? { ...saved, _count: selectedCustomer._count } : c));
        } else {
          setCustomers(cs => [...cs, saved]);
        }
        setShowDialog(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(customer: Customer) {
    if (!confirm("Delete this customer? Their jobs and invoices will remain.")) return;
    const res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" });
    if (res.ok) setCustomers(cs => cs.filter(c => c.id !== customer.id));
  }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (!currentBusiness) return <div className="p-6 text-gray-400">No business selected.</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm mt-0.5">{customers.length} customers</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4" />
          Add Customer
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input className="pl-9" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-400">
          {search ? "No customers match your search" : "No customers yet. Add your first customer."}
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(customer => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEdit(customer)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                      {getInitials(customer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 truncate">{customer.name}</p>
                      <Badge variant={customer.type === "business" ? "default" : "secondary"} className="text-xs flex-shrink-0">
                        {customer.type === "business" ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      </Badge>
                    </div>
                    {customer.company && <p className="text-sm text-gray-500 truncate">{customer.company}</p>}
                    {customer.email && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 flex-shrink-0" />{customer.email}
                      </p>
                    )}
                    {customer.phone && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Phone className="w-3 h-3 flex-shrink-0" />{customer.phone}
                      </p>
                    )}
                    {(customer.city || customer.state) && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />{[customer.city, customer.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {customer._count && (
                      <div className="flex gap-3 mt-2 text-xs text-gray-400">
                        <span>{customer._count.jobs} jobs</span>
                        <span>{customer._count.invoices} invoices</span>
                        <span>{customer._count.leads} leads</span>
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="flex-shrink-0 -mr-1" onClick={e => { e.stopPropagation(); deleteCustomer(customer); }}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedCustomer ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Smith" />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Acme Corp" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@acme.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 123-4567" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 space-y-1.5">
                <Label>City</Label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Dallas" />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="TX" maxLength={2} />
              </div>
              <div className="space-y-1.5">
                <Label>ZIP</Label>
                <Input value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} placeholder="75001" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Special payment terms, preferences..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {selectedCustomer ? "Save Changes" : "Add Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
