import { Link } from "wouter";

type LegalPage = {
  title: string;
  subtitle: string;
  updated: string;
  sections: Array<{ heading: string; body: string[] }>;
};

const shell: React.CSSProperties = {
  minHeight: "100vh",
  background: "radial-gradient(circle at 20% 0%, rgba(201,168,76,.18), transparent 32%), linear-gradient(145deg,#050508,#09070d 48%,#120611)",
  color: "#fff",
  padding: "42px 20px",
};

const card: React.CSSProperties = {
  maxWidth: 980,
  margin: "0 auto",
  border: "1px solid rgba(255,255,255,.10)",
  borderRadius: 28,
  background: "linear-gradient(160deg, rgba(255,255,255,.075), rgba(255,255,255,.026))",
  boxShadow: "0 32px 110px rgba(0,0,0,.5)",
  padding: "clamp(24px, 5vw, 52px)",
};

const pages: Record<string, LegalPage> = {
  terms: {
    title: "Terms of Service",
    subtitle: "Rules for creators, fans, agencies, and partners using CreatorVault and VaultX.",
    updated: "June 2026",
    sections: [
      { heading: "Adult content and eligibility", body: ["CreatorVault and VaultX are intended for adults only. You must be at least 18 years old, or the age of majority in your jurisdiction if higher, to access adult content, sell adult content, purchase adult content, or operate a creator account.", "Creators are solely responsible for ensuring that every performer appearing in submitted or monetized adult content is verified as 18+ at the time of production and that all required releases, consents, and records are maintained."] },
      { heading: "Creator obligations", body: ["Creators may only upload, list, stream, sell, or distribute content they own or are legally authorized to commercialize. Non-consensual content, underage content, impersonation without authorization, trafficking, coercion, revenge content, and unlawful sexual material are prohibited.", "Creators must provide accurate account information, honor subscriber and fan deliverables, comply with platform review requests, and remove content when required by law, rights-holder complaint, payment processor rule, or platform policy."] },
      { heading: "Fan obligations", body: ["Fans may access content only for personal use unless a separate commercial license is granted. Fans may not scrape, redistribute, leak, resell, record, reverse engineer, or otherwise exploit creator content outside the permissions purchased through the platform.", "Fans must use truthful payment information, respect creator boundaries, and comply with all community, messaging, and purchase policies."] },
      { heading: "Payments, subscriptions, and chargebacks", body: ["Payments, subscriptions, tips, purchases, and premium unlocks may be processed by third-party payment providers. Prices, taxes, payout timing, refunds, and chargeback handling may vary by product, jurisdiction, and processor requirements.", "CreatorVault may suspend access, withhold payouts, reverse credits, or terminate accounts when fraud, chargeback abuse, policy violations, or legal risk is detected."] },
      { heading: "Content removal and account termination", body: ["CreatorVault may remove content, restrict visibility, disable checkout, suspend distribution, or terminate accounts when content violates law, these terms, rights-holder requirements, payment processor rules, performer-consent standards, or platform safety standards.", "Users may request account closure or content removal through the support/contact channel identified by the platform. Legal removals and DMCA requests are handled under the DMCA Policy."] },
      { heading: "No professional advice and platform changes", body: ["CreatorVault provides business software, automation, hosting, discovery, AI workflow, and monetization tools. It does not provide legal, tax, accounting, medical, or financial advice.", "The platform may change features, pricing, availability, routes, moderation systems, or commercial terms as needed to operate safely and comply with law and provider requirements."] },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    subtitle: "How CreatorVault and VaultX handle account, creator, payment, adult-content, and workflow data.",
    updated: "June 2026",
    sections: [
      { heading: "Data we collect", body: ["We may collect account details, contact information, creator profile details, age-verification signals, waitlist submissions, content metadata, purchase history, subscription status, device and log data, messages, support requests, and workflow inputs used to operate platform tools.", "Adult-content data may include creator category, consent status, media metadata, compliance records, content listings, purchase permissions, and distribution settings. Users should not submit content they are not authorized to share or commercialize."] },
      { heading: "How data is used", body: ["We use data to operate accounts, provide creator profiles, process access requests, route purchases, deliver subscriptions, power automation tools, improve product performance, prevent fraud, enforce policies, respond to legal requests, and maintain safety and compliance systems.", "Workflow data may be used to generate, organize, schedule, package, or distribute creator assets according to the user-selected tool and permissions."] },
      { heading: "Payment data handling", body: ["Payment card, bank, wallet, and payout information may be processed by third-party payment processors. CreatorVault generally receives transaction status, limited billing metadata, payout status, and fraud/compliance signals rather than full card numbers.", "Processor terms and privacy policies may apply to payment activities."] },
      { heading: "Sharing and service providers", body: ["We may share limited data with hosting providers, payment processors, analytics vendors, communications tools, storage providers, legal/compliance vendors, and AI/media providers when necessary to deliver requested platform functionality.", "We may disclose information when required to comply with law, protect users, enforce terms, respond to DMCA or 2257-related matters, investigate abuse, or defend legal rights."] },
      { heading: "User rights and choices", body: ["Depending on your location, you may request access, correction, deletion, portability, or restriction of certain personal data. Some records may be retained where required for legal compliance, fraud prevention, accounting, chargeback defense, adult-content recordkeeping, or platform security.", "Users can limit optional communications and should contact the platform if they need account, profile, or data-rights assistance."] },
    ],
  },
  dmca: {
    title: "DMCA Policy",
    subtitle: "Copyright takedown, counter-notice, and repeat-infringer process for CreatorVault and VaultX.",
    updated: "June 2026",
    sections: [
      { heading: "Submitting a takedown notice", body: ["If you believe content on CreatorVault infringes your copyright, send a written notice identifying the copyrighted work, the allegedly infringing material and URL, your contact information, a good-faith statement that the use is unauthorized, a statement under penalty of perjury that your notice is accurate, and your physical or electronic signature.", "Send notices to the platform operator/custodian contact designated by CreatorVault. If no separate legal address is published for your jurisdiction, use the official platform support/contact channel and include 'DMCA Notice' in the subject line."] },
      { heading: "Counter-notice process", body: ["A user whose content was removed may submit a counter-notice identifying the removed material, stating under penalty of perjury that it was removed by mistake or misidentification, consenting to appropriate jurisdiction, and providing a physical or electronic signature.", "When a valid counter-notice is received, CreatorVault may restore the material unless the complaining party notifies the platform that it has filed a court action seeking to restrain the user from the allegedly infringing activity."] },
      { heading: "Repeat infringer policy", body: ["CreatorVault may terminate or restrict accounts that repeatedly infringe copyrights or repeatedly submit unauthorized content. Repeat-infringer determinations may consider takedown volume, severity, patterns, account history, and legal risk."] },
      { heading: "Misuse", body: ["Submitting false, abusive, or bad-faith notices or counter-notices may create legal liability. DMCA processes are for copyright claims only; privacy, consent, impersonation, or adult-safety complaints should be sent through the appropriate platform reporting channel."] },
    ],
  },
  statement2257: {
    title: "18 U.S.C. 2257 Statement",
    subtitle: "Adult-content recordkeeping statement for CreatorVault and VaultX publisher/distribution workflows.",
    updated: "June 2026",
    sections: [
      { heading: "Records custodian", body: ["Records required by 18 U.S.C. § 2257 and related regulations are kept by CreatorVault for covered adult content distributed through the platform where CreatorVault is required to maintain such records.", "Custodian of Records: Cam Lee. Records Location: CreatorVault platform records office / official business address on file with the platform operator."] },
      { heading: "Performer age verification", body: ["All performers appearing in covered adult content are represented to have been verified as 18 years of age or older at the time of production. Creators and studios submitting content are responsible for maintaining valid identification, model releases, consent records, and production records."] },
      { heading: "Inspection availability", body: ["Records required by applicable law are available for inspection by authorized officials during legally required inspection periods and according to applicable procedures. Requests should identify the specific content and legal authority for inspection."] },
      { heading: "Creator responsibility", body: ["CreatorVault may request age, consent, release, and provenance records before or after publication. Failure to provide required records may result in removal, disabled monetization, suspended distribution, or account termination."] },
    ],
  },
};

function LegalLayout({ page }: { page: LegalPage }) {
  return (
    <main style={shell}>
      <article style={card}>
        <Link href="/" style={{ color: "#f7d67a", textDecoration: "none", fontSize: 12, fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase" }}>CreatorVault / VaultX</Link>
        <h1 style={{ margin: "26px 0 10px", fontSize: "clamp(38px, 7vw, 72px)", lineHeight: .92, letterSpacing: "-.06em", fontWeight: 950 }}>{page.title}</h1>
        <p style={{ maxWidth: 720, color: "rgba(255,255,255,.68)", fontSize: 18, lineHeight: 1.65 }}>{page.subtitle}</p>
        <p style={{ color: "rgba(247,214,122,.72)", fontSize: 12, fontWeight: 850, letterSpacing: ".12em", textTransform: "uppercase", marginTop: 18 }}>Last updated: {page.updated}</p>
        <div style={{ display: "grid", gap: 26, marginTop: 38 }}>
          {page.sections.map((section) => (
            <section key={section.heading} style={{ borderTop: "1px solid rgba(255,255,255,.09)", paddingTop: 24 }}>
              <h2 style={{ margin: "0 0 12px", fontSize: 21, letterSpacing: "-.02em" }}>{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} style={{ margin: "0 0 12px", color: "rgba(255,255,255,.72)", lineHeight: 1.72, fontSize: 15 }}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
        <footer style={{ display: "flex", flexWrap: "wrap", gap: 14, borderTop: "1px solid rgba(255,255,255,.09)", marginTop: 40, paddingTop: 22 }}>
          <Link href="/terms" style={footerLink}>Terms</Link>
          <Link href="/privacy" style={footerLink}>Privacy</Link>
          <Link href="/dmca" style={footerLink}>DMCA</Link>
          <Link href="/2257" style={footerLink}>2257</Link>
          <Link href="/signup" style={footerLink}>Request Access</Link>
        </footer>
      </article>
    </main>
  );
}

const footerLink: React.CSSProperties = { color: "rgba(255,255,255,.72)", textDecoration: "none", fontSize: 12, fontWeight: 850, letterSpacing: ".12em", textTransform: "uppercase" };

export function TermsPage() { return <LegalLayout page={pages.terms} />; }
export function PrivacyPage() { return <LegalLayout page={pages.privacy} />; }
export function DmcaPage() { return <LegalLayout page={pages.dmca} />; }
export function Statement2257Page() { return <LegalLayout page={pages.statement2257} />; }
