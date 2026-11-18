import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";
import { AuthNotice } from "@/components/public/AuthNotice";
import { supabaseClient } from "@/lib/supabase";
import { createOfftasksGoogleAuth } from "@/lib/googleAuth";

export function SignInCallbackScreen() {
  const navigate = useNavigate();
  const completion = useRef<Promise<{ returnPath: string }> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    // Reuse this promise across Strict Mode effect replay.
    completion.current ??= createOfftasksGoogleAuth({
      client: supabaseClient,
      origin: window.location.origin,
      storage: () => window.sessionStorage,
      scrubCallbackUrl: (url) => window.history.replaceState(null, "", url),
    }).complete(window.location.href);
    void completion.current
      .then(({ returnPath }) => {
        if (active) navigate(returnPath, { replace: true });
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to complete sign-in. Please try again."
          );
      });
    return () => {
      active = false;
    };
  }, [navigate]);
  return (
    <AuthLayout
      title={error ? "Sign-in unavailable" : "Completing sign-in"}
      subtitle={error ? "Start a new sign-in to try again." : "Opening your planner."}
      switchHref={error ? "/login" : undefined}
      switchLabel="Back to sign in"
    >
      {error ? <AuthNotice tone="error">{error}</AuthNotice> : <p role="status" className="auth-status">One moment…</p>}
    </AuthLayout>
  );
}
