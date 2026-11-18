import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicSiteShell } from "@/components/public/PublicSiteShell";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  /** The way to the neighbouring screen, such as "New here? Create an account". */
  switchHref?: string;
  switchLabel?: string;
  switchPrompt?: string;
}

/** One quiet panel for signing in, creating an account and recovering a password. */
export const AuthLayout = ({ children, title, subtitle, switchHref, switchLabel, switchPrompt }: AuthLayoutProps) => (
  <PublicSiteShell className="pub--auth">
    <main className="auth">
      <section className="auth-card" aria-labelledby="auth-title">
        <h1 id="auth-title">{title}</h1>
        {subtitle ? <p className="auth-sub">{subtitle}</p> : null}
        <div className="auth-body">{children}</div>
        {switchHref && switchLabel ? (
          <p className="auth-switch">
            {switchPrompt ? `${switchPrompt} ` : null}
            <Link className="ot-link" to={switchHref}>
              {switchLabel}
            </Link>
          </p>
        ) : null}
      </section>
    </main>
    <PublicFooter />
  </PublicSiteShell>
);
