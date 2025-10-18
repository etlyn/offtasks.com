import { useRouter } from "next/router";
import type { NextPage } from "next";
import { useEffect, useMemo, useState, type ChangeEvent, type MouseEvent } from "react";
import { supabaseClient } from "@/lib/supabase";
import { LogoWordmark } from "@/components";

const ResetPasswordPage: NextPage = () => {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isTokenReady = useMemo(
    () => typeof accessToken === "string" && accessToken.length > 0,
    [accessToken]
  );

  useEffect(() => {
    const token = router.query.access_token;
    if (typeof token === "string") {
      setAccessToken(token);
    }
  }, [router.query.access_token]);

  const handleSubmit = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!password || !password2) {
      setError("Please enter and confirm your new password.");
      return;
    }

    if (password !== password2) {
      setError("Passwords do not match.");
      return;
    }

    if (!isTokenReady || !accessToken) {
      setError("Reset link is invalid or has expired. Request a new one from the login page.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: updateError } = await supabaseClient.auth.api.updateUser(accessToken, {
        password,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setMessage("Password updated. Redirecting to login...");
        setTimeout(() => {
          router.push("/login").catch(() => {
            setError("We couldn't redirect you to the login page.");
          });
        }, 1500);
      }
    } catch (unknownError) {
      const message =
        unknownError instanceof Error ? unknownError.message : "Unable to update the password.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };

  const handlePasswordConfirmChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword2(event.target.value);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900">
      <div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-800/60 px-6 py-10 shadow-xl backdrop-blur md:px-12">
        <div className="flex justify-center">
          <LogoWordmark />
        </div>

        <div className="mt-10">
          <h1 className="text-2xl font-semibold text-zinc-50">Reset password</h1>

          {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
          {message && !error ? <p className="mt-4 text-sm text-emerald-400">{message}</p> : null}

          {!isTokenReady ? (
            <p className="mt-4 text-sm text-zinc-400">
              Provide a new password once you arrive here via the reset link.
            </p>
          ) : null}

          <label className="mt-6 block text-sm font-medium text-zinc-200" htmlFor="password">
            New password
          </label>
          <input
            id="password"
            onChange={handlePasswordChange}
            className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            type="password"
            value={password}
            required
            disabled={isLoading}
          />

          <label className="mt-6 block text-sm font-medium text-zinc-200" htmlFor="password-confirm">
            Confirm password
          </label>
          <input
            id="password-confirm"
            onChange={handlePasswordConfirmChange}
            className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            type="password"
            value={password2}
            required
            disabled={isLoading}
          />

          <button
            className="mt-8 w-full rounded-lg bg-cyan-600 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleSubmit}
            disabled={isLoading}
            type="button"
          >
            Save password
          </button>

          <button
            className="mt-6 text-sm text-cyan-300 underline transition hover:text-cyan-200"
            onClick={() => {
              router.push("/login").catch(() => {
                setError("We couldn't redirect you to the login page.");
              });
            }}
            type="button"
          >
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
