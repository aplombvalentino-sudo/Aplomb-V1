"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import type { SizeChart } from "@/types";

type SizeChartForm = {
  category: string;
  gender: string;
  chartJson: string;
};

const emptyForm: SizeChartForm = {
  category: "",
  gender: "",
  chartJson: JSON.stringify(
    {
      headers: ["Size", "Chest (cm)", "Waist (cm)", "Hips (cm)"],
      rows: [
        { sizeLabel: "XS", measurements: { chest: 82, waist: 66, hips: 88 } },
        { sizeLabel: "S", measurements: { chest: 86, waist: 70, hips: 92 } },
        { sizeLabel: "M", measurements: { chest: 90, waist: 74, hips: 96 } },
        { sizeLabel: "L", measurements: { chest: 96, waist: 80, hips: 102 } },
        { sizeLabel: "XL", measurements: { chest: 102, waist: 86, hips: 108 } },
      ],
    },
    null,
    2
  ),
};

export function SizeChartsClient({ brandId }: { brandId: string }) {
  const [charts, setCharts] = useState<SizeChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<SizeChartForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [jsonError, setJsonError] = useState("");

  const fetchCharts = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/size-charts?brandId=${brandId}`);
    const json = await res.json();
    if (json.success) setCharts(json.data.items);
    setLoading(false);
  }, [brandId]);

  useEffect(() => {
    fetchCharts();
  }, [fetchCharts]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setJsonError("");
    setShowModal(true);
  }

  function openEdit(c: SizeChart) {
    setEditing(c.id);
    setForm({
      category: c.category,
      gender: c.gender ?? "",
      chartJson: JSON.stringify(c.chartJson, null, 2),
    });
    setError("");
    setJsonError("");
    setShowModal(true);
  }

  function validateJson(val: string) {
    try {
      JSON.parse(val);
      setJsonError("");
      return true;
    } catch {
      setJsonError("Invalid JSON");
      return false;
    }
  }

  async function handleSave() {
    if (!validateJson(form.chartJson)) return;
    setSaving(true);
    setError("");

    const method = editing ? "PUT" : "POST";
    const url = editing ? `/api/size-charts/${editing}` : "/api/size-charts";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandId,
        category: form.category,
        gender: form.gender || null,
        chartJson: JSON.parse(form.chartJson),
      }),
    });
    const json = await res.json();
    setSaving(false);

    if (!json.success) {
      setError(json.error?.message ?? "Save failed");
      return;
    }

    setShowModal(false);
    fetchCharts();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this size chart?")) return;
    await fetch(`/api/size-charts/${id}`, { method: "DELETE" });
    fetchCharts();
  }

  return (
    <div className="mt-6">
      <div className="flex">
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" />
          Add size chart
        </Button>
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : charts.length === 0 ? (
          <Card className="flex flex-col items-center py-16 text-center">
            <p className="text-gray-500">No size charts yet.</p>
            <Button onClick={openCreate} size="sm" className="mt-4">
              Create your first size chart
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {charts.map((c) => (
              <Card key={c.id} className="relative">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{c.category}</p>
                    {c.gender && (
                      <p className="text-sm text-gray-500 capitalize">{c.gender}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(c)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Updated {new Date(c.updatedAt).toLocaleDateString()}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editing ? "Edit size chart" : "Add size chart"}
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
              <Input
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Tshirt, Jeans, Dress"
                required
              />
              <Input
                label="Gender (optional)"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                placeholder="male, female, unisex"
              />
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Chart JSON
                </label>
                <textarea
                  value={form.chartJson}
                  onChange={(e) => {
                    setForm({ ...form, chartJson: e.target.value });
                    validateJson(e.target.value);
                  }}
                  rows={12}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
                {jsonError && <p className="mt-1 text-xs text-red-600">{jsonError}</p>}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} loading={saving}>
                {editing ? "Save changes" : "Create chart"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
