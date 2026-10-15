import assert from "node:assert/strict";
import test from "node:test";
import { AuthError, type Factor, type SupabaseClient } from "@supabase/supabase-js";
import {
  getPasswordRecoveryRequirement,
  verifyPasswordRecoveryFactor,
  type RecoveryFactor,
} from "../src/lib/password-recovery.js";

type RecoveryAuth = SupabaseClient["auth"];
type AssuranceResponse = Awaited<ReturnType<RecoveryAuth["mfa"]["getAuthenticatorAssuranceLevel"]>>;
type FactorsResponse = Awaited<ReturnType<RecoveryAuth["mfa"]["listFactors"]>>;
type VerificationResponse = Awaited<ReturnType<RecoveryAuth["mfa"]["challengeAndVerify"]>>;
type FakeMfa = Pick<RecoveryAuth["mfa"],
  "getAuthenticatorAssuranceLevel" | "listFactors" | "challengeAndVerify" | "verify">;
type MfaCall = { method: string; params?: unknown };

const totp: RecoveryFactor = { id: "authenticator", factor_type: "totp", friendly_name: "My phone" };
const phone: RecoveryFactor = { id: "mobile", factor_type: "phone", phone: "+15550000000" };

function serverFactor(
  factor: RecoveryFactor | { id: string; factor_type: "webauthn" },
  status: Factor["status"] = "verified",
): Factor {
  return { ...factor, status, created_at: "2026-10-15T00:00:00Z", updated_at: "2026-10-15T00:00:00Z" };
}

function assuranceResponse(
  currentLevel: "aal1" | "aal2" | null,
  nextLevel = currentLevel,
): AssuranceResponse {
  return { data: { currentLevel, nextLevel, currentAuthenticationMethods: [] }, error: null };
}

function fakeAuth({
  assurance = assuranceResponse("aal1"),
  factors = [],
  factorError,
  verificationError,
  upgradedAssurance = assuranceResponse("aal2"),
}: {
  assurance?: AssuranceResponse;
  factors?: Factor[];
  factorError?: AuthError;
  verificationError?: AuthError;
  upgradedAssurance?: AssuranceResponse;
} = {}) {
  const calls: MfaCall[] = [];
  let verified = false;
  const verify = async (params: unknown): Promise<VerificationResponse> => {
    calls.push({ method: "verify", params });
    // Force a promise boundary, so an unawaited verification cannot appear to
    // have upgraded the session before the assurance check.
    await Promise.resolve();
    if (verificationError) return { data: null, error: verificationError };
    verified = true;
    return {
      data: {
        access_token: "test-access-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "test-refresh-token",
        user: { id: "test-user", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "2026-10-15T00:00:00Z" },
      },
      error: null,
    };
  };

  const mfa: FakeMfa = {
    getAuthenticatorAssuranceLevel: async () => {
      calls.push({ method: "getAuthenticatorAssuranceLevel" });
      return verified ? upgradedAssurance : assurance;
    },
    listFactors: async (): Promise<FactorsResponse> => {
      calls.push({ method: "listFactors" });
      if (factorError) return { data: null, error: factorError };
      return { data: { all: factors, totp: [], phone: [], webauthn: [] }, error: null };
    },
    challengeAndVerify: async (params) => {
      const result = verify(params);
      calls[calls.length - 1].method = "challengeAndVerify";
      return result;
    },
    verify,
  };

  // Only the MFA surface used by these helpers is needed by the fake.
  return { auth: { mfa } as unknown as RecoveryAuth, calls };
}

test("an AAL1 session without verified factors can reset its password", async () => {
  const { auth, calls } = fakeAuth();
  assert.deepEqual(await getPasswordRecoveryRequirement(auth), { required: false, factors: [] });
  assert.deepEqual(calls, [
    { method: "getAuthenticatorAssuranceLevel" },
    { method: "listFactors" },
  ]);
});

test("unfinished MFA enrollments do not require verification", async () => {
  const { auth } = fakeAuth({ factors: [serverFactor(totp, "unverified"), serverFactor(phone, "unverified")] });
  assert.deepEqual(await getPasswordRecoveryRequirement(auth), { required: false, factors: [] });
});

test("current verified factors require MFA even when the session's next level is stale", async () => {
  const { auth } = fakeAuth({ factors: [serverFactor(totp), serverFactor(phone)] });
  assert.deepEqual(await getPasswordRecoveryRequirement(auth), {
    required: true,
    factors: [totp, { ...phone, friendly_name: undefined }],
  });
});

test("an AAL2 session does not need to repeat verification", async () => {
  const { auth } = fakeAuth({ assurance: assuranceResponse("aal2"), factors: [serverFactor(totp)] });
  assert.deepEqual(await getPasswordRecoveryRequirement(auth), { required: false, factors: [totp] });
});

test("a missing recovery session fails closed", async () => {
  const { auth, calls } = fakeAuth({ assurance: assuranceResponse(null) });
  await assert.rejects(getPasswordRecoveryRequirement(auth), /session has expired/);
  assert.deepEqual(calls, [{ method: "getAuthenticatorAssuranceLevel" }]);
});

test("assurance lookup errors are preserved and cannot bypass MFA", async () => {
  const error = new AuthError("Assurance lookup failed");
  const { auth } = fakeAuth({ assurance: { data: null, error } });
  await assert.rejects(getPasswordRecoveryRequirement(auth), (result) => result === error);
});

test("factor lookup errors are preserved and cannot be treated as no MFA", async () => {
  const error = new AuthError("Factor lookup failed");
  const { auth } = fakeAuth({ factorError: error });
  await assert.rejects(getPasswordRecoveryRequirement(auth), (result) => result === error);
});

test("a stale session next level does not require factors that have been removed", async () => {
  for (const factors of [[], [serverFactor(totp, "unverified")]]) {
    const { auth } = fakeAuth({ assurance: assuranceResponse("aal1", "aal2"), factors });
    assert.deepEqual(await getPasswordRecoveryRequirement(auth), { required: false, factors: [] });
  }
});

test("a required MFA step without supported factors directs the user to support", async () => {
  const { auth } = fakeAuth({
    assurance: assuranceResponse("aal1", "aal2"),
    factors: [serverFactor({ id: "security-key", factor_type: "webauthn" })],
  });
  await assert.rejects(getPasswordRecoveryRequirement(auth), /Contact support/);
});

test("verified unsupported factors still require MFA when the session snapshot is stale", async () => {
  const { auth } = fakeAuth({ factors: [serverFactor({ id: "security-key", factor_type: "webauthn" })] });
  await assert.rejects(getPasswordRecoveryRequirement(auth), /Contact support/);
});

test("a valid authenticator code upgrades the session before returning", async () => {
  const { auth, calls } = fakeAuth();
  await verifyPasswordRecoveryFactor(auth, totp, " 123456 ");
  assert.deepEqual(calls, [
    { method: "challengeAndVerify", params: { factorId: totp.id, code: "123456" } },
    { method: "getAuthenticatorAssuranceLevel" },
  ]);
});

test("an invalid authenticator code does not check assurance or permit completion", async () => {
  const error = new AuthError("Invalid verification code");
  const { auth, calls } = fakeAuth({ verificationError: error });
  await assert.rejects(verifyPasswordRecoveryFactor(auth, totp, "000000"), (result) => result === error);
  assert.deepEqual(calls, [
    { method: "challengeAndVerify", params: { factorId: totp.id, code: "000000" } },
  ]);
});

test("phone verification uses the challenge explicitly sent by the screen", async () => {
  const { auth, calls } = fakeAuth();
  await verifyPasswordRecoveryFactor(auth, phone, "123456", "phone-challenge");
  assert.deepEqual(calls, [
    { method: "verify", params: { factorId: phone.id, challengeId: "phone-challenge", code: "123456" } },
    { method: "getAuthenticatorAssuranceLevel" },
  ]);
});

test("phone verification cannot implicitly send a code or proceed without a challenge", async () => {
  const { auth, calls } = fakeAuth();
  await assert.rejects(verifyPasswordRecoveryFactor(auth, phone, "123456"), /Send a verification code/);
  assert.deepEqual(calls, []);
});

test("an invalid phone code does not permit completion", async () => {
  const error = new AuthError("Invalid verification code");
  const { auth, calls } = fakeAuth({ verificationError: error });
  await assert.rejects(verifyPasswordRecoveryFactor(auth, phone, "000000", "phone-challenge"), (result) => result === error);
  assert.deepEqual(calls, [
    { method: "verify", params: { factorId: phone.id, challengeId: "phone-challenge", code: "000000" } },
  ]);
});

test("expired MFA challenges direct the user to get a fresh verification code", async () => {
  const errors = [
    new AuthError("MFA challenge is no longer valid", 400, "mfa_challenge_expired"),
    new AuthError("The code is no longer valid", 400, "otp_expired"),
    new AuthError("MFA challenge has expired"),
    new AuthError("Token has expired or is invalid"),
  ];
  for (const verificationError of errors) {
    for (const factor of [phone, totp]) {
      const { auth, calls } = fakeAuth({ verificationError });
      await assert.rejects(
        verifyPasswordRecoveryFactor(auth, factor, "123456", "phone-challenge"),
        { message: factor.factor_type === "phone"
          ? "That verification code is no longer valid. Send a new phone code and try again."
          : "That verification code is no longer valid. Enter the latest code from your authenticator app and try again." },
      );
      assert.equal(calls.length, 1);
    }
  }
});

test("actual session or JWT expiry is preserved during MFA verification", async () => {
  const errors = [
    new AuthError("JWT has expired", 401, "bad_jwt"),
    new AuthError("Token has expired or is invalid", 401, "session_expired"),
    new AuthError("Your session has expired"),
  ];
  for (const verificationError of errors) {
    const { auth } = fakeAuth({ verificationError });
    await assert.rejects(
      verifyPasswordRecoveryFactor(auth, phone, "123456", "phone-challenge"),
      (result) => result === verificationError,
    );
  }
});

test("verification must actually produce an AAL2 session", async () => {
  for (const currentLevel of ["aal1", null] as const) {
    const { auth } = fakeAuth({ upgradedAssurance: assuranceResponse(currentLevel) });
    await assert.rejects(verifyPasswordRecoveryFactor(auth, totp, "123456"), /verification did not complete/);
  }
});

test("assurance errors after verification fail closed", async () => {
  const error = new AuthError("Unable to read the upgraded session");
  const { auth } = fakeAuth({ upgradedAssurance: { data: null, error } });
  await assert.rejects(verifyPasswordRecoveryFactor(auth, totp, "123456"), (result) => result === error);
});

test("an empty verification code does not call the server", async () => {
  const { auth, calls } = fakeAuth();
  await assert.rejects(verifyPasswordRecoveryFactor(auth, totp, "  "), /Enter your verification code/);
  assert.deepEqual(calls, []);
});
