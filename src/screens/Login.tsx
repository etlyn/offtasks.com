import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { LogoWordmark } from "@/components/LogoWordmark";
import { supabaseClient } from "@/lib/supabase";

const mapAuthErrorMessage = (raw: string): string => {
  const normalized = raw.toLowerCase();

  if (normalized.includes("email not confirmed")) {
    return "Confirm your email from the signup message before signing in.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "We couldn't find a matching account. Double-check your email and password.";
  }

  if (normalized.includes("too many requests")) {
    return "Too many attempts in a short period. Wait a moment and try again.";
  }

  return raw;
};

export const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Enter the email you used to sign up.");
      setMessage(null);
      return;
    }

    if (!password) {
      setError("Enter your password to continue.");
      setMessage(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: signInError } = await supabaseClient.auth.signIn({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        setError(mapAuthErrorMessage(signInError.message));
      } else {
        setMessage("Welcome back! Redirecting to your workspace...");
        setTimeout(() => {
          navigate("/");
        }, 600);
      }
    } catch (unknownError) {
      const fallback =
        unknownError instanceof Error ? unknownError.message : "Unable to sign in.";
      setError(mapAuthErrorMessage(fallback));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Enter your email address first.");
      setMessage(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;

      const { error: resetError } = await supabaseClient.auth.api.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      });

      if (resetError) {
        setError(mapAuthErrorMessage(resetError.message));
      } else {
        setMessage("Check your inbox for the password reset link.");
      }
    } catch (unknownError) {
      const fallback =
        unknownError instanceof Error ? unknownError.message : "Unable to initiate the password reset.";
      setError(mapAuthErrorMessage(fallback));
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
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12">
      <div className="w-full" style={{ maxWidth: '400px' }}>
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-6">
            <LogoWordmark width={160} height={40} />
          </div>
          <h1 className="text-4xl font-semibold text-white mb-3">Welcome back</h1>
          <p className="text-zinc-400 text-base">Sign in to access your workspace</p>
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

          {/* Form */}
          <form className="space-y-5" onSubmit={handleLogin} noValidate>
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={changeHandlerEmail}
                disabled={isLoading}
                required
                autoFocus
                placeholder="you@example.com"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-base text-white placeholder:text-zinc-500 transition focus:border-zinc-600 focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-700/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={changeHandlerPassword}
                disabled={isLoading}
                required
                placeholder="Enter your password"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-base text-white placeholder:text-zinc-500 transition focus:border-zinc-600 focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-700/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={isLoading}
                className="text-sm font-medium text-zinc-400 transition hover:text-white disabled:opacity-50"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-white px-4 py-3 text-base font-semibold text-black transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <span className="text-sm text-zinc-400">Don't have an account?</span>{" "}
          <button
            type="button"
            onClick={handleSignUp}
            disabled={isLoading}
            className="text-sm font-semibold text-white transition hover:text-zinc-300 disabled:opacity-50"
          >
            Create one
          </button>
        </div>
      </div>
    </div>
  );
};
