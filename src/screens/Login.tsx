import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";
import { AuthNotice } from "@/components/public/AuthNotice";
import {
  AuthPasswordInput,
  AuthTextInput,
} from "@/components/public/AuthFields";
import { supabaseClient } from "@/lib/supabase";
import { mapAuthErrorMessage, normalizeEmail } from "@/utils/auth";
import { authReturnRoute, safePlannerReturn } from "@/lib/goalWorkbench";
import { GoogleSignInButton } from "@/components/public/GoogleSignInButton";

export const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = safePlannerReturn(
    new URLSearchParams(location.search).get("next"),
  );
  const accountDeleted =
    (location.state as { accountDeleted?: boolean } | null)?.accountDeleted ===
    true;

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      setError("Enter the email you use with Offtasks.");
      return;
    }

    if (!password) {
      setError("Enter your password to continue.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } =
        await supabaseClient.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (signInError) {
        setError(mapAuthErrorMessage(signInError.message));
      } else {
        navigate(returnTo, { replace: true });
      }
    } catch (unknownError) {
      const fallback =
        unknownError instanceof Error
          ? unknownError.message
          : "Unable to sign in.";
      setError(mapAuthErrorMessage(fallback));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      switchHref={authReturnRoute("/signup", returnTo)}
      switchLabel="Create an account"
      switchPrompt="New here?"
    >
      {accountDeleted ? (
        <AuthNotice tone="success">
          Your Offtasks data was deleted and this device was signed out. Your
          Etlyn sign-in identity is still available for other shared Etlyn apps.
        </AuthNotice>
      ) : null}

      {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}

      <form className="auth-form" onSubmit={handleLogin} noValidate>
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
          autoComplete="current-password"
          label="Password"
          labelAction={
            <Link to={authReturnRoute("/forgot-password", returnTo)} className="ot-link">
              Forgot password?
            </Link>
          }
          placeholder="Your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isLoading}
          required
        />

        <button type="submit" disabled={isLoading} className="ot-button ot-button--block">
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="auth-or">or</p>
      <GoogleSignInButton returnTo={returnTo} disabled={isLoading} onBusyChange={setIsLoading} onError={setError} />
    </AuthLayout>
  );
};
