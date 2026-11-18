import { Link } from "react-router-dom";
import { AnalyticsPreference } from "@/components/public/AnalyticsPreference";
import { ContactForm } from "@/components/public/ContactForm";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicSiteShell } from "@/components/public/PublicSiteShell";
import { PRIVACY_URL, SUPPORT_URL } from "@/config/publicSite";
import privacyPolicy from "@/config/privacyPolicy.json";
import { useAuth } from "@/providers/auth";

interface LegalSection {
  title: string;
  items: string[];
  links?: { label: string; href: string }[];
}

interface LegalPageProps {
  eyebrow: string;
  title: string;
  description: string;
  sections: LegalSection[];
  updatedLabel?: string;
}

const LegalPage = ({
  eyebrow,
  title,
  description,
  sections,
  updatedLabel = "Updated September 26, 2026",
}: LegalPageProps) => {
  const { user } = useAuth();
  return (
    <PublicSiteShell
      actionSlot={
        <>
          <Link className="ot-button ot-button--quiet ot-button--small" to="/support#contact">
            Contact
          </Link>
          <Link className="ot-button ot-button--small" to={user ? "/app" : "/login"}>
            {user ? "Open planner" : "Sign in"}
          </Link>
        </>
      }
    >
      <main className="legal">
        <header className="legal-head">
          <p className="legal-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
          <p className="legal-updated">{updatedLabel}</p>
        </header>

        {sections.map((section) => (
          <section key={section.title} className="legal-section">
            <h2>{section.title}</h2>
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {section.links && (
              <p className="legal-links">
                {section.links.map((link) => (
                  <a key={link.href} href={link.href} className="ot-link">
                    {link.label}
                  </a>
                ))}
              </p>
            )}
          </section>
        ))}

        {eyebrow === "Privacy" && <AnalyticsPreference />}

        <section id="contact" className="legal-contact">
          <h2>Contact support</h2>
          <p>Send a message for support, privacy, or account requests.</p>
          <ContactForm source={`${eyebrow.toLowerCase()}-page`} />
        </section>
      </main>
      <PublicFooter />
    </PublicSiteShell>
  );
};

const supportSections: LegalSection[] = [
  {
    title: "Contact",
    items: [
      "Use the support form for product help, privacy requests, and App Store review contact.",
      "Include your account email, device, app version, and a short description.",
    ],
  },
  {
    title: "Account deletion",
    items: [
      "Signed-in users can delete their Offtasks data directly in the app.",
      "This removes Offtasks-owned tasks, notes, goals, profile rows, and synced preferences, then signs this device out of Offtasks.",
      "Your shared Etlyn sign-in identity is retained for other apps; global identity deletion remains separate shared-backend work.",
    ],
  },
  {
    title: "App Store URLs",
    items: [
      `Privacy Policy URL: ${PRIVACY_URL}`,
      `Support URL: ${SUPPORT_URL}`,
      "Marketing URL: https://offtasks.com",
    ],
  },
];

const termsSections: LegalSection[] = [
  {
    title: "Use",
    items: [
      "Offtasks is for personal task planning and light productivity.",
      "You are responsible for the task content and information you save.",
      "Do not use Offtasks to harm others, break laws, or disrupt the service.",
    ],
  },
  {
    title: "Account",
    items: [
      "Keep your sign-in details secure.",
      "You can stop using Offtasks at any time and delete your Offtasks data without deleting your shared Etlyn sign-in identity.",
    ],
  },
  {
    title: "Service",
    items: [
      "We aim to keep Offtasks reliable, but availability is not guaranteed.",
      "Features may change as the product improves.",
      "The service is provided as is, to the extent allowed by law.",
    ],
  },
];

export const PrivacyScreen = () => (
  <LegalPage
    eyebrow="Privacy"
    title={privacyPolicy.title}
    description={privacyPolicy.description}
    sections={privacyPolicy.sections}
    updatedLabel={privacyPolicy.updatedLabel}
  />
);

export const SupportScreen = () => (
  <LegalPage
    eyebrow="Support"
    title="Support"
    description="Help, contact, and App Store review links."
    sections={supportSections}
  />
);

export const TermsScreen = () => (
  <LegalPage
    eyebrow="Terms"
    title="Terms of Use"
    description="Simple terms for using Offtasks."
    sections={termsSections}
  />
);
