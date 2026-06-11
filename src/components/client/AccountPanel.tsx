"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "motion/react";
import { transition } from "@/lib/motion";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

/**
 * Client-side controls for the user's GDPR rights:
 *   - Rectification (Art 16): edit name
 *   - Access + Portability (Art 15 + 20): export JSON
 *   - Erasure (Art 17): delete account
 *
 * Deletion requires the user to type "DELETE" verbatim — this is intentional
 * friction to prevent accidental account loss. After successful deletion,
 * NextAuth signOut runs and the user is sent to /.
 */
type FitInsights = {
  scannedAt: string;
  mode: "easy" | "advanced";
  brandName: string;
  brandSlug: string;
  shapeSummary: string | null;
  measurements: {
    height: number | null;
    weight: number | null;
    chest: number | null;
    waist: number | null;
    hips: number | null;
    shoulders: number | null;
    inseam: number | null;
  };
};

export function AccountPanel({
  initialName,
  email,
  plan,
  memberSince,
  counts,
  fitInsights,
}: {
  initialName: string;
  email: string;
  plan: string;
  memberSince: string;
  counts: { bodyProfiles: number; recommendationSessions: number; legalAcceptances: number };
  /** Latest body profile + measurements. Null when the user has never scanned. */
  fitInsights: FitInsights | null;
}) {
  const router = useRouter();

  // ── Profile (name) ──────────────────────────────────────────────────────
  const [name, setName] = useState(initialName);
  const [savingName, setSavingName] = useState(false);
  const [savedName, setSavedName] = useState(false);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setSavedName(false);
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setSavedName(true);
        setTimeout(() => setSavedName(false), 2500);
        router.refresh();
      }
    } finally {
      setSavingName(false);
    }
  }

  // ── Export ──────────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      // Browser handles the download via Content-Disposition; we just need
      // to navigate. Using an anchor avoids leaking the response into memory.
      window.location.href = "/api/user/me/export";
    } finally {
      // Reset after a tick so the spinner doesn't get stuck if the click
      // navigated; in practice the browser unloads our JS first.
      setTimeout(() => setExporting(false), 1500);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/user/me", { method: "DELETE" });
      const json = await res.json();
      if (!json.success) {
        setDeleteError(json.error?.message ?? "Deletion failed.");
        setDeleting(false);
        return;
      }
      // Account is gone — sign out the client (clears the NextAuth JWT cookie)
      // and send the user to the public home page.
      await signOut({ redirect: false });
      router.push("/?deleted=1");
    } catch {
      setDeleteError("Unexpected error. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <div className="mt-10 space-y-10">
      {/* ── Account stats ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-subtle mb-4">
          Your data on file
        </h2>
        <div className="rounded-2xl border border-hairline bg-surface p-6">
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-[13px]">
            <Row label="Email" value={email} />
            <Row label="Plan" value={plan} capitalize />
            <Row label="Member since" value={new Date(memberSince).toLocaleDateString("en-GB")} />
            <Row label="Body scans" value={String(counts.bodyProfiles)} />
            <Row label="Sessions" value={String(counts.recommendationSessions)} />
            <Row label="Legal proofs" value={String(counts.legalAcceptances)} />
          </dl>
        </div>
      </section>

      {/* ── Fit insights (optional, sizing-as-secondary) ──────────────── */}
      <FitInsightsSection insights={fitInsights} />

      {/* ── Update name (Art 16 — rectification) ──────────────────────── */}
      <section>
        <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-subtle mb-4">
          Update profile
        </h2>
        <form onSubmit={handleSaveName} className="rounded-2xl border border-hairline bg-surface p-6">
          <Input
            label="Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={120}
          />
          <p className="mt-2 text-[12px] text-ink-subtle">
            To change your email, please contact privacy@aplomb (re-verification required).
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Button type="submit" loading={savingName} disabled={!name || name === initialName}>
              Save
            </Button>
            <AnimatePresence>
              {savedName && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[12px] font-medium text-[#346538] dark:text-emerald-300"
                >
                  Saved
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </form>
      </section>

      {/* ── Export (Art 15 + 20 — access + portability) ───────────────── */}
      <section>
        <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-subtle mb-4">
          Export your data
        </h2>
        <div className="rounded-2xl border border-hairline bg-surface p-6">
          <p className="text-[13px] text-ink-muted leading-relaxed">
            Download a JSON file with all personal data we hold about you — profile,
            consent proofs, measurements, recommendation sessions, outfits, and
            brand memberships. Photos themselves are not included (they remain in our
            private bucket and are erased by &ldquo;Delete account&rdquo; below).
          </p>
          <div className="mt-4">
            <Button onClick={handleExport} loading={exporting} variant="secondary">
              Download my data (.json)
            </Button>
          </div>
        </div>
      </section>

      {/* ── Delete (Art 17 — erasure) ─────────────────────────────────── */}
      <section>
        <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent mb-4">
          Danger zone
        </h2>
        <div className="rounded-2xl border border-accent/30 bg-accent/[0.03] p-6">
          <p className="text-[13px] text-ink leading-relaxed font-medium">
            Delete account permanently
          </p>
          <p className="mt-1 text-[12px] text-ink-muted leading-relaxed">
            This will erase your profile, all your body scans (photos and derived
            measurements), all recommendation sessions and outfits, and your
            authentication record. <strong>This cannot be undone.</strong>
          </p>
          <div className="mt-4">
            <button
              onClick={() => setShowConfirm(true)}
              className="rounded-full border border-accent/40 bg-surface px-4 py-2 text-[13px] font-medium
                         text-accent hover:bg-accent/[0.08] hover:border-accent transition-all duration-200"
            >
              Delete my account…
            </button>
          </div>
        </div>
      </section>

      {/* ── Confirmation modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/60 backdrop-blur-sm p-4"
            onClick={() => !deleting && setShowConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={transition.base}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl bg-surface border border-hairline shadow-float p-7"
            >
              <h3 className="font-serif text-[1.6rem] font-medium tracking-[-0.02em] text-ink">
                Confirm deletion
              </h3>
              <p className="mt-2 text-[13px] text-ink-muted leading-relaxed">
                Type <code className="px-1 py-0.5 rounded bg-ink/[0.06] text-[12px] font-medium text-ink">DELETE</code> below
                to permanently erase your account, all body scans, and all
                generated outfits.
              </p>

              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoFocus
                disabled={deleting}
                className="mt-5 w-full rounded-xl border border-ink/[0.1] bg-surface px-4 py-3
                           text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/20
                           disabled:opacity-50"
              />

              {deleteError && (
                <div className="mt-3 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-[12px] text-red-700 dark:text-red-300">
                  {deleteError}
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={deleting}
                  className="rounded-full px-4 py-2 text-[13px] font-medium text-ink-muted
                             hover:bg-ink/5 transition-colors duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={confirmText !== "DELETE" || deleting}
                  className="rounded-full bg-accent px-5 py-2 text-[13px] font-medium text-white
                             hover:bg-accent-deep transition-colors duration-200
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleting ? "Erasing…" : "Erase everything"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-subtle">{label}</dt>
      <dd className={`mt-0.5 text-[14px] font-medium text-ink nums ${capitalize ? "capitalize" : ""} truncate`}>
        {value}
      </dd>
    </div>
  );
}

// ─── Fit insights (sizing as secondary — appears only AFTER wardrobe value) ──

function FitInsightsSection({ insights }: { insights: FitInsights | null }) {
  return (
    <section>
      <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-subtle mb-4">
        Fit insights
        <span className="ml-2 text-ink-subtle/60 normal-case font-normal lowercase tracking-normal">
          (optional)
        </span>
      </h2>

      {insights ? (
        <div className="rounded-2xl border border-hairline bg-surface p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-ink-subtle">
                Last scan
              </p>
              <p className="mt-0.5 text-[14px] font-medium text-ink">
                {formatRelative(insights.scannedAt)}
                <span className="ml-2 text-[11px] text-ink-subtle font-normal capitalize">
                  · {insights.mode} mode · {insights.brandName}
                </span>
              </p>
            </div>
            <a
              href={`/app/${insights.brandSlug}`}
              className="rounded-full border border-hairline-strong bg-surface px-4 py-1.5 text-[12px] font-medium
                         text-ink hover:bg-surface-raised transition-colors duration-200"
            >
              Run a new scan
            </a>
          </div>

          {/* Measurement grid — only show fields that have a number */}
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-4">
            {(
              [
                ["Height", insights.measurements.height, "cm"],
                ["Weight", insights.measurements.weight, "kg"],
                ["Chest", insights.measurements.chest, "cm"],
                ["Waist", insights.measurements.waist, "cm"],
                ["Hips", insights.measurements.hips, "cm"],
                ["Shoulders", insights.measurements.shoulders, "cm"],
                ["Inseam", insights.measurements.inseam, "cm"],
              ] as const
            )
              .filter(([, v]) => typeof v === "number")
              .map(([label, v, unit]) => (
                <div key={label}>
                  <dt className="text-[10px] uppercase tracking-[0.1em] text-ink-subtle">
                    {label}
                  </dt>
                  <dd className="mt-0.5 font-serif text-[1.3rem] font-medium text-ink leading-none tabular-nums">
                    {Math.round(v as number)}
                    <span className="ml-1 text-[11px] font-normal text-ink-subtle">{unit}</span>
                  </dd>
                </div>
              ))}
          </dl>

          {insights.shapeSummary && (
            <p className="mt-5 text-[12px] text-ink-muted leading-[1.55]">
              {insights.shapeSummary}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-hairline bg-surface p-6 text-center">
          <p className="text-[13px] text-ink-muted leading-relaxed max-w-[44ch] mx-auto">
            No body scan yet. Optional — start one through any brand in
            <a href="/app/discover" className="text-ink underline underline-offset-2 ml-1">
              Discover
            </a>{" "}
            to get personalized size recommendations.
          </p>
        </div>
      )}
    </section>
  );
}

/** Best-effort "X ago" formatter — keeps the section visually quiet. */
function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(ms / 60_000);
  const hours = Math.round(ms / 3_600_000);
  const days = Math.round(ms / 86_400_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB");
}
