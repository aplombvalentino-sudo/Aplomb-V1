"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const ease = [0.16, 1, 0.3, 1] as const;

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
export function AccountPanel({
  initialName,
  email,
  plan,
  memberSince,
  counts,
}: {
  initialName: string;
  email: string;
  plan: string;
  memberSince: string;
  counts: { bodyProfiles: number; recommendationSessions: number; legalAcceptances: number };
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
                  className="text-[12px] font-medium text-[#346538]"
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
        <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#C9653B] mb-4">
          Danger zone
        </h2>
        <div className="rounded-2xl border border-[#C9653B]/30 bg-[#C9653B]/[0.03] p-6">
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
              className="rounded-full border border-[#C9653B]/40 bg-white px-4 py-2 text-[13px] font-medium
                         text-[#C9653B] hover:bg-[#C9653B]/[0.08] hover:border-[#C9653B] transition-all duration-200"
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4"
            onClick={() => !deleting && setShowConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25, ease }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl bg-surface border border-hairline shadow-2xl p-7"
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
                className="mt-5 w-full rounded-xl border border-black/[0.1] bg-white px-4 py-3
                           text-sm text-ink focus:outline-none focus:ring-2 focus:ring-[#C9653B]/20
                           disabled:opacity-50"
              />

              {deleteError && (
                <div className="mt-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-[12px] text-red-700">
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
                  className="rounded-full bg-[#C9653B] px-5 py-2 text-[13px] font-medium text-white
                             hover:bg-[#b85a34] transition-colors duration-200
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
      <dd className={`mt-0.5 text-[14px] font-medium text-ink ${capitalize ? "capitalize" : ""} truncate`}>
        {value}
      </dd>
    </div>
  );
}
