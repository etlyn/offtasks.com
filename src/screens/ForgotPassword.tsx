import { useState, type FormEvent } from "react";
import { AuthLayout } from "@/components/AuthLayout";
import { AuthNotice } from "@/components/public/AuthNotice";
import { AuthTextInput } from "@/components/public/AuthFields";
import { supabaseClient } from "@/lib/supabase";
import { mapAuthErrorMessage, normalizeEmail } from "@/utils/auth";
import { useLocation } from "react-router-dom";
import { authReturnRoute, safePlannerReturn } from "@/lib/goalWorkbench";

export const ForgotPasswordScreen = () => {
  const location = useLocation();
  const returnTo = safePlannerReturn(
    new URLSearchParams(location.search).get("next"),
  );
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      setError("Enter the email tied to your Offtasks account.");
      setMessage(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: resetError } =
        await supabaseClient.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo,
        });

      if (resetError) {
        setError(mapAuthErrorMessage(resetError.message));
        return;
      }

      setMessage(
        `A reset link is on its way to ${normalizedEmail}. Open that email on this device to set a new password.`,
      );
    } catch (unknownError) {
      const fallback =
        unknownError instanceof Error
          ? unknownError.message
          : "Unable to send the password reset email.";
      setError(mapAuthErrorMessage(fallback));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset password"
      subtitle="We’ll email you a link to choose a new one."
      switchHref={authReturnRoute("/login", returnTo)}
      switchLabel="Back to sign in"
    >
      {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}
      {message ? <AuthNotice tone="success">{message}</AuthNotice> : null}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <AuthTextInput
          id="email"
          type="email"
          autoComplete="email"
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isLoading}
          autoFocus
          required
        />

        <button type="submit" disabled={isLoading} className="ot-button ot-button--block">
          {isLoading ? "Sending reset link..." : "Send reset link"}
        </button>
      </form>
    </AuthLayout>
  );
};
