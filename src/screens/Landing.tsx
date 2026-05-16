import { Apple, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { LandingIllustration } from "@/components/public/LandingIllustration";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicSiteShell } from "@/components/public/PublicSiteShell";
import { Button } from "@/components/ui/button";
import {
  IOS_APP_STORE_URL,
  SHOW_IOS_APP_STORE_DOWNLOAD,
} from "@/config/publicSite";
import { useAuth } from "@/providers/auth";

const features = [
  "Quick capture",
  "Check tasks off",
  "Today / Tomorrow / Later",
  "Priorities",
  "Labels",
  "Stats",
];

export const LandingScreen = () => {
  const { user } = useAuth();

  const primaryHref = user ? "/app" : "/signup";
  const primaryLabel = user ? "Open workspace" : "Start free";

  return (
    <PublicSiteShell
      actionSlot={
        <>
          {!user ? (
            <Button
              asChild
              variant="ghost"
              className="rounded-full px-4 text-[#0f172a] hover:bg-white/70 hover:text-[#009689]"
            >
              <Link to="/login">Sign in</Link>
            </Button>
          ) : null}
          <Button
            asChild
            className="rounded-full bg-[#09090b] px-5 text-white shadow-[0_16px_36px_-24px_rgba(15,23,42,0.45)] hover:bg-[#18181b]"
          >
            <Link to={primaryHref}>{primaryLabel}</Link>
          </Button>
        </>
      }
    >
      <main className="pb-10 pt-4 sm:pb-14 lg:pb-16">
        <section className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-12">
          <div className="animate-[rise-in_700ms_ease-out_both]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#009689]">
              Get tasks off your mind
            </p>

            <h1 className="mt-5 max-w-2xl font-['Sora',_sans-serif] text-5xl font-semibold leading-[0.96] tracking-[-0.065em] text-[#0f172a] sm:text-6xl lg:text-[5.2rem]">
              To-Do, without noise
            </h1>

            <p className="mt-5 max-w-lg text-base leading-7 text-[#64748b] sm:text-lg sm:leading-8">
              Capture tasks as soon as they appear, keep today focused, and feel
              the simple relief of checking each one off.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full bg-[#009689] px-6 text-sm font-semibold text-white shadow-[0_22px_46px_-28px_rgba(0,150,137,0.55)] hover:bg-[#00786f]"
              >
                <Link to={primaryHref}>
                  {primaryLabel}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              {SHOW_IOS_APP_STORE_DOWNLOAD ? (
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-full bg-[#09090b] px-5 text-sm font-semibold text-white shadow-[0_20px_44px_-30px_rgba(15,23,42,0.5)] hover:bg-[#18181b]"
                >
                  <a
                    href={IOS_APP_STORE_URL}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Download Offtasks on the App Store"
                  >
                    <Apple className="size-4.5" />
                    App Store
                  </a>
                </Button>
              ) : null}
            </div>
          </div>

          <LandingIllustration />
        </section>

        <section id="features" className="mt-16 sm:mt-20">
          <div className="rounded-[30px] border border-white/70 bg-white/62 p-5 shadow-[0_24px_56px_-46px_rgba(15,23,42,0.24)] backdrop-blur-2xl sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#009689]">
                  Features
                </p>
                <h2 className="mt-2 font-['Sora',_sans-serif] text-3xl font-semibold tracking-[-0.055em] text-[#0f172a]">
                  Built for that check-off feeling.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-[#64748b]">
                Move tasks from your head to done without feeds, clutter, or a
                system that gets in the way.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {features.map((feature) => (
                <span
                  key={feature}
                  className="rounded-full border border-[#e4e7ee] bg-white/74 px-4 py-2 text-sm font-semibold text-[#334155]"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </section>

        <PublicFooter />
      </main>
    </PublicSiteShell>
  );
};
