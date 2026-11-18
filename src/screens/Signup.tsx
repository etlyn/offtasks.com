import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authReturnRoute, safePlannerReturn } from "@/lib/goalWorkbench";
import { AuthLayout } from "@/components/AuthLayout";
import { AuthNotice } from "@/components/public/AuthNotice";
import {
  AuthPasswordInput,
  AuthTextInput,
  PasswordChecklist,
} from "@/components/public/AuthFields";
import { supabaseClient } from "@/lib/supabase";
import { GoogleSignInButton } from "@/components/public/GoogleSignInButton";
import {
  getPasswordValidationError,
  mapAuthErrorMessage,
  normalizeEmail,
} from "@/utils/auth";

export const SignupScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = safePlannerReturn(
    new URLSearchParams(location.search).get("next"),
  );

  const submitHandler = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !password || !passwordConfirmation) {
      setError("Fill in all fields to create your account.");
      setMessage(null);
      return;
    }

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

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const {
        error: signUpError,
        data: { session },
      } = await supabaseClient.auth.signUp({
        email: normalizedEmail,
        password,
        options: { emailRedirectTo: `${window.location.origin}/app` },
      });

      if (signUpError) {
        setError(mapAuthErrorMessage(signUpError.message));
      } else if (session) {
        navigate(returnTo, { replace: true });
      } else {
        setMessage(
          `Check ${normalizedEmail} for a verification link, then sign in to open your workspace.`,
        );
      }
    } catch (unknownError) {
      const message =
        unknownError instanceof Error
          ? unknownError.message
          : "Unable to create your account.";
      setError(mapAuthErrorMessage(message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create account"
      switchHref={authReturnRoute("/login", returnTo)}
      switchLabel="Sign in"
      switchPrompt="Already have an account?"
    >
      {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}
      {message ? <AuthNotice tone="success">{message}</AuthNotice> : null}

      <form className="auth-form" onSubmit={submitHandler} noValidate>
        <AuthTextInput
          id="email"
          type="email"
          autoComplete="email"
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isLoading}
          required
          autoFocus
        />

        <AuthPasswordInput
          id="password"
          autoComplete="new-password"
          label="Password"
          placeholder="Create a password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isLoading}
          required
        />

        <PasswordChecklist password={password} />

        <AuthPasswordInput
          id="password-confirm"
          autoComplete="new-password"
          label="Confirm password"
          placeholder="Repeat your password"
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          disabled={isLoading}
          required
        />

        <button type="submit" disabled={isLoading} className="ot-button ot-button--block">
          {isLoading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="auth-or">or</p>
      <GoogleSignInButton returnTo={returnTo} disabled={isLoading} onBusyChange={setIsLoading} onError={setError} />
    </AuthLayout>
  );
};
