"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import type { Product, ProductVariant, StockStatus } from "@/types";

type ProductWithVariants = Product & { variants: ProductVariant[] };

type ProductForm = {
  name: string;
  description: string;
  category: string;
  subcategory: string;
  imageUrl: string;
  externalId: string;
};

const emptyForm: ProductForm = {
  name: "",
  description: "",
  category: "",
  subcategory: "",
  imageUrl: "",
  externalId: "",
};

const stockBadgeVariant = (status: StockStatus) => {
  if (status === "inStock") return "success" as const;
  if (status === "lowStock") return "warning" as const;
  return "danger" as const;
};

export function ProductsClient({ brandId }: { brandId: string }) {
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/products?brandId=${brandId}&search=${encodeURIComponent(search)}`);
    const json = await res.json();
    if (json.success) setProducts(json.data.items);
    setLoading(false);
  }, [brandId, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  }

  function openEdit(p: ProductWithVariants) {
    setEditing(p.id);
    setForm({
      name: p.name,
      description: p.description ?? "",
      category: p.category ?? "",
      subcategory: p.subcategory ?? "",
      imageUrl: p.imageUrl ?? "",
      externalId: p.externalId ?? "",
    });
    setError("");
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const method = editing ? "PUT" : "POST";
    const url = editing ? `/api/products/${editing}` : "/api/products";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, brandId }),
    });
    const json = await res.json();
    setSaving(false);

    if (!json.success) {
      setError(json.error?.message ?? "Save failed");
      return;
    }

    setShowModal(false);
    fetchProducts();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    fetchProducts();
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" />
          Add product
        </Button>
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : products.length === 0 ? (
          <Card className="flex flex-col items-center py-16 text-center">
            <p className="text-gray-500">No products yet.</p>
            <Button onClick={openCreate} size="sm" className="mt-4">
              Add your first product
            </Button>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Product</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Variants</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.imageUrl && (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{p.name}</p>
                          {p.externalId && (
                            <p className="text-xs text-gray-400">ID: {p.externalId}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.category ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{p.variants.length}</td>
                    <td className="px-4 py-3">
                      <Badge variant={p.isActive ? "success" : "default"}>
                        {p.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editing ? "Edit product" : "Add product"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Product name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <Input
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. shirt, pants"
              />
              <Input
                label="Subcategory"
                value={form.subcategory}
                onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Image URL"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="https://…"
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  label="External ID (Shopify, etc.)"
                  value={form.externalId}
                  onChange={(e) => setForm({ ...form, externalId: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} loading={saving}>
                {editing ? "Save changes" : "Add product"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
