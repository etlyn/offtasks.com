import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { supabaseClient } from "../backend";
import { LogoXL } from "../icons";

const ResetPassword = () => {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState(null);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const isTokenReady = useMemo(
    () => typeof accessToken === "string" && accessToken.length > 0,
    [accessToken]
  );

  useEffect(() => {
    if (typeof router.query.access_token === "string") {
      setAccessToken(router.query.access_token);
    }
  }, [router.query.access_token]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!password || !password2) {
      setError("Please enter and confirm your new password.");
      return;
    }

    if (password !== password2) {
      setError("Passwords do not match.");
      return;
    }

    if (!isTokenReady) {
      setError("Reset link is invalid or has expired. Request a new one from the login page.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabaseClient.auth.api.updateUser(accessToken, {
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage("Password updated. Redirecting to login...");
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className=" bg-zinc-900 flex flex-1 h-screen items-center">
      <div className="bg-zinc-800 h-3/4 md:w-3/5 w-full container  rounded-lg">
        <div className="container flex justify-center items-center mt-12">
          <LogoXL />
        </div>

        <div className="container flex flex-col justify-center items-center mt-12 md:w-2/6 w-3/4">
          <h1 className="text-zinc-50 text-xl font-bold">Reset Password</h1>

          {error && (
            <p className="text-red-400 text-sm mt-4 text-center">{error}</p>
          )}
          {message && !error && (
            <p className="text-emerald-400 text-sm mt-4 text-center">{message}</p>
          )}

          {!isTokenReady && (
            <p className="text-zinc-400 text-sm mt-4 text-center">
              Provide a new password once you arrive here via the reset link.
            </p>
          )}

          <h1 className="text-zinc-50 mt-4 self-start mb-2 font-medium text-sm">
            New Password
          </h1>
          <input
            onChange={(event) => setPassword(event.target.value)}
            className="border-zinc-100  border  bg-transparent rounded-md h-12 w-full px-4 text-zinc-50"
            type="password"
            value={password}
            required=""
            disabled={isLoading}
          />

          <h1 className="text-zinc-50 mt-4 self-start mb-2 font-medium text-sm">
            Confirm Password
          </h1>
          <input
            onChange={(event) => setPassword2(event.target.value)}
            className="border-zinc-100  border  bg-transparent rounded-md h-12 w-full px-4 text-zinc-50"
            type="password"
            value={password2}
            required=""
            disabled={isLoading}
          />

          <button
            className=" bg-cyan-600 mt-8 w-full h-12 rounded-lg"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            <h1 className="text-zinc-50 text-sm  font-light">Save Password</h1>
          </button>

          <button
            className="mt-6 text-zinc-50 text-sm underline"
            onClick={() => router.push("/login")}
            type="button"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
