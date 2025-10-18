import { useState } from "react";
import { supabaseClient } from "../backend";
import { useRouter } from "next/router";
import { LogoXL } from "../icons";
import { v4 as uuidv4 } from "uuid";

const Page = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const router = useRouter();

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await supabaseClient.auth.signIn({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage("Signed in successfully. Redirecting...");
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const changeHandlerEmail = (event) => {
    setEmail(event.target.value);
  };

  const changeHandlerPassword = (event) => {
    setPassword(event.target.value);
  };

  const handleSignUp = () => {
    router.push("/signup");
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const uniqueCredentials = uuidv4();
      const guestEmail = `${uniqueCredentials}@example.com`;
      const { error } = await supabaseClient.auth.signUp({
        email: guestEmail,
        password: uniqueCredentials,
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage(
          "Guest account created. Please check the mailbox to confirm before signing in."
        );
      }
    } catch (error) {
      setError(error.message);
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
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined;

      const { error } = await supabaseClient.auth.api.resetPasswordForEmail(
        email,
        {
          redirectTo,
        }
      );

      if (error) {
        setError(error.message);
      } else {
        setMessage("Check your email for the password reset link.");
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
        <div className="flex justify-end text-cyan-500 cursor-pointer">
          <button
            className=" md:py-8 md:px-12 py-6 px-6"
            onClick={handleGuestLogin}
          >
            <h1 className="font-medium">I&apos;m a Guest</h1>
          </button>
        </div>

        <div className="container flex justify-center items-center md:mt-0 mt-6">
          <LogoXL />
        </div>
        <div className="container flex flex-col justify-center items-center mt-12 md:w-2/6 w-3/4">
          <h1 className="text-zinc-50 text-xl font-bold">Log in</h1>

          {error && (
            <p className="text-red-400 text-sm mt-4 text-center">{error}</p>
          )}
          {message && !error && (
            <p className="text-emerald-400 text-sm mt-4 text-center">{message}</p>
          )}

          <h1 className="text-zinc-50 mt-4 self-start mb-2 font-medium text-sm">
            Email
          </h1>
          <input
            type="email"
            className="border-zinc-100  border  bg-transparent rounded-md h-12 w-full px-4 text-zinc-50"
            onChange={changeHandlerEmail}
            required=""
            disabled={isLoading}
          />

          <h1 className="text-zinc-50 mt-4 self-start mb-2 font-medium text-sm">
            Password
          </h1>
          <input
            onChange={changeHandlerPassword}
            className="border-zinc-100  border  bg-transparent rounded-md h-12 w-full px-4 text-zinc-50"
            type="password"
            required=""
            disabled={isLoading}
          />

          <button
            type="button"
            className="text-zinc-50 mt-4 self-end mb-2 font-light text-sm underline"
            onClick={handlePasswordReset}
            disabled={isLoading}
          >
            Forgot Password?
          </button>

          <button
            className=" bg-cyan-600 mt-8 w-full h-12 rounded-lg"
            onClick={handleLogin}
            disabled={isLoading}
          >
            <h1 className="text-zinc-50 text-sm  font-light">Log in</h1>
          </button>

          <div
            className="mt-6 flex flex-row w-full text-zinc-50  justify-center cursor-pointer"
            onClick={handleSignUp}
          >
            <h1 className="font-light text-sm text-center">
              Don not have an account?
            </h1>
            <h1 className="font-bold text-sm ml-2">Sign Up</h1>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
