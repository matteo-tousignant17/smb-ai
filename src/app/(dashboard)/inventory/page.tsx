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
import { Plus, Search, Loader2, Package, AlertTriangle, ChevronRight, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const PRODUCT_TYPES = [
  { value: "product", label: "Product" },
  { value: "material", label: "Material/Supply" },
  { value: "service", label: "Service" },
];

const UNITS = ["each", "ft", "sqft", "lbs", "ton", "yard", "linear ft", "gallon", "box", "pallet", "roll", "sheet"];

interface Product {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  type: string;
  unitCost: number;
  unitPrice: number;
  unit: string;
  stockLevel: number;
  minStock: number;
  category: string | null;
  supplier: string | null;
}

export default function InventoryPage() {
  const { currentBusiness } = useBusiness();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [adjustQty, setAdjustQty] = useState("0");
  const [adjustType, setAdjustType] = useState<"add" | "remove">("add");

  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    type: "product",
    unitCost: "",
    unitPrice: "",
    unit: "each",
    stockLevel: "0",
    minStock: "0",
    category: "",
    supplier: "",
  });

  useEffect(() => {
    if (!currentBusiness) return;
    setLoading(true);
    fetch(`/api/products?businessId=${currentBusiness.id}`)
      .then(r => r.json())
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [currentBusiness]);

  function openNew() {
    setForm({ name: "", sku: "", description: "", type: "product", unitCost: "", unitPrice: "", unit: "each", stockLevel: "0", minStock: "0", category: "", supplier: "" });
    setSelectedProduct(null);
    setShowDialog(true);
  }

  function openEdit(product: Product) {
    setForm({
      name: product.name,
      sku: product.sku ?? "",
      description: product.description ?? "",
      type: product.type,
      unitCost: String(product.unitCost),
      unitPrice: String(product.unitPrice),
      unit: product.unit,
      stockLevel: String(product.stockLevel),
      minStock: String(product.minStock),
      category: product.category ?? "",
      supplier: product.supplier ?? "",
    });
    setSelectedProduct(product);
    setShowDialog(true);
  }

  function openAdjust(product: Product) {
    setSelectedProduct(product);
    setAdjustQty("0");
    setAdjustType("add");
    setShowAdjustDialog(true);
  }

  async function handleSave() {
    if (!currentBusiness || !form.name) return;
    setSaving(true);
    try {
      const body = {
        ...form,
        businessId: currentBusiness.id,
        unitCost: parseFloat(form.unitCost) || 0,
        unitPrice: parseFloat(form.unitPrice) || 0,
        stockLevel: parseInt(form.stockLevel) || 0,
        minStock: parseInt(form.minStock) || 0,
        sku: form.sku || null,
        description: form.description || null,
        category: form.category || null,
        supplier: form.supplier || null,
      };
      let res;
      if (selectedProduct) {
        res = await fetch(`/api/products/${selectedProduct.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      } else {
        res = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      }
      if (res.ok) {
        const saved = await res.json();
        if (selectedProduct) {
          setProducts(ps => ps.map(p => p.id === saved.id ? saved : p));
        } else {
          setProducts(ps => [...ps, saved]);
        }
        setShowDialog(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAdjust() {
    if (!selectedProduct) return;
    const qty = parseInt(adjustQty) || 0;
    const newLevel = adjustType === "add" ? selectedProduct.stockLevel + qty : Math.max(0, selectedProduct.stockLevel - qty);
    const res = await fetch(`/api/products/${selectedProduct.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockLevel: newLevel }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProducts(ps => ps.map(p => p.id === updated.id ? updated : p));
      setShowAdjustDialog(false);
    }
  }

  async function deleteProduct(product: Product) {
    if (!confirm("Delete this item?")) return;
    const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    if (res.ok) setProducts(ps => ps.filter(p => p.id !== product.id));
  }

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || p.type === filterType;
    return matchSearch && matchType;
  });

  const lowStockCount = products.filter(p => p.type !== "service" && p.minStock > 0 && p.stockLevel <= p.minStock).length;
  const totalInventoryValue = products.filter(p => p.type !== "service").reduce((s, p) => s + p.stockLevel * p.unitCost, 0);

  if (!currentBusiness) return <div className="p-6 text-gray-400">No business selected.</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 text-sm mt-0.5">{products.length} items</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={lowStockCount > 0 ? "border-yellow-300" : ""}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`w-5 h-5 ${lowStockCount > 0 ? "text-yellow-500" : "text-gray-300"}`} />
              <div>
                <p className="text-sm text-gray-500">Low Stock Alerts</p>
                <p className={`text-2xl font-bold ${lowStockCount > 0 ? "text-yellow-600" : "text-gray-900"}`}>{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">Inventory Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalInventoryValue, currentBusiness.currency, true)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-9" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {PRODUCT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
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
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Item</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">SKU</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Type</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500">Cost</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500">Price</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500">Stock</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400">No items found</td></tr>
                ) : filtered.map(product => {
                  const isLowStock = product.type !== "service" && product.minStock > 0 && product.stockLevel <= product.minStock;
                  return (
                    <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{product.name}</p>
                        {product.supplier && <p className="text-xs text-gray-400">{product.supplier}</p>}
                      </td>
                      <td className="py-3 px-4 text-gray-500">{product.sku ?? "—"}</td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary">{PRODUCT_TYPES.find(t => t.value === product.type)?.label}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(product.unitCost, currentBusiness.currency)}/{product.unit}</td>
                      <td className="py-3 px-4 text-right text-gray-900 font-medium">{formatCurrency(product.unitPrice, currentBusiness.currency)}/{product.unit}</td>
                      <td className="py-3 px-4 text-right">
                        {product.type === "service" ? (
                          <span className="text-gray-400 text-xs">N/A</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            {isLowStock && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
                            <span className={`font-semibold ${isLowStock ? "text-yellow-600" : "text-gray-900"}`}>
                              {product.stockLevel} {product.unit}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          {product.type !== "service" && (
                            <Button variant="ghost" size="icon" onClick={() => openAdjust(product)} title="Adjust stock">
                              <ArrowUp className="w-3 h-3" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteProduct(product)}>
                            <Trash2 className="w-3 h-3 text-red-400" />
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

      {/* Product Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedProduct ? "Edit Item" : "Add Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Steel Pipe 2in" />
              </div>
              <div className="space-y-1.5">
                <Label>SKU</Label>
                <Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="SKU-001" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cost per {form.unit}</Label>
                <Input type="number" value={form.unitCost} onChange={e => setForm(f => ({ ...f, unitCost: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Price per {form.unit}</Label>
                <Input type="number" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            {form.type !== "service" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Current stock</Label>
                  <Input type="number" value={form.stockLevel} onChange={e => setForm(f => ({ ...f, stockLevel: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Minimum stock (reorder at)</Label>
                  <Input type="number" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: e.target.value }))} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Steel, Fencing..." />
              </div>
              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="ABC Supply Co." />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {selectedProduct ? "Save Changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Stock — {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Current: <strong>{selectedProduct?.stockLevel} {selectedProduct?.unit}</strong></p>
            <div className="flex gap-2">
              <Button
                variant={adjustType === "add" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setAdjustType("add")}
              >
                <ArrowUp className="w-4 h-4" />
                Add
              </Button>
              <Button
                variant={adjustType === "remove" ? "destructive" : "outline"}
                className="flex-1"
                onClick={() => setAdjustType("remove")}
              >
                <ArrowDown className="w-4 h-4" />
                Remove
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label>Quantity ({selectedProduct?.unit})</Label>
              <Input type="number" min="0" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} />
            </div>
            <p className="text-sm text-gray-500">
              New level: <strong>{adjustType === "add"
                ? (selectedProduct?.stockLevel ?? 0) + (parseInt(adjustQty) || 0)
                : Math.max(0, (selectedProduct?.stockLevel ?? 0) - (parseInt(adjustQty) || 0))
              } {selectedProduct?.unit}</strong>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustDialog(false)}>Cancel</Button>
            <Button onClick={handleAdjust}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
