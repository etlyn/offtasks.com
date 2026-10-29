import { AnalyticsPreference } from "@/components/public/AnalyticsPreference";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { ContactForm } from "@/components/public/ContactForm";
import { PublicSiteShell } from "@/components/public/PublicSiteShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PRIVACY_URL, SUPPORT_URL } from "@/config/publicSite";
import privacyPolicy from "@/config/privacyPolicy.json";

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
              {section.links && (
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-teal-800">
                  {section.links.map((link) => (
                    <a key={link.href} href={link.href} className="underline underline-offset-4">
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))}
        </section>

        {eyebrow === "Privacy" && <AnalyticsPreference />}

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
