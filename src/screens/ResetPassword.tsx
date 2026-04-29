import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";
import { AuthNotice } from "@/components/public/AuthNotice";
import {
  AuthPasswordInput,
  PasswordChecklist,
} from "@/components/public/AuthFields";
import { Button } from "@/components/ui/button";
import { supabaseClient } from "@/lib/supabase";
import { useAuth } from "@/providers/auth";
import {
  getAuthUrlParams,
  getPasswordValidationError,
  mapAuthErrorMessage,
} from "@/utils/auth";

export const ResetPasswordScreen = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);

  const isTokenReady = useMemo(
    () => typeof accessToken === "string" && accessToken.length > 0,
    [accessToken],
  );

  useEffect(() => {
    const params = getAuthUrlParams();
    const sessionToken = session?.access_token ?? null;
    const nextToken = params.accessToken ?? sessionToken;

    setAccessToken(nextToken);
    setIsRecoveryFlow(
      Boolean(params.accessToken) || params.type === "recovery",
    );

    if (params.errorDescription) {
      setError(mapAuthErrorMessage(params.errorDescription));
    }
  }, [session?.access_token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const passwordError = getPasswordValidationError(password);
    if (passwordError) {
      setError(passwordError);
      setMessage(null);
      return;
    }

    if (password !== passwordConfirmation) {
      setError("Passwords do not match.");
      setMessage(null);
      return;
    }

    if (!isTokenReady || !accessToken) {
      setError(
        "Reset link is invalid or has expired. Request a new one from the login page.",
      );
      setMessage(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: updateError } = await supabaseClient.auth.api.updateUser(
        accessToken,
        {
          password,
        },
      );

      if (updateError) {
        setError(mapAuthErrorMessage(updateError.message));
      } else {
        if (isRecoveryFlow) {
          await supabaseClient.auth.signOut();
          setMessage("Password updated. Sign in with your new password.");
          setTimeout(() => {
            navigate("/login", { replace: true });
          }, 900);
          return;
        }

        setMessage("Password updated. Taking you back to your workspace...");
        setTimeout(() => {
          navigate("/app", { replace: true });
        }, 900);
      }
    } catch (unknownError) {
      const nextMessage =
        unknownError instanceof Error
          ? unknownError.message
          : "Unable to update the password.";
      setError(mapAuthErrorMessage(nextMessage));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Secure access"
      title="Choose a new password"
      subtitle="Set a fresh password and continue with a clean, dependable recovery flow."
      heroTitle="Reset access without losing momentum."
      heroDescription="Recovery links, state handling, and password updates now work as one continuous experience, including cases where Supabase returns the token through the URL hash or an active recovery session."
      heroBullets={[
        "Recovery links are accepted from either URL search params or hash fragments.",
        "If the link created a temporary session, this screen still stays accessible.",
        "Expired or invalid links surface a clear next step instead of a dead end.",
      ]}
      switchHref="/login"
      switchLabel="Back to sign in"
      switchPrompt="Want to return to the login screen?"
    >
      {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}
      {message ? <AuthNotice tone="success">{message}</AuthNotice> : null}
      {!isTokenReady && !error ? (
        <AuthNotice tone="info">
          Follow the newest reset link from your email to load a valid recovery
          token before saving a new password.
        </AuthNotice>
      ) : null}

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <AuthPasswordInput
          id="password"
          autoComplete="new-password"
          label="New password"
          placeholder="Enter a new password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isLoading}
          required
          autoFocus
        />

        <PasswordChecklist password={password} />

        <AuthPasswordInput
          id="password-confirm"
          autoComplete="new-password"
          label="Confirm password"
          placeholder="Repeat your new password"
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          disabled={isLoading}
          required
        />

        <Button
          type="submit"
          disabled={isLoading || !isTokenReady}
          className="h-12 w-full rounded-2xl bg-[#134E4A] text-sm font-semibold text-white shadow-[0_24px_56px_-32px_rgba(9,48,43,0.72)] hover:bg-[#0f3f3b]"
        >
          {isLoading ? "Saving password..." : "Save new password"}
        </Button>
      </form>
    </AuthLayout>
  );
};
