import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";
import { AuthNotice } from "@/components/public/AuthNotice";
import {
  AuthPasswordInput,
  AuthTextInput,
} from "@/components/public/AuthFields";
import { Button } from "@/components/ui/button";
import { supabaseClient } from "@/lib/supabase";
import { mapAuthErrorMessage, normalizeEmail } from "@/utils/auth";

export const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

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
      const { error: signInError } = await supabaseClient.auth.signIn({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        setError(mapAuthErrorMessage(signInError.message));
      } else {
        navigate("/app", { replace: true });
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
      eyebrow="Sign in"
      title="Sign in"
      subtitle="Open your task list."
      heroTitle=""
      heroDescription=""
      heroBullets={[]}
      switchHref="/signup"
      switchLabel="Create account"
      switchPrompt="New here?"
    >
      {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}

      <form className="space-y-5" onSubmit={handleLogin} noValidate>
        <AuthTextInput
          id="email"
          type="email"
          autoComplete="email"
          label="Email address"
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
            <Link
              to="/forgot-password"
              className="font-medium text-[#134E4A] transition hover:text-[#0f3f3b]"
            >
              Forgot password?
            </Link>
          }
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isLoading}
          required
        />

        <Button
          type="submit"
          disabled={isLoading}
          className="h-12 w-full rounded-2xl bg-[#134E4A] text-sm font-semibold text-white shadow-[0_24px_56px_-32px_rgba(9,48,43,0.72)] hover:bg-[#0f3f3b]"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
};
