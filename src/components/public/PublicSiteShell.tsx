import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Wordmark } from "@/components/LogoWordmark";
import "@/styles/public.css";

interface PublicSiteShellProps {
  children: ReactNode;
  /** Links and buttons on the right of the header. */
  actionSlot?: ReactNode;
  className?: string;
}

/** The frame around every public page: the soft backdrop, the wordmark and the page's own actions. */
export const PublicSiteShell = ({ children, actionSlot, className = "" }: PublicSiteShellProps) => (
  <div className={`pub ${className}`}>
    <div className="ot-backdrop" aria-hidden="true" />
    <header className="pub-top">
      <Link to="/" className="pub-home" aria-label="Offtasks home">
        <Wordmark large />
      </Link>
      {actionSlot ? <nav className="pub-actions" aria-label="Account">{actionSlot}</nav> : null}
    </header>
    {children}
  </div>
);
