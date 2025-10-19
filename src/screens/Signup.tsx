import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { LogoWordmark } from "@/components/LogoWordmark";
import { supabaseClient } from "@/lib/supabase";

export const SignupScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const navigate = useNavigate();

  const submitHandler = async (event: FormEvent<HTMLFormElement>) => {
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
    navigate("/login");
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
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12">
      <div className="w-full" style={{ maxWidth: '400px' }}>
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-6">
            <LogoWordmark width={160} height={40} />
          </div>
          <h1 className="text-4xl font-semibold text-white mb-3">Create account</h1>
          <p className="text-zinc-400 text-base">Start organizing your tasks today</p>
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
          <form className="space-y-5" onSubmit={submitHandler} noValidate>
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
                autoComplete="new-password"
                value={password}
                onChange={changeHandlerPassword}
                disabled={isLoading}
                required
                placeholder="Create a password"
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
                onChange={changeHandlerPassword2}
                disabled={isLoading}
                required
                placeholder="Repeat your password"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-base text-white placeholder:text-zinc-500 transition focus:border-zinc-600 focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-700/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-white px-4 py-3 text-base font-semibold text-black transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <span className="text-sm text-zinc-400">Already have an account?</span>{" "}
          <button
            type="button"
            onClick={handleLogIn}
            disabled={isLoading}
            className="text-sm font-semibold text-white transition hover:text-zinc-300 disabled:opacity-50"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};
