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
import {
  Plus,
  Search,
  Briefcase,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  MapPin,
  User,
  Calendar,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

const STATUSES = [
  { value: "scheduled", label: "Scheduled", color: "secondary" as const },
  { value: "in_progress", label: "In Progress", color: "default" as const },
  { value: "complete", label: "Complete", color: "success" as const },
  { value: "invoiced", label: "Invoiced", color: "purple" as const },
  { value: "cancelled", label: "Cancelled", color: "destructive" as const },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

interface Job {
  id: string;
  title: string;
  jobNumber: string | null;
  status: string;
  priority: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  notes: string | null;
  laborCost: number;
  materialCost: number;
  billedAmount: number;
  customer: { id: string; name: string; company?: string | null } | null;
  items: Array<{ id: string; description: string; quantity: number; unitCost: number; total: number; type: string }>;
}

interface Customer {
  id: string;
  name: string;
  company?: string | null;
}

function statusIcon(status: string) {
  switch (status) {
    case "in_progress": return <Clock className="w-3 h-3" />;
    case "complete": case "invoiced": return <CheckCircle2 className="w-3 h-3" />;
    case "cancelled": return <AlertCircle className="w-3 h-3" />;
    default: return <Briefcase className="w-3 h-3" />;
  }
}

function priorityColor(priority: string) {
  return { low: "text-gray-400", normal: "text-blue-500", high: "text-orange-500", urgent: "text-red-500" }[priority] ?? "text-gray-400";
}

export default function JobsPage() {
  const { currentBusiness } = useBusiness();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    customerId: "",
    status: "scheduled",
    priority: "normal",
    startDate: "",
    endDate: "",
    location: "",
    notes: "",
  });

  useEffect(() => {
    if (!currentBusiness) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/jobs?businessId=${currentBusiness.id}`).then(r => r.json()),
      fetch(`/api/customers?businessId=${currentBusiness.id}`).then(r => r.json()),
    ]).then(([j, c]) => {
      setJobs(j);
      setCustomers(c);
    }).finally(() => setLoading(false));
  }, [currentBusiness]);

  function openNew() {
    setForm({ title: "", customerId: "", status: "scheduled", priority: "normal", startDate: "", endDate: "", location: "", notes: "" });
    setSelectedJob(null);
    setShowDialog(true);
  }

  function openEdit(job: Job) {
    setForm({
      title: job.title,
      customerId: job.customer?.id ?? "",
      status: job.status,
      priority: job.priority,
      startDate: job.startDate ? new Date(job.startDate).toISOString().split("T")[0] : "",
      endDate: job.endDate ? new Date(job.endDate).toISOString().split("T")[0] : "",
      location: job.location ?? "",
      notes: job.notes ?? "",
    });
    setSelectedJob(job);
    setShowDialog(true);
  }

  async function handleSave() {
    if (!currentBusiness || !form.title) return;
    setSaving(true);
    try {
      const body = {
        ...form,
        businessId: currentBusiness.id,
        customerId: form.customerId || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };
      let res;
      if (selectedJob) {
        res = await fetch(`/api/jobs/${selectedJob.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      } else {
        res = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      }
      if (res.ok) {
        const saved = await res.json();
        if (selectedJob) {
          setJobs(js => js.map(j => j.id === saved.id ? saved : j));
        } else {
          setJobs(js => [saved, ...js]);
        }
        setShowDialog(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(job: Job, status: string) {
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setJobs(js => js.map(j => j.id === updated.id ? updated : j));
    }
  }

  const filtered = jobs.filter(j => {
    const matchSearch = j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.customer?.name.toLowerCase().includes(search.toLowerCase()) ||
      j.jobNumber?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || j.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Kanban groups
  const kanbanCols = ["scheduled", "in_progress", "complete", "invoiced"];

  const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
    scheduled: { label: "Scheduled", color: "text-blue-600", bg: "bg-blue-50" },
    in_progress: { label: "In Progress", color: "text-orange-600", bg: "bg-orange-50" },
    complete: { label: "Complete", color: "text-green-600", bg: "bg-green-50" },
    invoiced: { label: "Invoiced", color: "text-purple-600", bg: "bg-purple-50" },
  };

  if (!currentBusiness) return <div className="p-6 text-gray-400">No business selected.</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-500 text-sm mt-0.5">{jobs.length} total jobs</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4" />
          New Job
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-9" placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : filterStatus !== "all" ? (
        /* List view when filtering */
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-gray-400">No jobs found</CardContent></Card>
          ) : filtered.map(job => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4 px-5">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${priorityColor(job.priority)}`}>●</span>
                      <p className="font-semibold text-gray-900">{job.title}</p>
                      {job.jobNumber && <span className="text-xs text-gray-400">{job.jobNumber}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      {job.customer && <span className="flex items-center gap-1"><User className="w-3 h-3" />{job.customer.name}</span>}
                      {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
                      {job.startDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(job.startDate)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUSES.find(s => s.value === job.status)?.color ?? "secondary"}>
                      {statusIcon(job.status)}
                      {STATUSES.find(s => s.value === job.status)?.label}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(job)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Kanban view */
        <div className="grid grid-cols-4 gap-4">
          {kanbanCols.map(col => {
            const colJobs = filtered.filter(j => j.status === col);
            const meta = statusMeta[col];
            return (
              <div key={col} className="space-y-3">
                <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${meta.bg}`}>
                  <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                  <span className={`text-xs font-bold ${meta.color} bg-white rounded-full w-5 h-5 flex items-center justify-center`}>
                    {colJobs.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {colJobs.map(job => (
                    <Card key={job.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEdit(job)}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-900 line-clamp-2">{job.title}</p>
                          <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                            job.priority === "urgent" ? "bg-red-500" :
                            job.priority === "high" ? "bg-orange-500" :
                            job.priority === "normal" ? "bg-blue-500" : "bg-gray-300"
                          }`} />
                        </div>
                        {job.customer && (
                          <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                            <User className="w-3 h-3" />{job.customer.name}
                          </p>
                        )}
                        {job.startDate && (
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />{formatDate(job.startDate)}
                          </p>
                        )}
                        {job.location && (
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{job.location}
                          </p>
                        )}
                        {(job.laborCost + job.materialCost) > 0 && (
                          <p className="text-xs font-medium text-gray-600 mt-2">
                            Cost: {formatCurrency(job.laborCost + job.materialCost)}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {colJobs.length === 0 && (
                    <div className="py-6 text-center text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                      No jobs
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Job Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedJob ? `Edit Job — ${selectedJob.jobNumber}` : "New Job"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Job title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Install modular walls — Acme Corp" />
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
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="123 Site Ave, Dallas TX" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start date</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End date</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Any important details..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {selectedJob ? "Save Changes" : "Create Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
