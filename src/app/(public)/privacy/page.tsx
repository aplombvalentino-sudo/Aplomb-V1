import type { Metadata } from "next";
import { LEGAL_DOCS } from "@/lib/legal/legalVersions";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Aplomb collects, uses, and protects your personal data under GDPR and French Loi Informatique et Libertés.",
};

const { version } = LEGAL_DOCS.privacy;

// Contact / identity constants — exposed here so the user can edit them in
// one place once the SAS is registered. All values are TODOs the founder
// must update; deliberately left as runtime strings (not template literals
// embedded in copy) so a quick grep finds them all.
const CONTROLLER = {
  legalName: "Aplomb SAS",          // TODO: confirm exact registered name
  siren: "[SIREN to be assigned]",    // TODO: replace with the 9-digit SIREN once registered
  address: "[Postal address — to be added once the SAS siège social is registered]",
  privacyEmail: "privacy@aplomb-app.com",
  contactEmail: "hello@aplomb-app.com",
};

// Single source of truth for the subprocessor list — surfaced as a table
// and reused in the cross-border-transfers section below.
const SUBPROCESSORS = [
  {
    name: "Supabase",
    role: "Authentication, primary database, private object storage for body-scan photos",
    region: "Ireland (eu-west-1) — data at rest in the EU; entity is Supabase Inc. (US)",
    mechanism: "Standard Contractual Clauses (SCCs) for any US-based admin access",
    dpaUrl: "https://supabase.com/legal/dpa",
  },
  {
    name: "Vercel",
    role: "Application hosting + CDN edge serving",
    region: "Global edge with EU regions for app rendering; corporate entity Vercel Inc. (US)",
    mechanism: "EU-US Data Privacy Framework (Vercel is DPF-certified)",
    dpaUrl: "https://vercel.com/legal/dpa",
  },
  {
    name: "Stripe",
    role: "Subscription billing + payment processing",
    region: "Ireland for EU customers; corporate entity Stripe Payments Europe Ltd.",
    mechanism: "Intra-EU transfer (no Chapter V mechanism required)",
    dpaUrl: "https://stripe.com/legal/dpa",
  },
  {
    name: "Cloudflare",
    role: "Bot protection (Turnstile) + DDoS mitigation",
    region: "Global edge; corporate entity Cloudflare Inc. (US)",
    mechanism: "EU-US Data Privacy Framework (Cloudflare is DPF-certified)",
    dpaUrl: "https://www.cloudflare.com/cloudflare-customer-dpa/",
  },
  {
    name: "Google (Gemini API)",
    role: "Generative AI — outfit recommendations from product catalogue + your measurements",
    region: "United States — Google LLC",
    mechanism: "EU-US Data Privacy Framework (Google Cloud is DPF-certified)",
    dpaUrl: "https://cloud.google.com/terms/data-processing-addendum",
  },
  {
    name: "fal.ai",
    role: "Virtual try-on imagery — generates the look on your front photo",
    region: "United States — fal AI Inc.",
    mechanism: "Standard Contractual Clauses (SCCs) on file; ask fal directly for their DPA",
    dpaUrl: "https://fal.ai/terms",
  },
  {
    name: "Upstash",
    role: "Rate-limiting + abuse protection (Redis)",
    region: "EU region available; corporate entity Upstash Inc. (US)",
    mechanism: "SCCs + EU region enabled — see Trust Center",
    dpaUrl: "https://upstash.com/trust",
  },
];

function Section({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-24">
      <h2 className="font-serif text-[1.5rem] font-medium tracking-[-0.01em] text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-[1.7] text-ink-muted">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-32 pb-24">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-accent">Legal</p>
      <h1 className="mt-3 font-serif text-[clamp(2.2rem,4vw,3rem)] font-medium leading-[1.05] tracking-[-0.02em] text-ink">
        Privacy <em className="italic">Policy</em>
        <span className="text-accent">.</span>
      </h1>
      <p className="mt-4 text-[13px] text-ink-subtle">
        Version {version} · Last updated {version} · Drafted under GDPR (Regulation
        (EU) 2016/679) and the French Loi Informatique et Libertés
      </p>

      <div className="mt-6 rounded-2xl border border-hairline bg-surface-raised px-5 py-4 text-[14px] leading-[1.6] text-ink-muted">
        This policy is written by the Aplomb team based on internal compliance
        audits and CNIL guidance. It should be reviewed by qualified privacy
        counsel before any material business change (new subprocessor, new
        processing activity, new market). Bracketed values like the SIREN and
        postal address will be filled in once the SAS is registered.
      </div>

      {/* ── 1. Identity (Art 13 §1.a) ───────────────────────────────────── */}
      <Section title="1. Who we are (data controller)" id="controller">
        <p>
          Aplomb is operated by <strong>{CONTROLLER.legalName}</strong>, a French
          société par actions simplifiée (SAS) — {CONTROLLER.siren},
          headquartered at {CONTROLLER.address}.
        </p>
        <p>
          We are the <strong>data controller</strong> for the personal data
          described in this policy. The brands you discover through Aplomb are
          our commercial partners, not joint controllers of your scan data.
        </p>
        <p>
          Privacy contact: <a href={`mailto:${CONTROLLER.privacyEmail}`} className="text-ink underline underline-offset-2">{CONTROLLER.privacyEmail}</a>.
          We do not currently have a designated Data Protection Officer — under
          GDPR Art 37 §1.b, a DPO becomes mandatory once we cross the
          &ldquo;regular and systematic monitoring on a large scale&rdquo;
          threshold; we&apos;ll appoint one before that.
        </p>
      </Section>

      {/* ── 2. Data we collect (Art 13 §1.c → Art 14) ───────────────────── */}
      <Section title="2. What data we collect, why, and on what legal basis" id="data">
        <p>The table below maps every personal-data category to its purpose,
          the GDPR Article 6 lawful basis, and how long we keep it.</p>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-hairline">
          <table className="w-full text-[13px]">
            <thead className="text-left text-[11px] uppercase tracking-[0.1em] text-ink-subtle">
              <tr className="border-b border-hairline">
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Purpose</th>
                <th className="px-4 py-3 font-medium">Basis (Art 6)</th>
                <th className="px-4 py-3 font-medium">Retention</th>
              </tr>
            </thead>
            <tbody className="text-ink">
              <Row d="Email + password (hashed in Supabase Auth)" p="Account access" b="§1.b (contract)" r="Account lifetime + 30 days" />
              <Row d="Name (display)" p="UI personalisation" b="§1.b (contract)" r="Account lifetime" />
              <Row d="Front + side body photos (private bucket)" p="Derive measurements (side deleted after); render try-on (front)" b="§1.b (contract) + Art 9 §2.a (explicit consent for try-on)" r="Side: immediately post-derivation. Front: 30 days from last use, then auto-purged" />
              <Row d="Body measurements (height, weight, chest, waist, hips, etc.)" p="Size recommendations" b="§1.b (contract)" r="Account lifetime; deleted on erasure" />
              <Row d="Style preferences + occasion picks" p="Outfit generation" b="§1.b (contract)" r="Account lifetime; deleted on erasure" />
              <Row d="Recommendation sessions + generated outfits" p="Service delivery + history" b="§1.b (contract)" r="13 months from creation OR account deletion (whichever first)" />
              <Row d="Try-on imagery (cached)" p="Skip re-generation; persistent gallery" b="§1.b (contract)" r="Deleted with the underlying recommendation session" />
              <Row d="Anonymous session cookie + token hash" p="Match an anonymous shopper back to their data on subsequent requests (Safari ITP-safe)" b="§1.b (contract — strictly necessary)" r="13 months OR until the cookie expires" />
              <Row d="Stripe customer + subscription IDs + plan + status" p="Billing" b="§1.b (contract) + §1.c (legal obligation — bookkeeping)" r="10 years (French Code de commerce art. L123-22)" />
              <Row d="Legal-acceptance proof (IP, user-agent, version, timestamp)" p="Prove clickwrap consent under Art 7 §1" b="§1.f (legitimate interest in proving consent)" r="Account lifetime + 5 years (French Code civil art. 2224)" />
              <Row d="Server logs (timestamps, request paths, errors)" p="Operations + security + abuse detection" b="§1.f (legitimate interest)" r="~30 days (Vercel + Supabase default)" />
            </tbody>
          </table>
        </div>

        <p className="mt-4">
          We never collect: government-issued IDs, payment card numbers (Stripe
          handles those — we only see customer IDs), location data beyond IP
          country inference, advertising identifiers, or biometric templates
          used for unique person identification.
        </p>
      </Section>

      {/* ── 3. Special category data (Art 9) ────────────────────────────── */}
      <Section title="3. Body photos + Article 9 (special-category data)" id="art9">
        <p>
          Body-scan photos are <em>not</em> processed to uniquely identify you as
          an individual — they are processed to estimate body dimensions and
          render try-on imagery. We treat them as Article 9 &ldquo;biometric-
          adjacent&rdquo; data anyway and process them only under your
          <strong> explicit consent</strong> (Art 9 §2.a), captured at signup
          and re-requested per session before the first try-on render.
        </p>
        <p>
          You can withdraw consent at any time from your
          <a href="/app/account" className="text-ink underline underline-offset-2"> Account → Your data</a>
          page; deleting your account erases every photo (front + side derivatives)
          from our private bucket before deleting any database rows. Withdrawing
          consent does not affect the lawfulness of past processing.
        </p>
      </Section>

      {/* ── 4. Subprocessors (Art 13 §1.e + Art 28) ─────────────────────── */}
      <Section title="4. Who we share data with (subprocessors)" id="subprocessors">
        <p>
          We share strictly the minimum data each subprocessor needs to perform
          its role under a written DPA. We never sell, rent, trade, or share
          personal data for marketing purposes.
        </p>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-hairline">
          <table className="w-full text-[13px]">
            <thead className="text-left text-[11px] uppercase tracking-[0.1em] text-ink-subtle">
              <tr className="border-b border-hairline">
                <th className="px-4 py-3 font-medium">Subprocessor</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Region + transfer mechanism</th>
                <th className="px-4 py-3 font-medium">DPA</th>
              </tr>
            </thead>
            <tbody className="text-ink">
              {SUBPROCESSORS.map((sp) => (
                <tr key={sp.name} className="border-b border-hairline last:border-b-0 align-top">
                  <td className="px-4 py-3 font-medium">{sp.name}</td>
                  <td className="px-4 py-3 text-ink-muted">{sp.role}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {sp.region}
                    <br />
                    <span className="text-[11px]">Transfer mechanism: {sp.mechanism}</span>
                  </td>
                  <td className="px-4 py-3">
                    <a href={sp.dpaUrl} className="text-ink underline underline-offset-2 text-[12px]" target="_blank" rel="noopener noreferrer">
                      DPA →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4">
          We will notify you 30 days in advance of adding any new subprocessor
          via this page (you can subscribe to a feed by checking back monthly
          or following Aplomb on a public channel).
        </p>
      </Section>

      {/* ── 5. International transfers (Chapter V) ──────────────────────── */}
      <Section title="5. International transfers (Chapter V)" id="transfers">
        <p>
          Several subprocessors are headquartered in the United States.
          GDPR Chapter V allows such transfers when an adequate mechanism is in
          place:
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>EU-US Data Privacy Framework (DPF)</strong>: Vercel,
            Cloudflare, Google Cloud (Gemini). The European Commission
            recognised DPF as adequate in July 2023; you can verify each
            company&apos;s current DPF certification at
            <a href="https://www.dataprivacyframework.gov/" className="text-ink underline underline-offset-2" target="_blank" rel="noopener noreferrer"> dataprivacyframework.gov</a>.
          </li>
          <li>
            <strong>Standard Contractual Clauses (SCCs)</strong>: Supabase Inc.
            (parent), Stripe, fal.ai, Upstash. We use the European Commission&apos;s
            2021 SCC templates.
          </li>
          <li>
            <strong>Intra-EU only</strong>: Stripe Payments Europe Ltd. (Ireland)
            handles all European billing data — no transfer outside the EEA.
          </li>
        </ul>
        <p>
          A copy of any transfer mechanism we rely on is available by emailing
          {" "}<a href={`mailto:${CONTROLLER.privacyEmail}`} className="text-ink underline underline-offset-2">{CONTROLLER.privacyEmail}</a>.
        </p>
      </Section>

      {/* ── 6. Security (Art 32) ────────────────────────────────────────── */}
      <Section title="6. How we protect your data" id="security">
        <p>
          Photos are stored in a private object bucket that is unreadable
          without short-lived signed URLs we generate server-side. All transport
          uses HTTPS with HSTS preload. Session tokens use SHA-256 hashing and
          constant-time comparison. Row-level security policies enforce
          per-user access to database rows. We log access to private buckets
          and review for anomalies.
        </p>
        <p>
          We&apos;ve set technical limits to prevent abuse (rate-limiting per IP,
          Cloudflare Turnstile on sign-up, file-size + MIME caps on photo
          uploads) and to make denial-of-service costly to attackers.
        </p>
      </Section>

      {/* ── 7. Rights (Art 12–22) ───────────────────────────────────────── */}
      <Section title="7. Your rights" id="rights">
        <p>
          As a data subject in the EU/EEA, you have the following rights. Most
          can be exercised directly from your account, in-app:
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li><strong>Access</strong> (Art 15) — see what we hold. Use
            <a href="/app/account" className="text-ink underline underline-offset-2"> Account → Export my data</a>.</li>
          <li><strong>Rectification</strong> (Art 16) — fix wrong details. Edit
            your name from <a href="/app/account" className="text-ink underline underline-offset-2">Account</a>; for email, contact us.</li>
          <li><strong>Erasure</strong> (Art 17) — delete everything. Use
            <a href="/app/account" className="text-ink underline underline-offset-2"> Account → Danger zone</a>.
            Your photos are removed from storage <em>before</em> any database
            row is deleted.</li>
          <li><strong>Restriction</strong> (Art 18) — pause processing while a
            dispute is resolved. Contact us.</li>
          <li><strong>Portability</strong> (Art 20) — receive your data in JSON.
            Same export link as Access above.</li>
          <li><strong>Object</strong> (Art 21) — to processing on legitimate-interest
            grounds. Contact us with your reasons.</li>
          <li><strong>Withdraw consent</strong> (Art 7 §3) — wherever processing
            is on consent (e.g., try-on photos). Deleting the account is the
            most thorough way; consent withdrawal does not undo past processing.</li>
        </ul>
        <p>
          We respond within one month (Art 12 §3). You can also lodge a
          complaint with your local supervisory authority — for residents of
          France, that is the{" "}
          <a href="https://www.cnil.fr/fr/plaintes" className="text-ink underline underline-offset-2" target="_blank" rel="noopener noreferrer">
            CNIL (cnil.fr/fr/plaintes)
          </a>.
        </p>
      </Section>

      {/* ── 8. Anonymous shoppers ───────────────────────────────────────── */}
      <Section title="8. Anonymous shoppers (no account)" id="anonymous">
        <p>
          When you use Aplomb&apos;s widget through a brand&apos;s site without
          signing up, we identify your session via an opaque token stored in a
          cookie (the hash, not the token, is stored in our database). Because
          we cannot link that token back to a real identity, Art 11 §2 applies:
          we cannot fulfil access or erasure requests on this anonymous data on
          our own — but you can present the cookie token back to us to prove
          ownership and request a deletion. To take direct control of your
          data, create a free account.
        </p>
        <p>
          Anonymous data is auto-purged 13 months after the last activity.
        </p>
      </Section>

      {/* ── 9. Cookies ──────────────────────────────────────────────────── */}
      <Section title="9. Cookies and local storage" id="cookies">
        <p>
          We use only <strong>strictly necessary</strong> cookies and local
          storage today — no analytics, no ad tracking, no profiling beyond
          what&apos;s needed to operate the service. Under the ePrivacy Directive,
          strictly-necessary storage does not require a consent banner.
        </p>
        <ul className="ml-5 list-disc space-y-1.5 text-[14px]">
          <li><code>aplomb_session_token</code> — anonymous shopper session (httpOnly cookie, 7 days)</li>
          <li><code>client_plan</code> — your shopper plan (httpOnly cookie, 1 year)</li>
          <li><code>next-auth.session-token</code> — your signed-in session (httpOnly cookie, 30 days)</li>
          <li><code>aplomb_wardrobe</code> — locally cached saved looks (localStorage)</li>
          <li><code>SCAN_COUNT_KEY</code> — monthly scan counter for quota UI (localStorage)</li>
          <li>Cloudflare Turnstile cookies (one-time bot-check)</li>
        </ul>
        <p>
          If we ever add analytics or marketing storage, we&apos;ll publish a
          full cookie banner with a reject option as prominent as the accept
          option, in compliance with CNIL guidelines.
        </p>
      </Section>

      {/* ── 10. Marketing ───────────────────────────────────────────────── */}
      <Section title="10. Marketing communications" id="marketing">
        <p>
          We send only transactional emails by default (welcome, password
          reset, billing). Marketing emails (newsletter, product updates,
          promotions) require a separate opt-in checkbox at signup or a
          dedicated subscribe action — never bundled with general consent.
          Every marketing email contains a one-click unsubscribe link.
        </p>
      </Section>

      {/* ── 11. Changes ─────────────────────────────────────────────────── */}
      <Section title="11. Changes to this policy" id="changes">
        <p>
          We bump the policy version (<code>{version}</code>) on every material
          change and store proof of your acceptance. When the policy materially
          changes, you may be asked to re-accept before continuing to use
          Aplomb. Non-material edits (typos, clarifications) don&apos;t change
          the version.
        </p>
      </Section>

      {/* ── 12. Contact ─────────────────────────────────────────────────── */}
      <Section title="12. Contacting us" id="contact">
        <p>
          For any privacy-related question — exercising your rights, asking
          about subprocessors, querying retention, etc. — email{" "}
          <a href={`mailto:${CONTROLLER.privacyEmail}`} className="text-ink underline underline-offset-2">{CONTROLLER.privacyEmail}</a>.
          For everything else, use{" "}
          <a href={`mailto:${CONTROLLER.contactEmail}`} className="text-ink underline underline-offset-2">{CONTROLLER.contactEmail}</a>.
        </p>
      </Section>
    </article>
  );
}

// ── Helper: one row of the data-collection table ───────────────────────────

function Row({ d, p, b, r }: { d: string; p: string; b: string; r: string }) {
  return (
    <tr className="border-b border-hairline last:border-b-0 align-top">
      <td className="px-4 py-3 font-medium">{d}</td>
      <td className="px-4 py-3 text-ink-muted">{p}</td>
      <td className="px-4 py-3 text-ink-muted">{b}</td>
      <td className="px-4 py-3 text-ink-muted">{r}</td>
    </tr>
  );
}
