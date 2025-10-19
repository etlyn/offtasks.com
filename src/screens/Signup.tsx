import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <AuthLayout
      title="Create an account"
      subtitle="Start organizing your tasks today"
    >
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not create your account</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {message && !error ? (
        <Alert>
          <AlertTitle>Check your inbox</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <form className="space-y-6" onSubmit={submitHandler} noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={changeHandlerEmail}
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Create password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={changeHandlerPassword}
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password-confirm">Repeat password</Label>
          <Input
            id="password-confirm"
            type="password"
            autoComplete="new-password"
            value={password2}
            onChange={changeHandlerPassword2}
            required
            disabled={isLoading}
          />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
          {isLoading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <div className="text-center text-sm text-zinc-400">
        <span>Already a member?</span>
        <Button
          type="button"
          variant="link"
          className="px-1 font-semibold text-sky-400 hover:text-sky-300"
          onClick={handleLogIn}
          disabled={isLoading}
        >
          Log in
        </Button>
      </div>
    </AuthLayout>
  );
};
