"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type BrandFields = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  primaryColor: string;
  websiteUrl: string;
};

export function SettingsClient({ brand }: { brand: BrandFields }) {
  const [fields, setFields] = useState(brand);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function set(key: keyof BrandFields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSaved(false);

    try {
      const res = await fetch("/api/brand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.name,
          slug: fields.slug,
          logoUrl: fields.logoUrl || null,
          primaryColor: fields.primaryColor,
          configuration: { websiteUrl: fields.websiteUrl },
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to save.");
      } else {
        setSaved(true);
      }
    } catch {
      setError("An unexpected error occurred.");
    }
    setLoading(false);
  }

  return (
    <section className="rounded-2xl bg-white border border-black/[0.06]
                         shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-6">
      <h2 className="text-[13px] font-semibold text-[#111010] mb-5">Brand profile</h2>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3
                        text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Brand name"
            type="text"
            value={fields.name}
            onChange={(e) => set("name", e.target.value)}
            required
          />
          <Input
            label="Slug"
            type="text"
            value={fields.slug}
            onChange={(e) =>
              set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
            }
            required
          />
        </div>

        <Input
          label="Logo URL"
          type="url"
          value={fields.logoUrl}
          onChange={(e) => set("logoUrl", e.target.value)}
          placeholder="https://your-cdn.com/logo.png"
        />

        <Input
          label="Website URL"
          type="url"
          value={fields.websiteUrl}
          onChange={(e) => set("websiteUrl", e.target.value)}
          placeholder="https://yourbrand.com"
        />

        <div className="flex items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-[#6B6965]">Brand colour</label>
            <input
              type="color"
              value={fields.primaryColor}
              onChange={(e) => set("primaryColor", e.target.value)}
              className="h-10 w-20 cursor-pointer rounded-lg border border-black/10 p-0.5"
            />
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-sm text-[#346538] font-medium">Saved.</span>
            )}
            <Button type="submit" loading={loading}>
              Save changes
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}
