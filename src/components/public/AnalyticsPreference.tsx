import { useState } from "react";
import { readAnalyticsEnabled, setAnalyticsEnabled, privacySignalActive, analyticsConfigured } from "@/analytics";

/** The opt-out for public-page analytics; it only appears when analytics is set up. */
export function AnalyticsPreference() {
  const [enabled, setEnabled] = useState(readAnalyticsEnabled);
  const blocked = privacySignalActive();
  if (!analyticsConfigured) return null;
  return (
    <section className="legal-preference">
      <label>
        <input
          type="checkbox"
          checked={enabled && !blocked}
          disabled={blocked}
          onChange={(event) => {
            setEnabled(event.target.checked);
            setAnalyticsEnabled(event.target.checked);
          }}
        />
        Allow public website usage analytics
      </label>
      <p>
        We measure public page visits, selected links and confirmed contact submissions without analytics cookies. Task
        content, account screens and form values are excluded. Your preference stays in this browser.
        {blocked ? " Your browser privacy signal currently prevents collection." : ""}
      </p>
    </section>
  );
}
