import { Apple, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { PlannerPreview } from "@/components/public/PlannerPreview";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicSiteShell } from "@/components/public/PublicSiteShell";
import { IOS_APP_STORE_URL, SHOW_IOS_APP_STORE_DOWNLOAD } from "@/config/publicSite";
import { useAuth } from "@/providers/auth";
import calendarLarge from "@/assets/onboarding/calendar-1120.webp";
import calendarSmall from "@/assets/onboarding/calendar-640.webp";
import captureLarge from "@/assets/onboarding/capture-1120.webp";
import captureSmall from "@/assets/onboarding/capture-640.webp";
import growLarge from "@/assets/onboarding/grow-1120.webp";
import growSmall from "@/assets/onboarding/grow-640.webp";

const Art = ({ small, large, eager }: { small: string; large: string; eager?: boolean }) => (
  <img
    className="landing-art"
    src={large}
    srcSet={`${small} 640w, ${large} 1120w`}
    sizes="(max-width: 56.1875em) min(84vw, 26rem), 30rem"
    width={1120}
    height={1120}
    alt=""
    loading={eager ? "eager" : "lazy"}
    decoding="async"
  />
);

export const LandingScreen = () => {
  const { user } = useAuth();
  const primaryHref = user ? "/app" : "/signup";
  const primaryLabel = user ? "Open planner" : "Start free";

  return (
    <PublicSiteShell
      actionSlot={
        <>
          {!user ? (
            <Link className="ot-button ot-button--quiet ot-button--small" to="/login">
              Sign in
            </Link>
          ) : null}
          <Link className="ot-button ot-button--small" to={primaryHref}>
            {primaryLabel}
          </Link>
        </>
      }
    >
      <main className="landing">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <h1>A little less on your mind.</h1>
            <p>Catch a thought, add a task. Keep it in Later until you’re ready.</p>
            <div className="landing-actions">
              <Link className="ot-button ot-button--large" to={primaryHref} data-analytics-target="open_planner">
                {primaryLabel}
                <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" />
              </Link>
              {SHOW_IOS_APP_STORE_DOWNLOAD ? (
                <a
                  className="ot-button ot-button--large ot-button--outline"
                  data-analytics-target="download_ios"
                  href={IOS_APP_STORE_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Download Offtasks on the App Store"
                >
                  <Apple size={18} strokeWidth={1.8} aria-hidden="true" />
                  App Store
                </a>
              ) : null}
            </div>
          </div>
          <Art small={captureSmall} large={captureLarge} eager />
        </section>

        <section className="landing-product" aria-label="The planner">
          <PlannerPreview />
        </section>

        <section className="landing-row">
          <Art small={calendarSmall} large={calendarLarge} />
          <div>
            <h2>Make room for your day.</h2>
            <p>See your day in Calendar. Check things off at your own pace.</p>
          </div>
        </section>

        <section className="landing-row landing-row--flip">
          <Art small={growSmall} large={growLarge} />
          <div>
            <h2>Space for what matters.</h2>
            <p>Keep ideas in Notes and move toward your Goals.</p>
          </div>
        </section>

        <section className="landing-close">
          <span className="ot-wordmark ot-wordmark--large" aria-hidden="true">
            offtasks<i>.</i>
          </span>
          <Link className="ot-button ot-button--large" to={primaryHref}>
            {primaryLabel}
          </Link>
          {!user ? (
            <p>
              Already have an account?{" "}
              <Link className="ot-link" to="/login">
                Sign in
              </Link>
            </p>
          ) : null}
        </section>
      </main>
      <PublicFooter />
    </PublicSiteShell>
  );
};
