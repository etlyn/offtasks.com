import type { ReactNode } from "react";

type AuthNoticeTone = "error" | "success" | "info";

/** A short message above a form. Errors are announced at once; the rest politely. */
export const AuthNotice = ({ children, tone = "info" }: { children: ReactNode; tone?: AuthNoticeTone }) => (
  <div className={`ot-notice${tone === "error" ? " ot-notice--error" : ""}`} role={tone === "error" ? "alert" : "status"}>
    {children}
  </div>
);
