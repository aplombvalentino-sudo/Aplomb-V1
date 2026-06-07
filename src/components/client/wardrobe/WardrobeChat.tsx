"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const ease = [0.16, 1, 0.3, 1] as const;

// ─── Types (mirror server) ─────────────────────────────────────────────────

type ChatMessage = {
  id: string;
  role: string; // "user" | "assistant"
  content: string;
  recommendedItemIds: string[];
  createdAt: string;
};

type WardrobePiece = {
  id: string;
  type: string | null;
  category: string;
  color: string | null;
  brand: string | null;
  nickname: string | null;
  thumbUrl: string | null;
};

// ─── Top-level chat surface ────────────────────────────────────────────────

type Usage = {
  recsUsed: number;
  /** null = unlimited (Model plan). */
  recsLimit: number | null;
  /** Server-computed gate — when false the composer is hard-disabled. */
  canAsk: boolean;
};

export function WardrobeChat({
  wardrobe,
  initialMessages,
  plan,
  crossBrandEnabled,
  usage: initialUsage,
}: {
  wardrobe: WardrobePiece[];
  initialMessages: ChatMessage[];
  plan: "essential" | "fashion" | "model";
  crossBrandEnabled: boolean;
  usage: Usage;
}) {
  // Usage is server-derived but mutates as the user sends messages —
  // track it locally so the badge updates without a route refresh.
  const [usage, setUsage] = useState<Usage>(initialUsage);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // O(1) lookup for chip thumbs.
  const wardrobeById = new Map(wardrobe.map((w) => [w.id, w]));

  // Auto-scroll on new message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, submitting]);

  async function handleSend(content: string) {
    if (!content.trim() || submitting) return;
    if (!usage.canAsk) {
      // Defence in depth — server also refuses with 402, but this saves
      // the round-trip when we know the cap is hit.
      setError(monthlyLimitMessage(plan, usage.recsLimit));
      return;
    }
    setError(null);
    setSubmitting(true);

    // Optimistic user message — drop in immediately so the input feels
    // snappy. We'll reconcile id once the server replies.
    const optimisticUser: ChatMessage = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: content.trim(),
      recommendedItemIds: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimisticUser]);
    setInput("");

    try {
      const res = await fetch("/api/wardrobe/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        // Roll back the optimistic message and surface the error.
        setMessages((m) => m.filter((x) => x.id !== optimisticUser.id));
        setError(json.error?.message ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      // Replace the optimistic id if the server returned one. Combine
      // wardrobe ids + brand product ids into one array using the same
      // `brand:` prefix convention the server uses for persisted history
      // — the bubble component splits them again at render time.
      const serverUserId: string | undefined = json.data.userMessageId;
      const wardrobeIds: string[] = json.data.recommendedItemIds ?? [];
      const brandIds: string[] = json.data.recommendedBrandProductIds ?? [];
      const assistantReply: ChatMessage = {
        id: `srv-${Date.now()}`,
        role: "assistant",
        content: json.data.reply,
        recommendedItemIds: [
          ...wardrobeIds,
          ...brandIds.map((id) => `brand:${id}`),
        ],
        createdAt: new Date().toISOString(),
      };

      setMessages((m) =>
        m
          .map((x) =>
            x.id === optimisticUser.id && serverUserId
              ? { ...x, id: serverUserId }
              : x,
          )
          .concat(assistantReply),
      );

      // Bump local usage counter so the badge stays accurate without a
      // page refresh.
      setUsage((u) => ({
        ...u,
        recsUsed: u.recsUsed + 1,
        canAsk:
          u.recsLimit === null ? true : u.recsUsed + 1 < u.recsLimit,
      }));
    } catch {
      setMessages((m) => m.filter((x) => x.id !== optimisticUser.id));
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header — copy + plan badge differ by tier so Model users see
          the cross-brand promise; Fashion users see the wardrobe-only
          framing. Pulls the brief's recommended UX verbatim. */}
      <div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
            AI Outfit Assistant
          </p>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${
              crossBrandEnabled
                ? "bg-accent text-white"
                : "bg-ink/[0.06] text-ink"
            }`}
          >
            {crossBrandEnabled ? "Model · Cross-brand" : "Fashion · Wardrobe-only"}
          </span>
        </div>
        <h1 className="mt-2 font-serif text-[clamp(2rem,4vw,2.6rem)] font-medium leading-[1.05] tracking-[-0.02em] text-ink">
          Ask your <em className="italic">wardrobe</em>
          <span className="text-accent">.</span>
        </h1>
        <p className="mt-2 text-[13px] text-ink-muted max-w-[58ch]">
          {crossBrandEnabled
            ? `Your AI assistant can recommend from your ${wardrobe.length} saved ${wardrobe.length === 1 ? "piece" : "pieces"} AND across every active brand on Aplomb — surfacing best matches you don't own yet.`
            : `Your AI assistant recommends outfits from your ${wardrobe.length} saved ${wardrobe.length === 1 ? "piece" : "pieces"}. Upgrade to Model to also discover best matches from every brand on Aplomb.`}
        </p>
      </div>

      {/* Conversation */}
      <div
        ref={scrollRef}
        className="rounded-2xl border border-hairline bg-surface p-5 space-y-5 min-h-[40vh] max-h-[60vh] overflow-y-auto"
      >
        {messages.length === 0 ? (
          <EmptyState
            onSuggest={(prompt) => handleSend(prompt)}
            hasWardrobe={wardrobe.length > 0}
          />
        ) : (
          messages.map((m) => (
            <Bubble
              key={m.id}
              message={m}
              wardrobeById={wardrobeById}
            />
          ))
        )}

        {submitting && <ThinkingBubble />}
      </div>

      {/* Composer — also disabled when monthly cap is hit. */}
      <Composer
        value={input}
        onChange={setInput}
        onSubmit={() => handleSend(input)}
        submitting={submitting}
        disabled={wardrobe.length === 0 || !usage.canAsk}
      />

      {error && (
        <p className="text-[12px] text-red-700 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
          {error}
        </p>
      )}

      {/* Monthly usage badge — Model (no cap) shows "Unlimited"; Fashion
          shows "X / Y this month" so the user always knows where they stand
          before hitting the gate. */}
      <p className="text-[11px] text-ink-subtle text-right">
        {usage.recsLimit === null
          ? "Unlimited recommendations this month"
          : `${usage.recsUsed} / ${usage.recsLimit} AI recommendations this month`}
      </p>
    </div>
  );
}

/** Short upgrade-prompting message for the monthly recommendation cap. */
function monthlyLimitMessage(
  plan: "essential" | "fashion" | "model",
  limit: number | null,
): string {
  if (plan === "fashion") {
    return `You've used all ${limit ?? "?"} AI outfit recommendations included in Fashion this month. Upgrade to Model for unlimited recommendations and cross-brand matches.`;
  }
  return `You've used your assistant recommendations for this month. Upgrade for more.`;
}

// ─── Pieces ────────────────────────────────────────────────────────────────

function Bubble({
  message,
  wardrobeById,
}: {
  message: ChatMessage;
  wardrobeById: Map<string, WardrobePiece>;
}) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
          isUser
            ? "bg-ink text-white"
            : "bg-white text-ink border border-hairline"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {!isUser && message.recommendedItemIds.length > 0 && (
          <RecommendedItemsStrip
            ids={message.recommendedItemIds}
            wardrobeById={wardrobeById}
          />
        )}
      </div>
    </motion.div>
  );
}

function RecommendedItemsStrip({
  ids,
  wardrobeById,
}: {
  ids: string[];
  wardrobeById: Map<string, WardrobePiece>;
}) {
  // Split ids into two buckets:
  //   - wardrobe ids (raw cuid, resolvable via wardrobeById)
  //   - brand product ids (prefixed `brand:` by the server to disambiguate
  //     them from wardrobe items in the same column). We render those as
  //     a separate "Suggested from brands" group below the wardrobe row
  //     so the user immediately sees Model's added value.
  const wardrobeItems: WardrobePiece[] = [];
  const brandIds: string[] = [];
  for (const id of ids) {
    if (id.startsWith("brand:")) {
      brandIds.push(id.slice("brand:".length));
      continue;
    }
    const w = wardrobeById.get(id);
    if (w) wardrobeItems.push(w);
  }

  if (wardrobeItems.length === 0 && brandIds.length === 0) return null;

  return (
    <div className="mt-3 space-y-2.5">
      {wardrobeItems.length > 0 && (
        <ChipGroup label="From your wardrobe">
          {wardrobeItems.map((it) => (
            <WardrobeChip key={it.id} item={it} />
          ))}
        </ChipGroup>
      )}
      {brandIds.length > 0 && (
        <ChipGroup label="Suggested from brands">
          {brandIds.map((id) => (
            <BrandChip key={id} productId={id} />
          ))}
        </ChipGroup>
      )}
    </div>
  );
}

function ChipGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-subtle mb-1.5">
        {label}
      </p>
      <div className="-mx-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function WardrobeChip({ item: it }: { item: WardrobePiece }) {
  return (
    <Link
      href="/app/wardrobe"
      className="group flex items-center gap-2 rounded-xl border border-hairline bg-surface px-2 py-1.5
                 hover:border-ink/30 transition-colors"
    >
      <div className="relative h-10 w-10 rounded-md overflow-hidden bg-[#F6F3EE] ring-1 ring-black/[0.06] shrink-0">
        {it.thumbUrl ? (
          <Image
            src={it.thumbUrl}
            alt={it.nickname ?? it.type ?? it.category}
            fill
            sizes="40px"
            className="object-cover"
          />
        ) : (
          <span
            className="absolute inset-0 flex items-center justify-center text-[8px]
                       uppercase tracking-[0.08em] text-ink-subtle"
          >
            {it.category}
          </span>
        )}
      </div>
      <div className="min-w-0 pr-1">
        <p className="text-[11px] font-medium text-ink truncate max-w-[140px]">
          {it.nickname ?? it.type ?? titleCase(it.category)}
        </p>
        <p className="text-[9px] text-ink-subtle truncate max-w-[140px]">
          {[it.color, it.brand].filter(Boolean).join(" · ") || "—"}
        </p>
      </div>
    </Link>
  );
}

/**
 * Brand-product chip — the Model-plan cross-brand suggestion. We don't
 * have product metadata cached in this component (the chat page only
 * sends wardrobe), so the chip is intentionally minimal: a "Brand" badge
 * + the truncated product id. The chip links to /app/discover so the
 * user can browse the platform catalogue (where they'll find the actual
 * product); v2 can drop a real thumb when we plumb product lookups.
 */
function BrandChip({ productId }: { productId: string }) {
  return (
    <Link
      href="/app/discover"
      className="group flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/[0.06]
                 px-2.5 py-1.5 hover:border-accent transition-colors"
    >
      <span
        className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[8px] font-bold uppercase
                   tracking-[0.08em] text-accent shrink-0"
      >
        Brand
      </span>
      <span className="text-[11px] font-medium text-ink truncate max-w-[140px]">
        Suggested piece {productId.slice(-6)}
      </span>
    </Link>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl bg-white border border-hairline px-4 py-3 flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-1.5 w-1.5 rounded-full bg-ink-subtle"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.18 }}
          />
        ))}
      </div>
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSubmit,
  submitting,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  disabled: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex items-center gap-2"
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          disabled
            ? "Add a few pieces to your wardrobe first…"
            : "Ask anything — what should I wear with my black jeans?"
        }
        disabled={submitting || disabled}
        maxLength={2000}
        className="flex-1 rounded-full border border-hairline-strong bg-white px-4 py-3 text-[14px] text-ink
                   placeholder:text-ink-subtle focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink
                   transition-colors duration-200 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={submitting || disabled || !value.trim()}
        className="rounded-full bg-ink px-5 py-3 text-[13px] font-medium text-white
                   hover:bg-[#2a2622] transition-colors disabled:opacity-50"
      >
        {submitting ? "Asking…" : "Ask"}
      </button>
    </form>
  );
}

function EmptyState({
  onSuggest,
  hasWardrobe,
}: {
  onSuggest: (prompt: string) => void;
  hasWardrobe: boolean;
}) {
  const suggestions = [
    "Give me 3 outfit ideas from my wardrobe",
    "What should I wear for a casual dinner?",
    "Which pieces go best together for a clean look?",
    "Suggest an outfit around my favourite top",
  ];
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="text-center py-6"
      >
        <p className="font-serif text-[1.3rem] font-medium text-ink">
          {hasWardrobe ? "Ask anything about your wardrobe." : "Your wardrobe is empty."}
        </p>
        <p className="mt-2 text-[13px] text-ink-muted max-w-[40ch] mx-auto">
          {hasWardrobe
            ? "The assistant only recommends pieces you already own."
            : "Add a few pieces first — then come back and I'll mix outfits for you."}
        </p>
        {hasWardrobe && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSuggest(s)}
                className="rounded-full border border-hairline bg-white px-3.5 py-1.5 text-[12px] text-ink-muted
                           hover:border-ink/30 hover:text-ink transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
