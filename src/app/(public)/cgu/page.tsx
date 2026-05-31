import type { Metadata } from "next";
import { LEGAL_DOCS } from "@/lib/legal/legalVersions";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms governing your use of Aplomb.",
};

const { version } = LEGAL_DOCS.terms;

// Same identity constants as /privacy — kept duplicated rather than imported
// so each public legal page renders standalone (no shared client bundle).
const CONTROLLER = {
  legalName: "Aplomb SAS",
  siren: "[SIREN to be assigned]",
  address: "[Postal address — to be added once the SAS siège social is registered]",
  legalEmail: "legal@aplomb-app.com",
  contactEmail: "hello@aplomb-app.com",
};

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

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-32 pb-24">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-accent">Legal</p>
      <h1 className="mt-3 font-serif text-[clamp(2.2rem,4vw,3rem)] font-medium leading-[1.05] tracking-[-0.02em] text-ink">
        Terms of <em className="italic">Use</em>
        <span className="text-accent">.</span>
      </h1>
      <p className="mt-4 text-[13px] text-ink-subtle">
        Version {version} · Last updated {version} · Governing law: France
      </p>

      <div className="mt-6 rounded-2xl border border-hairline bg-surface-raised px-5 py-4 text-[14px] leading-[1.6] text-ink-muted">
        These terms are written by the Aplomb team. Once the SAS is formally
        registered, the bracketed identity fields (SIREN, postal address) will be
        completed; until then, they remain placeholders so you know exactly what
        information is still pending.
      </div>

      {/* ── 1. Acceptance ───────────────────────────────────────────────── */}
      <Section title="1. Acceptance" id="acceptance">
        <p>
          By creating an account or using Aplomb (the &ldquo;Service&rdquo;), you
          enter into a legally binding agreement with{" "}
          <strong>{CONTROLLER.legalName}</strong> ({CONTROLLER.siren}),
          headquartered at {CONTROLLER.address} (&ldquo;Aplomb&rdquo;, &ldquo;we&rdquo;,
          &ldquo;us&rdquo;). If you do not agree, do not use the Service.
        </p>
        <p>
          You confirm your acceptance at sign-up via dedicated, separately
          tick-able checkboxes (Terms of Use, Privacy Policy, age confirmation).
          We keep a record of each acceptance with the version then in force,
          your IP address, user-agent, and timestamp — see the{" "}
          <a href="/privacy#data" className="text-ink underline underline-offset-2">Privacy Policy</a>{" "}for retention.
        </p>
      </Section>

      {/* ── 2. The Service ──────────────────────────────────────────────── */}
      <Section title="2. What the Service does" id="service">
        <p>
          Aplomb provides AI-assisted body-measurement estimates, brand-specific
          size recommendations, outfit suggestions, and virtual try-on imagery
          for shoppers. We also operate a brand-facing console where merchants
          upload size charts and catalogues so their products become discoverable
          and try-on-able.
        </p>
        <p>
          Size and fit outputs are <strong>estimates, not guarantees</strong>. The
          honest accuracy of any recommendation depends on the quality of your
          photos and inputs. Confidence levels (high / medium / approximate)
          are surfaced on every recommendation so you can decide how much to
          trust the result.
        </p>
      </Section>

      {/* ── 3. Age requirement ──────────────────────────────────────────── */}
      <Section title="3. Accounts and age requirement" id="age">
        <p>
          You are responsible for the accuracy of the information you provide
          and for keeping your credentials secure. You must be at least{" "}
          <strong>15 years old</strong> to create an account (French Loi
          Informatique et Libertés article 7-1). If you are under 15, a parent
          or legal guardian must create and operate the account on your behalf
          and provide explicit consent under GDPR Article 8 for any processing
          of your data. Aplomb does not knowingly process body-scan photos of
          minors under 15 without that consent on file.
        </p>
      </Section>

      {/* ── 4. Acceptable use ───────────────────────────────────────────── */}
      <Section title="4. Acceptable use" id="acceptable-use">
        <p>You agree NOT to:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>Upload photos of anyone other than yourself, or photos you don&apos;t have the right to upload</li>
          <li>Upload photos containing minors under 15 (your own or others)</li>
          <li>Attempt to scrape brand catalogues or other users&apos; data</li>
          <li>Reverse-engineer, decompile, or otherwise probe the Service&apos;s internals</li>
          <li>Use the Service in any way that interferes with its operation, security, or other users&apos; experience</li>
          <li>Use AI agents or bots to drive measurements / try-ons at a rate exceeding our published limits</li>
          <li>Upload illegal, abusive, or copyright-infringing content</li>
        </ul>
        <p>
          We may suspend or terminate accounts that violate these terms.
        </p>
      </Section>

      {/* ── 5. Plans, billing, refunds ──────────────────────────────────── */}
      <Section title="5. Plans, billing, and refunds" id="billing">
        <p>
          Paid plans are billed monthly via Stripe. You can cancel anytime from
          your account; the cancellation takes effect at the end of the current
          billing period. You will not be charged for any further period after
          cancellation, but periods already paid are non-refundable except where
          French consumer law (Code de la consommation art. L221-18 onward)
          mandates otherwise — namely, you have a 14-day right of withdrawal
          for new paid subscriptions unless you have explicitly started using
          the paid features before the 14 days elapse, in which case you waive
          the withdrawal right for that subscription.
        </p>
      </Section>

      {/* ── 6. IP ───────────────────────────────────────────────────────── */}
      <Section title="6. Intellectual property" id="ip">
        <p>
          The Service, its software, its branding (including the &ldquo;Aplomb&rdquo;
          wordmark + glowing-dot device), and any documentation are owned by
          {" "}{CONTROLLER.legalName} or its licensors. You may not copy, modify,
          distribute, or create derivative works without our written consent.
        </p>
        <p>
          You retain all rights to the photos and inputs you upload. By using
          the Service you grant Aplomb a limited, non-exclusive, world-wide,
          revocable licence to process your inputs <em>solely</em> to provide
          you with size recommendations and try-on imagery — not for marketing,
          not for model training, not for resale.
        </p>
        <p>
          Outfit recommendations and try-on imagery generated by Aplomb are
          provided to you under the same licence: you may save them to your
          wardrobe, share them privately, and use them as styling guidance, but
          you may not republish them at scale as if they were your own
          editorial content.
        </p>
      </Section>

      {/* ── 7. Brand merchants ──────────────────────────────────────────── */}
      <Section title="7. For brand merchants" id="brands">
        <p>
          If you sign up as a brand to make your catalogue available in Aplomb,
          you additionally warrant that (i) you own or are properly licensed
          to use the product images and descriptions you upload, (ii) the size
          charts you provide accurately describe your products, and (iii) you
          comply with consumer-protection laws in every jurisdiction where you
          sell.
        </p>
        <p>
          The brand-side dashboard and analytics are made available under your
          chosen plan; pricing is shown at /pricing. You can delete your brand
          at any time from your brand settings — your existing customers&apos;
          data remains theirs, not yours.
        </p>
      </Section>

      {/* ── 8. Disclaimers + liability ──────────────────────────────────── */}
      <Section title="8. Disclaimers and limitation of liability" id="liability">
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
          without warranties of any kind, express or implied, to the maximum
          extent allowed by law.
        </p>
        <p>
          To the extent permitted by law, our aggregate liability for any
          claim arising out of or in connection with the Service is limited to
          the greater of (a) €100, or (b) the amounts you paid us for the
          Service in the 12 months preceding the claim. <strong>Nothing in
          these terms limits liability that cannot be limited by law</strong> —
          notably fraud, gross negligence, or harm to fundamental rights.
        </p>
      </Section>

      {/* ── 9. Termination ──────────────────────────────────────────────── */}
      <Section title="9. Termination" id="termination">
        <p>
          You can close your account at any time from{" "}
          <a href="/app/account" className="text-ink underline underline-offset-2">Account → Danger zone</a>.
          Closing your account triggers a full erasure of your personal data
          (photos, measurements, sessions, outfits) before the account row
          itself is deleted. We may also terminate your access if you breach
          these terms; we&apos;ll let you know unless legal or security reasons
          prevent us.
        </p>
      </Section>

      {/* ── 10. Governing law + disputes ────────────────────────────────── */}
      <Section title="10. Governing law and disputes" id="law">
        <p>
          These terms are governed by French law. Disputes will first be
          resolved by direct discussion. If we can&apos;t resolve it within 60
          days, you can refer the matter to the consumer-mediation platform
          (<a href="https://ec.europa.eu/consumers/odr" className="text-ink underline underline-offset-2" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a>)
          or to the competent French courts. As a consumer, you keep the
          benefit of the protections of French law regardless of where you
          live in the EU.
        </p>
      </Section>

      {/* ── 11. Changes ─────────────────────────────────────────────────── */}
      <Section title="11. Changes to these terms" id="changes">
        <p>
          We may update these terms. When we make material changes we publish a
          new version here (current: <code>{version}</code>) and may require you
          to re-accept before continuing. Non-material edits (typos,
          clarifications) do not change the version.
        </p>
      </Section>

      {/* ── 12. Contact ─────────────────────────────────────────────────── */}
      <Section title="12. Contact" id="contact">
        <p>
          Questions about these terms can be sent to{" "}
          <a href={`mailto:${CONTROLLER.legalEmail}`} className="text-ink underline underline-offset-2">{CONTROLLER.legalEmail}</a>.
          For privacy-specific questions see the dedicated{" "}
          <a href="/privacy#contact" className="text-ink underline underline-offset-2">Privacy contact</a>.
        </p>
      </Section>
    </article>
  );
}
