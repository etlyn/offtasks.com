import { useState, type FormEvent } from "react";
import { AuthLayout } from "@/components/AuthLayout";
import { AuthNotice } from "@/components/public/AuthNotice";
import { AuthTextInput } from "@/components/public/AuthFields";
import { Button } from "@/components/ui/button";
import { supabaseClient } from "@/lib/supabase";
import { mapAuthErrorMessage, normalizeEmail } from "@/utils/auth";

export const ForgotPasswordScreen = () => {
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
        await supabaseClient.auth.api.resetPasswordForEmail(normalizedEmail, {
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
      eyebrow="Password recovery"
      title="Reset your password"
      subtitle="We’ll send a secure reset link so you can get back to your list without friction."
      heroTitle="Keep account recovery simple and trustworthy."
      heroDescription="The recovery flow mirrors the rest of Offtasks: clear next steps, minimal noise, and no dead ends if a link expires."
      heroBullets={[
        "Send a reset link to the email already tied to your account.",
        "Open the email on this device to land directly in the new-password step.",
        "Request another link anytime if the previous one expires.",
      ]}
      switchHref="/login"
      switchLabel="Back to sign in"
      switchPrompt="Remembered it instead?"
    >
      {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}
      {message ? <AuthNotice tone="success">{message}</AuthNotice> : null}

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <AuthTextInput
          id="email"
          type="email"
          autoComplete="email"
          label="Account email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isLoading}
          autoFocus
          required
        />

        <Button
          type="submit"
          disabled={isLoading}
          className="h-12 w-full rounded-2xl bg-[#134E4A] text-sm font-semibold text-white shadow-[0_24px_56px_-32px_rgba(9,48,43,0.72)] hover:bg-[#0f3f3b]"
        >
          {isLoading ? "Sending reset link..." : "Send reset link"}
        </Button>
      </form>
    </AuthLayout>
  );
};
