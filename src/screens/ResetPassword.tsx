import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";
import { AuthNotice } from "@/components/public/AuthNotice";
import {
  AuthPasswordInput,
  AuthTextInput,
  PasswordChecklist,
  authInputClassName,
} from "@/components/public/AuthFields";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  getPasswordRecoveryRequirement,
  verifyPasswordRecoveryFactor,
  type RecoveryFactor,
} from "@/lib/password-recovery";
import { supabaseClient } from "@/lib/supabase";
import { useAuth } from "@/providers/auth";
import {
  getAuthUrlParams,
  getPasswordValidationError,
  mapAuthErrorMessage,
} from "@/utils/auth";

export const ResetPasswordScreen = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [requirement, setRequirement] = useState<{
    required: boolean;
    factors: RecoveryFactor[];
  } | null>(null);
  const [isCheckingMfa, setIsCheckingMfa] = useState(true);
  const [checkAttempt, setCheckAttempt] = useState(0);
  const [selectedFactorId, setSelectedFactorId] = useState("");
  const [code, setCode] = useState("");
  const [phoneChallenge, setPhoneChallenge] = useState<{
    factorId: string;
    id: string;
  } | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [completedUserId, setCompletedUserId] = useState<string | null>(null);
  const [isSignedOut, setIsSignedOut] = useState(false);
  const isTokenReady = Boolean(session?.access_token);
  const selectedFactor = requirement?.factors.find(
    (factor) => factor.id === selectedFactorId,
  ) ?? requirement?.factors[0];

  useEffect(() => {
    const params = getAuthUrlParams();
    if (params.errorDescription) {
      setError(mapAuthErrorMessage(params.errorDescription));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setRequirement(null);
    setIsCheckingMfa(isTokenReady && !isComplete);
    if (!isTokenReady || isComplete) return;

    void getPasswordRecoveryRequirement(supabaseClient.auth)
      .then((next) => {
        if (!cancelled) setRequirement(next);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(mapAuthErrorMessage(
            cause instanceof Error ? cause.message : "Unable to check account verification. Try again.",
          ));
        }
      })
      .finally(() => {
        if (!cancelled) setIsCheckingMfa(false);
      });

    return () => { cancelled = true; };
  }, [session?.access_token, isTokenReady, checkAttempt, isComplete]);

  useEffect(() => {
    setPassword("");
    setPasswordConfirmation("");
    setCode("");
    setPhoneChallenge(null);
    setSelectedFactorId("");
  }, [session?.user.id]);

  useEffect(() => {
    if (!isSignedOut) return;
    const timeout = setTimeout(() => navigate("/login", { replace: true }), 900);
    return () => clearTimeout(timeout);
  }, [isSignedOut, navigate]);

  const requireSameAccount = async (userId: string) => {
    const { data, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError) throw sessionError;
    if (!data.session || data.session.user.id !== userId) {
      throw new Error("Your sign-in session changed. Open your password reset link again before continuing.");
    }
  };

  const finishSignOut = async (userId: string) => {
    const { data, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError) throw sessionError;
    if (data.session && data.session.user.id !== userId) {
      throw new Error("Your password was updated, but the signed-in account changed. Return to your account to continue.");
    }
    if (data.session) {
      const { error: signOutError } = await supabaseClient.auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;
    }
    setIsSignedOut(true);
    setError(null);
    setMessage("Password updated. Sign in with your new password.");
  };

  const retrySignOut = async () => {
    if (!completedUserId || isLoading) return;
    setIsLoading(true);
    try {
      await finishSignOut(completedUserId);
    } catch {
      setError("Your password is saved. Sign-out could not finish. Please try signing out again.");
    } finally {
      setIsLoading(false);
    }
  };

  const sendPhoneCode = async () => {
    const userId = session?.user.id;
    if (!userId || !selectedFactor || selectedFactor.factor_type !== "phone" || isLoading) return;
    setIsLoading(true);
    setIsSendingCode(true);
    setPhoneChallenge(null);
    setCode("");
    setError(null);
    setMessage(null);
    try {
      await requireSameAccount(userId);
      const { data, error: challengeError } = await supabaseClient.auth.mfa.challenge({
        factorId: selectedFactor.id,
        channel: "sms",
      });
      if (challengeError) throw challengeError;
      await requireSameAccount(userId);
      setPhoneChallenge({ factorId: selectedFactor.id, id: data.id });
      setMessage("Verification code sent to your registered phone.");
    } catch (cause) {
      setError(mapAuthErrorMessage(
        cause instanceof Error ? cause.message : "Unable to send a verification code. Try again.",
      ));
    } finally {
      setIsLoading(false);
      setIsSendingCode(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading || isComplete || isCheckingMfa || !requirement) return;
    const userId = session?.user.id;

    const passwordError = getPasswordValidationError(password);
    if (passwordError) {
      setError(passwordError);
      setMessage(null);
      return;
    }

    if (password !== passwordConfirmation) {
      setError("Passwords do not match.");
      setMessage(null);
      return;
    }

    if (!isTokenReady || !userId) {
      setError(
        "Reset link is invalid or has expired. Request a new one from the login page.",
      );
      setMessage(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Recheck immediately before saving: MFA may have changed in another client.
      const current = await getPasswordRecoveryRequirement(supabaseClient.auth);
      await requireSameAccount(userId);
      setRequirement(current);
      if (current.required) {
        const factor = current.factors.find((item) => item.id === selectedFactor?.id);
        if (!requirement.required || !factor) {
          setSelectedFactorId(current.factors[0]?.id ?? "");
          setCode("");
          setPhoneChallenge(null);
          setError("Verify your identity below before saving your new password.");
          return;
        }
        if (!/^\d{6}$/.test(code.trim())) {
          setError("Enter the 6-digit verification code.");
          return;
        }
        await verifyPasswordRecoveryFactor(
          supabaseClient.auth,
          factor,
          code.trim(),
          phoneChallenge?.factorId === factor.id ? phoneChallenge.id : undefined,
        );
        setCode("");
        setPhoneChallenge(null);
      }

      await requireSameAccount(userId);

      const { error: updateError } = await supabaseClient.auth.updateUser(
        {
          password,
        },
      );

      if (updateError) {
        setError(mapAuthErrorMessage(updateError.message));
      } else {
        setPassword("");
        setPasswordConfirmation("");
        setIsComplete(true);
        setCompletedUserId(userId);
        setMessage("Your new password is saved.");
        try {
          await finishSignOut(userId);
        } catch {
          setError("Your password is saved. Sign-out could not finish. Please try signing out again.");
        }
      }
    } catch (unknownError) {
      const nextMessage =
        unknownError instanceof Error
          ? unknownError.message
          : "Unable to update the password.";
      setError(mapAuthErrorMessage(nextMessage));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Secure access"
      title="Choose a new password"
      subtitle="Choose a strong password to secure your account."
      heroTitle="Reset access without losing momentum."
      heroDescription="Use the link from your email to set a new password. If two-factor authentication is enabled, you’ll also verify your identity."
      heroBullets={[
        "Open the newest password reset email on this device.",
        "Keep your authenticator or registered phone nearby.",
        "Sign in with your new password when you’re done.",
      ]}
      switchHref="/login"
      switchLabel="Back to sign in"
      switchPrompt="Want to return to the login screen?"
    >
      {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}
      {message ? <AuthNotice tone="success">{message}</AuthNotice> : null}
      {isComplete && !isSignedOut ? (
        <Button type="button" variant="outline" className="h-11" disabled={isLoading} onClick={retrySignOut}>
          {isLoading ? "Signing out..." : "Retry sign out"}
        </Button>
      ) : null}
      {!isTokenReady && !isComplete ? (
        <AuthNotice tone="info">
          Open the newest reset link from your email, or{" "}
          <Link to="/forgot-password" className="underline">request a new link</Link>.
        </AuthNotice>
      ) : null}
      {isCheckingMfa ? (
        <p role="status" className="text-sm text-[#5a7671]">Checking account security...</p>
      ) : isTokenReady && !requirement && !isComplete ? (
        <Button type="button" variant="outline" className="h-11" onClick={() => {
          setError(null);
          setCheckAttempt((attempt) => attempt + 1);
        }}>Retry security check</Button>
      ) : null}

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <AuthPasswordInput
          id="password"
          autoComplete="new-password"
          label="New password"
          placeholder="Enter a new password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isLoading || isComplete}
          required
          autoFocus
        />

        <PasswordChecklist password={password} />

        <AuthPasswordInput
          id="password-confirm"
          autoComplete="new-password"
          label="Confirm password"
          placeholder="Repeat your new password"
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          disabled={isLoading || isComplete}
          required
        />

        {requirement?.required && selectedFactor ? (
          <fieldset className="space-y-4" disabled={isLoading || isComplete}>
            <legend className="text-sm font-semibold text-[#244642]">Verify your identity</legend>
            <p className="text-sm text-[#5a7671]">
              Two-factor authentication is enabled. Enter a code to finish resetting your password.
            </p>
            {requirement.factors.length > 1 ? (
              <div className="space-y-2.5">
                <Label htmlFor="verification-method">Verification method</Label>
                <select id="verification-method" className={`${authInputClassName} text-base`}
                  value={selectedFactor.id} onChange={(event) => {
                    setSelectedFactorId(event.target.value);
                    setCode("");
                    setPhoneChallenge(null);
                    setError(null);
                    setMessage(null);
                  }}>
                  {requirement.factors.map((factor, index) => (
                    <option key={factor.id} value={factor.id}>
                      {factor.friendly_name || (factor.factor_type === "phone"
                        ? `Phone ending in ${factor.phone?.slice(-4) || "••••"}`
                        : `Authenticator ${index + 1}`)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {selectedFactor.factor_type === "phone" ? (
              <Button type="button" variant="outline" className="h-11" onClick={sendPhoneCode}>
                {phoneChallenge?.factorId === selectedFactor.id ? "Resend code" : "Send verification code"}
              </Button>
            ) : null}
            <AuthTextInput
              id="verification-code"
              label={selectedFactor.factor_type === "phone" ? "Phone verification code" : "Authenticator code"}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="text-base"
              required
            />
            <p className="text-sm text-[#5a7671]">
              Lost access to your verification method?{" "}
              <Link to="/support" className="underline">Contact support</Link> for help recovering your account.
            </p>
          </fieldset>
        ) : null}

        <Button
          type="submit"
          disabled={isLoading || !isTokenReady || isCheckingMfa || !requirement || isComplete}
          className="h-12 w-full rounded-2xl bg-[#134E4A] text-sm font-semibold text-white shadow-[0_24px_56px_-32px_rgba(9,48,43,0.72)] hover:bg-[#0f3f3b]"
        >
          {isComplete ? "Password updated" : isSendingCode ? "Sending code..." : isLoading ? "Saving password..." : requirement?.required ? "Verify and save password" : "Save new password"}
        </Button>
      </form>
    </AuthLayout>
  );
};
