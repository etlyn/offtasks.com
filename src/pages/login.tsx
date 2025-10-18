import type { ChangeEvent, MouseEvent } from "react";
import { useState } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { supabaseClient } from "@/lib/supabase";
import { LogoWordmark } from "@/components";

const LoginPage: NextPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const router = useRouter();

  const handleLogin = async (event: MouseEvent<HTMLButtonElement>) => {
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
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;

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
    router.push("/signup").catch(() => {
      setError("We couldn't redirect you to the sign-up page.");
    });
  };

  const changeHandlerEmail = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  const changeHandlerPassword = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900">
      <div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-800/60 px-6 py-8 shadow-xl backdrop-blur md:px-12">
        <div className="flex justify-between">
          <LogoWordmark />
          <button
            className="rounded-lg border border-cyan-500 px-4 py-2 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500 hover:text-white"
            onClick={handleGuestLogin}
            disabled={isLoading}
            type="button"
          >
            I&apos;m a Guest
          </button>
        </div>

        <div className="mt-10">
          <h1 className="text-2xl font-semibold text-zinc-50">Log in</h1>

          {error ? (
            <p className="mt-4 text-sm text-red-400">{error}</p>
          ) : null}
          {message && !error ? (
            <p className="mt-4 text-sm text-emerald-400">{message}</p>
          ) : null}

          <label className="mt-6 block text-sm font-medium text-zinc-200" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            onChange={changeHandlerEmail}
            required
            disabled={isLoading}
            value={email}
          />

          <label className="mt-6 block text-sm font-medium text-zinc-200" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            onChange={changeHandlerPassword}
            className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            type="password"
            required
            disabled={isLoading}
            value={password}
          />

          <button
            type="button"
            className="mt-3 text-sm text-cyan-300 transition hover:text-cyan-200"
            onClick={handlePasswordReset}
            disabled={isLoading}
          >
            Forgot password?
          </button>

          <button
            className="mt-8 w-full rounded-lg bg-cyan-600 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleLogin}
            disabled={isLoading}
            type="button"
          >
            Log in
          </button>

          <div className="mt-8 flex justify-center text-sm text-zinc-200">
            <span>Don&apos;t have an account?</span>
            <button
              className="ml-2 font-semibold text-cyan-300 underline transition hover:text-cyan-200"
              onClick={handleSignUp}
              type="button"
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
