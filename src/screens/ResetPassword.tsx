import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LogoWordmark } from "@/components/LogoWordmark";
import { supabaseClient } from "@/lib/supabase";

export const ResetPasswordScreen = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
    const token = searchParams.get("access_token");
    if (token) {
      setAccessToken(token);
    }
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
          navigate("/login");
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

  const handleBackToLogin = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12">
      <div className="w-full" style={{ maxWidth: '400px' }}>
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-6">
            <LogoWordmark width={160} height={40} />
          </div>
          <h1 className="text-4xl font-semibold text-white mb-3">Reset password</h1>
          <p className="text-zinc-400 text-base">Enter a new password to regain access</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-6 shadow-2xl">
          {/* Alerts */}
          {error ? (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          ) : null}

          {message && !error ? (
            <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
              {message}
            </div>
          ) : null}

          {!isTokenReady ? (
            <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
              Follow the link from your email again to load a valid reset token before saving a new password.
            </div>
          ) : null}

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
                New password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={handlePasswordChange}
                disabled={isLoading}
                required
                autoFocus
                placeholder="Enter new password"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-base text-white placeholder:text-zinc-500 transition focus:border-zinc-600 focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-700/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password-confirm" className="block text-sm font-medium text-zinc-300">
                Confirm password
              </label>
              <input
                id="password-confirm"
                type="password"
                autoComplete="new-password"
                value={password2}
                onChange={handlePasswordConfirmChange}
                disabled={isLoading}
                required
                placeholder="Confirm new password"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-base text-white placeholder:text-zinc-500 transition focus:border-zinc-600 focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-700/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !isTokenReady}
              className="w-full rounded-lg bg-white px-4 py-3 text-base font-semibold text-black transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Saving..." : "Save password"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={handleBackToLogin}
            disabled={isLoading}
            className="text-sm font-semibold text-white transition hover:text-zinc-300 disabled:opacity-50"
          >
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
};
