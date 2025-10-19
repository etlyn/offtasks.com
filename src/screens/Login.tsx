import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabaseClient } from "@/lib/supabase";

export const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: signInError } = await supabaseClient.auth.signIn({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
      } else {
        setMessage("Signed in successfully. Redirecting...");
        setTimeout(() => {
          navigate("/");
        }, 750);
      }
    } catch (unknownError) {
      const message =
        unknownError instanceof Error ? unknownError.message : "Unable to sign in.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const uniqueCredentials = typeof crypto !== "undefined" ? crypto.randomUUID() : Date.now().toString();
      const guestEmail = `${uniqueCredentials}@example.com`;
      const { error: signUpError } = await supabaseClient.auth.signUp({
        email: guestEmail,
        password: uniqueCredentials,
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        setMessage("Guest account created. Check your inbox to confirm before signing in.");
      }
    } catch (unknownError) {
      const message =
        unknownError instanceof Error ? unknownError.message : "Unable to create a guest account.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError("Enter your email address first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;

      const { error: resetError } = await supabaseClient.auth.api.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setMessage("Check your email for the password reset link.");
      }
    } catch (unknownError) {
      const message =
        unknownError instanceof Error ? unknownError.message : "Unable to initiate the password reset.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = () => {
    navigate("/signup");
  };

  const changeHandlerEmail = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  const changeHandlerPassword = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to access your tasks"
    >
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Check your details</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {message && !error ? (
        <Alert>
          <AlertTitle>All set</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <form className="space-y-6" onSubmit={handleLogin} noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={changeHandlerEmail}
            disabled={isLoading}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={changeHandlerPassword}
            disabled={isLoading}
            required
          />
        </div>

        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="link"
            size="sm"
            className="px-0 text-xs font-medium text-sky-400 hover:text-sky-300"
            onClick={handlePasswordReset}
            disabled={isLoading}
          >
            Forgot password?
          </Button>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
          {isLoading ? "Signing in..." : "Log in"}
        </Button>
      </form>

      <div className="text-center text-sm text-zinc-400">
        <span>Don&apos;t have an account?</span>
        <Button
          type="button"
          variant="link"
          className="px-1 font-semibold text-sky-400 hover:text-sky-300"
          onClick={handleSignUp}
          disabled={isLoading}
        >
          Sign up
        </Button>
      </div>

      <div className="flex items-center justify-center pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-zinc-500 hover:text-zinc-300"
          onClick={handleGuestLogin}
          disabled={isLoading}
        >
          Continue as guest
        </Button>
      </div>
    </AuthLayout>
  );
};
