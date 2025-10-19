import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <AuthLayout
      title="Reset your password"
      subtitle="Enter a new password to regain access"
    >
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not update your password</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {message && !error ? (
        <Alert>
          <AlertTitle>Password updated</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {!isTokenReady ? (
        <Alert>
          <AlertTitle>Waiting for confirmation</AlertTitle>
          <AlertDescription>
            Follow the link from your email again to load a valid reset token before saving a new
            password.
          </AlertDescription>
        </Alert>
      ) : null}

      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={handlePasswordChange}
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password-confirm">Confirm password</Label>
          <Input
            id="password-confirm"
            type="password"
            autoComplete="new-password"
            value={password2}
            onChange={handlePasswordConfirmChange}
            required
            disabled={isLoading}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isLoading || !isTokenReady}
        >
          {isLoading ? "Saving..." : "Save password"}
        </Button>
      </form>

      <div className="text-center text-sm text-zinc-400">
        <Button
          type="button"
          variant="link"
          className="px-1 font-semibold text-sky-400 hover:text-sky-300"
          onClick={handleBackToLogin}
          disabled={isLoading}
        >
          Back to login
        </Button>
      </div>
    </AuthLayout>
  );
};
