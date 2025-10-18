import type { ChangeEvent, MouseEvent } from "react";
import { useState } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { supabaseClient } from "@/lib/supabase";
import { LogoWordmark } from "@/components";

const SignupPage: NextPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const router = useRouter();

  const submitHandler = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!email || !password || !password2) {
        setError("Please fill in all fields.");
        return;
      }

      if (password !== password2) {
        setError("Passwords do not match.");
        return;
      }

      const { error: signUpError } = await supabaseClient.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        setMessage(`Account created. Please check ${email} to confirm your address before logging in.`);
      }
    } catch (unknownError) {
      const message =
        unknownError instanceof Error ? unknownError.message : "Unable to create your account.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogIn = () => {
    router.push("/login").catch(() => {
      setError("We couldn't redirect you to the login page.");
    });
  };

  const changeHandlerEmail = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  const changeHandlerPassword = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };

  const changeHandlerPassword2 = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword2(event.target.value);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900">
      <div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-800/60 px-6 py-10 shadow-xl backdrop-blur md:px-12">
        <div className="flex justify-center">
          <LogoWordmark />
        </div>

        <div className="mt-10">
          <h1 className="text-2xl font-semibold text-zinc-50">Create account</h1>

          {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
          {message && !error ? <p className="mt-4 text-sm text-emerald-400">{message}</p> : null}

          <label className="mt-6 block text-sm font-medium text-zinc-200" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            onChange={changeHandlerEmail}
            value={email}
            required
            disabled={isLoading}
          />

          <label className="mt-6 block text-sm font-medium text-zinc-200" htmlFor="password">
            Create password
          </label>
          <input
            id="password"
            onChange={changeHandlerPassword}
            className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            type="password"
            value={password}
            required
            disabled={isLoading}
          />

          <label className="mt-6 block text-sm font-medium text-zinc-200" htmlFor="password-confirm">
            Repeat password
          </label>
          <input
            id="password-confirm"
            onChange={changeHandlerPassword2}
            className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            type="password"
            value={password2}
            required
            disabled={isLoading}
          />

          <button
            className="mt-8 w-full rounded-lg bg-cyan-600 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={submitHandler}
            disabled={isLoading}
            type="button"
          >
            Create account
          </button>

          <div className="mt-8 flex justify-center text-sm text-zinc-200">
            <span>Already a member?</span>
            <button
              className="ml-2 font-semibold text-cyan-300 underline transition hover:text-cyan-200"
              onClick={handleLogIn}
              type="button"
            >
              Log in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
