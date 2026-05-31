import type { Metadata } from "next";
import { LEGAL_DOCS } from "@/lib/legal/legalVersions";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms governing your use of Aplomb.",
};

const { version } = LEGAL_DOCS.terms;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
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
        Terms of <em className="italic">Use</em><span className="text-accent">.</span>
      </h1>
      <p className="mt-4 text-[13px] text-ink-subtle">
        Version {version} · Last updated {version}
      </p>

      <div className="mt-6 rounded-2xl border border-hairline bg-surface-raised px-5 py-4 text-[14px] leading-[1.6] text-ink-muted">
        These terms are a working draft and must be reviewed by qualified legal
        counsel before launch. Bracketed values such as [Company legal name] need
        completion.
      </div>

      <Section title="1. Acceptance">
        <p>
          By creating an account or using Aplomb (the &ldquo;Service&rdquo;), you
          agree to these Terms of Use. If you do not agree, do not use the Service.
          The Service is operated by [Company legal name] (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;).
        </p>
      </Section>

      <Section title="2. The Service">
        <p>
          Aplomb provides AI-assisted size recommendations, outfit suggestions, and
          virtual try-on imagery for shoppers, and a marketplace presence for brands.
          Size and fit outputs are estimates, not guarantees, and should be used as
          guidance only.
        </p>
      </Section>

      <Section title="3. Accounts and age requirement">
        <p>
          You are responsible for the accuracy of the information you provide and for
          keeping your credentials secure. You must be at least <strong>15 years
          old</strong> to create an account (French Loi Informatique et Libertés
          article 7-1). If you are under 15, a parent or legal guardian must create
          and operate the account on your behalf. Aplomb does not knowingly process
          body-scan photos of minors under 15.
        </p>
      </Section>

      <Section title="4. Acceptable use">
        <p>
          You agree not to misuse the Service, including attempting to access data you
          are not authorised to access, uploading content you have no right to upload,
          or interfering with the Service&rsquo;s operation or security.
        </p>
      </Section>

      <Section title="5. Intellectual property">
        <p>
          The Service, its software, and its branding are owned by us or our licensors.
          You retain rights to content you upload; you grant us a limited licence to
          process it solely to provide the Service.
        </p>
      </Section>

      <Section title="6. Disclaimers & liability">
        <p>
          The Service is provided &ldquo;as is&rdquo; without warranties of any kind.
          To the maximum extent permitted by law, our liability is limited as set out
          in [Company legal name]&rsquo;s standard terms. Nothing limits liability that
          cannot be limited by law.
        </p>
      </Section>

      <Section title="7. Changes to these terms">
        <p>
          We may update these terms. When we make material changes we will publish a
          new version here and may require you to accept the updated terms before
          continuing to use the Service.
        </p>
      </Section>

      <Section title="8. Contact">
        <p>
          Questions about these terms can be sent to [legal contact email].
        </p>
      </Section>
    </article>
  );
}
