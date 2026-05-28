import type { Metadata } from "next";
import { LEGAL_DOCS } from "@/lib/legal/legalVersions";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Aplomb collects, uses, and protects your data.",
};

const { version } = LEGAL_DOCS.privacy;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
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
        Privacy <em className="italic">Policy</em><span className="text-accent">.</span>
      </h1>
      <p className="mt-4 text-[13px] text-ink-subtle">
        Version {version} · Last updated {version}
      </p>

      <div className="mt-6 rounded-2xl border border-hairline bg-surface-raised px-5 py-4 text-[14px] leading-[1.6] text-ink-muted">
        This policy is a working draft and must be reviewed by qualified legal /
        privacy counsel before launch. Bracketed values such as [Company legal name]
        and retention periods need completion.
      </div>

      <Section title="1. Who we are">
        <p>
          Aplomb is operated by [Company legal name] (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;), the data controller for the personal data described here.
          Contact: [privacy contact email].
        </p>
      </Section>

      <Section title="2. Data we collect">
        <p>
          Account data (name, email); body measurements you provide; photos you upload
          for measurement and try-on; usage and device data. Body-scan photos are
          stored in a private bucket and are never made publicly accessible.
        </p>
      </Section>

      <Section title="3. How we use it">
        <p>
          To provide size recommendations, generate outfits and try-on imagery, operate
          and secure your account, and improve the Service. AI processing of your photos
          happens server-side; only short-lived signed URLs are shared with processing
          providers.
        </p>
      </Section>

      <Section title="4. Legal bases">
        <p>
          We process data to perform our contract with you, on the basis of your consent
          (e.g. for biometric-adjacent measurement data, where applicable), and for our
          legitimate interests in operating and securing the Service.
        </p>
      </Section>

      <Section title="5. Sharing">
        <p>
          We share data with processors that help us run the Service (hosting, database,
          AI measurement/outfit/try-on providers, rate-limiting) under appropriate
          agreements. We do not sell your personal data.
        </p>
      </Section>

      <Section title="6. Retention">
        <p>
          We keep personal data only as long as needed for the purposes above or as
          required by law. Body-scan photos are retained for [retention period] and then
          deleted. Proof-of-acceptance records are kept for the life of the account plus
          any legally required period.
        </p>
      </Section>

      <Section title="7. Your rights">
        <p>
          Subject to applicable law, you may request access, correction, deletion,
          portability, or restriction of your data, and may withdraw consent. To
          exercise these rights, contact [privacy contact email].
        </p>
      </Section>

      <Section title="8. Changes">
        <p>
          We may update this policy. Material changes will be published here with a new
          version, and we may ask you to acknowledge the update.
        </p>
      </Section>
    </article>
  );
}
