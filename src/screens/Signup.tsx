import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";
import { AuthNotice } from "@/components/public/AuthNotice";
import {
  AuthPasswordInput,
  AuthTextInput,
  PasswordChecklist,
} from "@/components/public/AuthFields";
import { Button } from "@/components/ui/button";
import { supabaseClient } from "@/lib/supabase";
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
      const { error: signUpError, session } = await supabaseClient.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (signUpError) {
        setError(mapAuthErrorMessage(signUpError.message));
      } else if (session) {
        navigate("/app", { replace: true });
      } else {
        setMessage(
          `Account created. Sign in with ${normalizedEmail} to open your workspace.`,
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
      eyebrow="Start free"
      title="Create account"
      subtitle="Start with a calm task list."
      heroTitle=""
      heroDescription=""
      heroBullets={[]}
      switchHref="/login"
      switchLabel="Sign in"
      switchPrompt="Already joined?"
    >
      {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}
      {message ? <AuthNotice tone="success">{message}</AuthNotice> : null}

      <form className="space-y-5" onSubmit={submitHandler} noValidate>
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

        <Button
          type="submit"
          disabled={isLoading}
          className="h-12 w-full rounded-2xl bg-[#134E4A] text-sm font-semibold text-white shadow-[0_24px_56px_-32px_rgba(9,48,43,0.72)] hover:bg-[#0f3f3b]"
        >
          {isLoading ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
};
