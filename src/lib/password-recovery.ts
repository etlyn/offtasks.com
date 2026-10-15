import type { AuthError, SupabaseClient } from "@supabase/supabase-js";

type RecoveryAuth = SupabaseClient["auth"];

export type RecoveryFactor = {
  id: string;
  factor_type: "totp" | "phone";
  friendly_name?: string;
  phone?: string;
};

const sessionExpiredMessage =
  "Your password reset session has expired. Request a new password reset link.";
const unsupportedFactorMessage =
  "No supported verified MFA method is available. Contact support for help resetting your password.";

function factorVerificationError(error: AuthError, factorType: RecoveryFactor["factor_type"]): Error {
  const isCodeExpiry = error.code === "mfa_challenge_expired" || error.code === "otp_expired";
  const isLegacyCodeExpiry = !error.code && (
    /mfa challenge\b.*\bexpired\b/i.test(error.message)
    || /^token has expired or is invalid[.!]?$/i.test(error.message.trim())
  );
  if (!isCodeExpiry && !isLegacyCodeExpiry) return error;

  return new Error(factorType === "phone"
    ? "That verification code is no longer valid. Send a new phone code and try again."
    : "That verification code is no longer valid. Enter the latest code from your authenticator app and try again.");
}

export async function getPasswordRecoveryRequirement(
  auth: RecoveryAuth,
): Promise<{ required: boolean; factors: RecoveryFactor[] }> {
  const { data: assurance, error: assuranceError } =
    await auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError) throw assuranceError;
  if (!assurance?.currentLevel) throw new Error(sessionExpiredMessage);

  // Fetch the current factors from the server: the recovery session's user
  // snapshot can lag behind factors that have been verified or removed.
  const { data: factorData, error: factorError } = await auth.mfa.listFactors();
  if (factorError) throw factorError;
  if (!factorData) throw new Error("Unable to check your MFA methods. Please try again.");

  const verifiedFactors = factorData.all.filter((factor) => factor.status === "verified");
  const factors: RecoveryFactor[] = verifiedFactors.flatMap((factor) => {
    if (factor.factor_type !== "totp" && factor.factor_type !== "phone") return [];

    return [{
      id: factor.id,
      factor_type: factor.factor_type,
      friendly_name: factor.friendly_name,
      // Some Auth versions return the phone number even though the SDK's
      // shared Factor type does not declare it.
      ...("phone" in factor && typeof factor.phone === "string" ? { phone: factor.phone } : {}),
    }];
  });

  const required = assurance.currentLevel !== "aal2" && verifiedFactors.length > 0;
  if (required && factors.length === 0) throw new Error(unsupportedFactorMessage);

  return { required, factors };
}

export async function verifyPasswordRecoveryFactor(
  auth: RecoveryAuth,
  factor: RecoveryFactor,
  code: string,
  challengeId?: string,
): Promise<void> {
  const verificationCode = code.trim();
  if (!verificationCode) throw new Error("Enter your verification code.");

  if (factor.factor_type === "totp") {
    const { error } = await auth.mfa.challengeAndVerify({
      factorId: factor.id,
      code: verificationCode,
    });
    if (error) throw factorVerificationError(error, factor.factor_type);
  } else if (factor.factor_type === "phone") {
    if (!challengeId) throw new Error("Send a verification code to your phone first.");
    const { error } = await auth.mfa.verify({
      factorId: factor.id,
      challengeId,
      code: verificationCode,
    });
    if (error) throw factorVerificationError(error, factor.factor_type);
  } else {
    throw new Error(unsupportedFactorMessage);
  }

  // Supabase saves the upgraded session before verification resolves. Confirm
  // that upgrade before allowing the caller to update the password.
  const { data: assurance, error: assuranceError } =
    await auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError) throw assuranceError;
  if (assurance?.currentLevel !== "aal2") {
    throw new Error("MFA verification did not complete. Please try again.");
  }
}
