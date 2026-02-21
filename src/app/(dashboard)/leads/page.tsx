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
import { Plus, Search, Loader2, User, DollarSign, TrendingUp, ChevronRight, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const STAGES = [
  { value: "new", label: "New", color: "secondary" as const, bg: "bg-gray-50", text: "text-gray-600" },
  { value: "contacted", label: "Contacted", color: "default" as const, bg: "bg-blue-50", text: "text-blue-600" },
  { value: "quoted", label: "Quoted", color: "warning" as const, bg: "bg-yellow-50", text: "text-yellow-600" },
  { value: "negotiating", label: "Negotiating", color: "orange" as const, bg: "bg-orange-50", text: "text-orange-600" },
  { value: "won", label: "Won", color: "success" as const, bg: "bg-green-50", text: "text-green-600" },
  { value: "lost", label: "Lost", color: "destructive" as const, bg: "bg-red-50", text: "text-red-600" },
];

const SOURCES = ["Referral", "Website", "Cold Call", "Trade Show", "Repeat Customer", "Other"];

interface Lead {
  id: string;
  title: string;
  stage: string;
  value: number | null;
  source: string | null;
  probability: number;
  notes: string | null;
  followUpAt: string | null;
  customer: { id: string; name: string; company?: string | null } | null;
}

interface Customer {
  id: string;
  name: string;
  company?: string | null;
}

export default function LeadsPage() {
  const { currentBusiness } = useBusiness();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState("pipeline");

  const [form, setForm] = useState({
    title: "",
    customerId: "",
    value: "",
    source: "",
    stage: "new",
    probability: "50",
    notes: "",
    followUpAt: "",
  });

  useEffect(() => {
    if (!currentBusiness) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/leads?businessId=${currentBusiness.id}`).then(r => r.json()),
      fetch(`/api/customers?businessId=${currentBusiness.id}`).then(r => r.json()),
    ]).then(([l, c]) => {
      setLeads(l);
      setCustomers(c);
    }).finally(() => setLoading(false));
  }, [currentBusiness]);

  function openNew() {
    setForm({ title: "", customerId: "", value: "", source: "", stage: "new", probability: "50", notes: "", followUpAt: "" });
    setSelectedLead(null);
    setShowDialog(true);
  }

  function openEdit(lead: Lead) {
    setForm({
      title: lead.title,
      customerId: lead.customer?.id ?? "",
      value: lead.value ? String(lead.value) : "",
      source: lead.source ?? "",
      stage: lead.stage,
      probability: String(lead.probability),
      notes: lead.notes ?? "",
      followUpAt: lead.followUpAt ? new Date(lead.followUpAt).toISOString().split("T")[0] : "",
    });
    setSelectedLead(lead);
    setShowDialog(true);
  }

  async function handleSave() {
    if (!currentBusiness || !form.title) return;
    setSaving(true);
    try {
      const body = {
        businessId: currentBusiness.id,
        title: form.title,
        customerId: form.customerId || null,
        value: form.value ? parseFloat(form.value) : null,
        source: form.source || null,
        stage: form.stage,
        probability: parseInt(form.probability),
        notes: form.notes || null,
        followUpAt: form.followUpAt || null,
      };
      let res;
      if (selectedLead) {
        res = await fetch(`/api/leads/${selectedLead.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      } else {
        res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      }
      if (res.ok) {
        const saved = await res.json();
        if (selectedLead) {
          setLeads(ls => ls.map(l => l.id === saved.id ? saved : l));
        } else {
          setLeads(ls => [saved, ...ls]);
        }
        setShowDialog(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function moveStage(lead: Lead, stage: string) {
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (res.ok) {
      const updated = await res.json();
      setLeads(ls => ls.map(l => l.id === updated.id ? updated : l));
    }
  }

  async function deleteLead(lead: Lead) {
    if (!confirm("Delete this lead?")) return;
    const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
    if (res.ok) setLeads(ls => ls.filter(l => l.id !== lead.id));
  }

  const filtered = leads.filter(l =>
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.customer?.name.toLowerCase().includes(search.toLowerCase())
  );

  const pipelineStages = STAGES.filter(s => !["won", "lost"].includes(s.value));
  const totalPipelineValue = filtered
    .filter(l => !["won", "lost"].includes(l.stage))
    .reduce((s, l) => s + (l.value ?? 0), 0);

  const wonValue = leads.filter(l => l.stage === "won").reduce((s, l) => s + (l.value ?? 0), 0);
  const winRate = leads.length > 0
    ? Math.round((leads.filter(l => l.stage === "won").length / leads.filter(l => ["won", "lost"].includes(l.stage)).length || 0) * 100)
    : 0;

  if (!currentBusiness) return <div className="p-6 text-gray-400">No business selected.</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-gray-500 text-sm mt-0.5">{leads.filter(l => !["won","lost"].includes(l.stage)).length} active leads</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4" />
          New Lead
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-gray-500">Pipeline Value</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalPipelineValue, currentBusiness.currency, true)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-gray-500">Won (All Time)</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(wonValue, currentBusiness.currency, true)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-gray-500">Win Rate</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{winRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-9" placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Tabs value={activeView} onValueChange={setActiveView}>
          <TabsList>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : activeView === "pipeline" ? (
        /* Kanban Pipeline */
        <div className="grid grid-cols-4 gap-4">
          {pipelineStages.map(stage => {
            const stageLeads = filtered.filter(l => l.stage === stage.value);
            const stageValue = stageLeads.reduce((s, l) => s + (l.value ?? 0), 0);
            return (
              <div key={stage.value} className="space-y-3">
                <div className={`${stage.bg} rounded-lg px-3 py-2`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${stage.text}`}>{stage.label}</span>
                    <span className={`text-xs font-bold ${stage.text} bg-white rounded-full w-5 h-5 flex items-center justify-center`}>
                      {stageLeads.length}
                    </span>
                  </div>
                  {stageValue > 0 && (
                    <p className={`text-xs ${stage.text} mt-0.5 font-medium`}>{formatCurrency(stageValue, currentBusiness.currency, true)}</p>
                  )}
                </div>
                <div className="space-y-2">
                  {stageLeads.map(lead => (
                    <Card key={lead.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEdit(lead)}>
                      <CardContent className="p-3">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-2">{lead.title}</p>
                        {lead.customer && (
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <User className="w-3 h-3" />{lead.customer.name}
                          </p>
                        )}
                        {lead.value && (
                          <p className="text-xs font-medium text-gray-600 mt-1 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />{formatCurrency(lead.value, currentBusiness.currency)}
                          </p>
                        )}
                        {lead.source && <p className="text-xs text-gray-400 mt-0.5">{lead.source}</p>}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">{lead.probability}%</span>
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${lead.probability}%` }} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="py-8 text-center text-xs text-gray-300 border-2 border-dashed border-gray-100 rounded-lg">No leads</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-gray-400">No leads found</CardContent></Card>
          ) : filtered.map(lead => {
            const stage = STAGES.find(s => s.value === lead.stage);
            return (
              <Card key={lead.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4 px-5">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{lead.title}</p>
                        <Badge variant={stage?.color ?? "secondary"}>{stage?.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {lead.customer && <span>{lead.customer.name}</span>}
                        {lead.source && <span>{lead.source}</span>}
                        {lead.followUpAt && <span>Follow-up: {formatDate(lead.followUpAt)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {lead.value && <span className="text-sm font-semibold text-gray-700">{formatCurrency(lead.value, currentBusiness.currency)}</span>}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(lead)}><ChevronRight className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteLead(lead)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Lead Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedLead ? "Edit Lead" : "New Lead"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Lead title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Fencing install — 123 Main St" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Customer</Label>
                <Select value={form.customerId} onValueChange={v => setForm(f => ({ ...f, customerId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Estimated value ($)</Label>
                <Input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="5000" />
              </div>
              <div className="space-y-1.5">
                <Label>Probability (%)</Label>
                <Input type="number" min="0" max="100" value={form.probability} onChange={e => setForm(f => ({ ...f, probability: e.target.value }))} placeholder="50" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                  <SelectTrigger><SelectValue placeholder="How did they find you?" /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Follow-up date</Label>
                <Input type="date" value={form.followUpAt} onChange={e => setForm(f => ({ ...f, followUpAt: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Client wants pricing for modular walls..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            {selectedLead && (
              <Button variant="destructive" onClick={() => deleteLead(selectedLead)}>Delete</Button>
            )}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {selectedLead ? "Save Changes" : "Create Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
