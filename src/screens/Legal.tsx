import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { ContactForm } from "@/components/public/ContactForm";
import { PublicSiteShell } from "@/components/public/PublicSiteShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PRIVACY_URL, SUPPORT_URL } from "@/config/publicSite";

interface LegalSection {
  title: string;
  items: string[];
}

interface LegalPageProps {
  eyebrow: string;
  title: string;
  description: string;
  sections: LegalSection[];
}

const updatedLabel = "Updated April 28, 2026";

const LegalPage = ({
  eyebrow,
  title,
  description,
  sections,
}: LegalPageProps) => (
  <PublicSiteShell
    actionSlot={
      <>
        <Button
          asChild
          variant="ghost"
          className="rounded-full px-4 text-[#0f172a] hover:bg-white/70 hover:text-[#009689]"
        >
          <Link to="/">Home</Link>
        </Button>
        <Button
          asChild
          className="rounded-full bg-[#09090b] px-5 text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.48)] hover:bg-[#18181b]"
        >
          <Link to="/support#contact">Contact</Link>
        </Button>
      </>
    }
  >
    <main className="pb-16 pt-4 sm:pb-20">
      <div className="mx-auto max-w-4xl animate-[rise-in_700ms_ease-out_both]">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/64 px-4 py-2 text-sm font-semibold text-[#0f172a] shadow-[0_16px_36px_-30px_rgba(15,23,42,0.28)] backdrop-blur-xl transition hover:bg-white"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>

        <section className="mt-8 rounded-[34px] border border-white/70 bg-white/72 p-6 shadow-[0_34px_80px_-54px_rgba(15,23,42,0.32)] backdrop-blur-2xl sm:p-8">
          <Badge className="rounded-full border-white/70 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#009689]">
            {eyebrow}
          </Badge>
          <h1 className="mt-6 font-['Sora',_sans-serif] text-4xl font-semibold leading-tight tracking-[-0.055em] text-[#0f172a] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#64748b]">
            {description}
          </p>
          <p className="mt-4 text-sm font-semibold text-[#009689]">
            {updatedLabel}
          </p>
        </section>

        <section className="mt-5 grid gap-4">
          {sections.map((section) => (
            <article
              key={section.title}
              className="rounded-[28px] border border-white/70 bg-white/64 p-5 shadow-[0_22px_54px_-44px_rgba(15,23,42,0.24)] backdrop-blur-2xl sm:p-6"
            >
              <h2 className="font-['Sora',_sans-serif] text-xl font-semibold tracking-[-0.04em] text-[#0f172a]">
                {section.title}
              </h2>
              <ul className="mt-4 grid gap-3 text-sm leading-6 text-[#64748b]">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#009689]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section
          id="contact"
          className="mt-5 rounded-[28px] border border-white/70 bg-white/72 p-6 shadow-[0_24px_64px_-48px_rgba(15,23,42,0.26)] backdrop-blur-2xl"
        >
          <h2 className="font-['Sora',_sans-serif] text-2xl font-semibold tracking-[-0.045em] text-[#0f172a]">
            Contact support
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#64748b]">
            Send a message for support, privacy, or account requests.
          </p>
          <div className="mt-5">
            <ContactForm source={`${eyebrow.toLowerCase()}-page`} />
          </div>
        </section>
      </div>
    </main>
  </PublicSiteShell>
);

const privacySections: LegalSection[] = [
  {
    title: "Data we collect",
    items: [
      "Account email and authentication details needed to sign in.",
      "Task content, dates, labels, priorities, completion state, and preferences you save.",
      "Basic technical data for security, sync, diagnostics, and abuse prevention.",
    ],
  },
  {
    title: "How we use data",
    items: [
      "To run the Offtasks web and iOS task experience.",
      "To sync your tasks, protect accounts, answer support, and improve reliability.",
      "We do not sell personal data or use task content for advertising.",
    ],
  },
  {
    title: "Sharing and storage",
    items: [
      "Trusted providers such as Supabase and hosting infrastructure process data for the app.",
      "Data may be stored where those providers operate, with access limited to app operations.",
      "We may disclose data if required by law or to protect users and the service.",
    ],
  },
  {
    title: "Your choices",
    items: [
      "You can edit or delete tasks in the app.",
      "Request account or data deletion through the support form.",
      "Deletion requests are reviewed and completed within a reasonable period unless retention is legally required.",
    ],
  },
];

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
      "Send an account deletion request through the support form.",
      "Use the email address tied to your Offtasks account so ownership can be verified.",
      "Account and task data will be removed unless retention is required for security or legal reasons.",
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
      "You can stop using Offtasks at any time and request account deletion through support.",
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
    title="Privacy Policy"
    description="Clear data rules for Offtasks on web and iOS."
    sections={privacySections}
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
