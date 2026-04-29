import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { PublicSiteShell } from "@/components/public/PublicSiteShell";
import { Button } from "@/components/ui/button";

interface AuthLayoutProps {
  children: ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
  heroTitle: string;
  heroDescription: string;
  heroBullets: string[];
  switchHref: string;
  switchLabel: string;
  switchPrompt: string;
}

export const AuthLayout = ({
  children,
  eyebrow,
  title,
  subtitle,
  switchHref,
  switchLabel,
  switchPrompt,
}: AuthLayoutProps) => (
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
          className="rounded-full bg-[#09090b] px-5 text-white shadow-[0_16px_36px_-24px_rgba(15,23,42,0.45)] hover:bg-[#18181b]"
        >
          <Link to={switchHref}>{switchLabel}</Link>
        </Button>
      </>
    }
  >
    <main className="flex flex-1 items-center justify-center pb-12 pt-4 sm:pb-16">
      <section className="w-full max-w-[460px] animate-[rise-in_700ms_ease-out_both]">
        <div className="rounded-[30px] border border-white/75 bg-white/82 p-6 shadow-[0_30px_80px_-54px_rgba(15,23,42,0.32)] backdrop-blur-2xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#009689]">
            {eyebrow}
          </p>
          <h1 className="mt-4 font-['Sora',_sans-serif] text-3xl font-semibold tracking-[-0.055em] text-[#0f172a]">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#64748b]">{subtitle}</p>

          <div className="mt-7 space-y-5">{children}</div>

          <div className="mt-7 border-t border-[#e4e7ee] pt-5 text-sm text-[#64748b]">
            {switchPrompt}{" "}
            <Link
              to={switchHref}
              className="font-semibold text-[#009689] transition hover:text-[#00786f]"
            >
              {switchLabel}
            </Link>
          </div>
        </div>
      </section>
    </main>
  </PublicSiteShell>
);
