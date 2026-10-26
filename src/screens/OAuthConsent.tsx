import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ArrowUpRight, Check, LockKeyhole } from "lucide-react";
import { LogoWordmark } from "@/components/LogoWordmark";
import { authReturnRoute, integrationRequestKey } from "@/lib/goalWorkbench";
import {
  authorizationIdFromSearch,
  ConsentError,
  consentErrorMessage,
  consentRoute,
  type ConsentContext,
  type ConsentPermission,
} from "@/lib/oauthConsent";
import { oauthConsentService } from "@/lib/oauthConsentClient";
import { useAuth } from "@/providers/auth";
import "./OAuthConsent.css";

/** This page is deliberately outside the planner shell and its task controls. */
export function OAuthConsentScreen() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const authorizationId = authorizationIdFromSearch(location.search);
  if (!loading && user === null && authorizationId)
    return (
      <Navigate
        to={authReturnRoute("/login", consentRoute(authorizationId))}
        replace
      />
    );
  return (
    <div className="oauth-consent-page">
      <header>
        <Link to="/" aria-label="Offtasks home">
          <LogoWordmark width={126} height={32} />
        </Link>
      </header>
      <main>
        {loading ? (
          <p role="status">Checking your account…</p>
        ) : !authorizationId ? (
          <section className="oauth-consent-panel">
            <h1>Connection unavailable</h1>
            <p role="alert">
              {consentErrorMessage(new ConsentError("invalid"))}
            </p>
            <Link to="/app">Back to Offtasks</Link>
          </section>
        ) : user ? (
          <ConsentRequest
            key={`${user.id}:${authorizationId}`}
            ownerId={user.id}
            authorizationId={authorizationId}
          />
        ) : null}
      </main>
    </div>
  );
}

function ConsentRequest({
  ownerId,
  authorizationId,
}: {
  ownerId: string;
  authorizationId: string;
}) {
  const [context, setContext] = useState<ConsentContext | null>(null);
  const [permissions, setPermissions] = useState<ConsentPermission[]>(["read"]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{
    redirect: string;
    decision: "approve" | "deny";
  } | null>(null);
  const active = useRef(true);
  const locked = useRef(false);
  useEffect(() => {
    active.current = true;
    void oauthConsentService
      .load(authorizationId, ownerId)
      .then((next) => {
        if (active.current) setContext(next);
      })
      .catch((reason: unknown) => {
        if (active.current) setError(consentErrorMessage(reason));
      });
    return () => {
      active.current = false;
    };
  }, [authorizationId, ownerId]);

  const decide = async (decision: "approve" | "deny") => {
    if (!context || locked.current) return;
    locked.current = true;
    setPending(true);
    try {
      const redirect = await oauthConsentService.decide(
        context,
        decision,
        permissions,
        integrationRequestKey(),
      );
      if (active.current) setResult({ redirect, decision });
    } catch (reason) {
      if (active.current) setError(consentErrorMessage(reason));
    } finally {
      if (active.current) setPending(false);
      // Both success and uncertainty consume this local decision. Restarting
      // from the client is safer than blindly resending an authorization.
    }
  };

  if (result)
    return (
      <section className="oauth-consent-panel oauth-consent-enter">
        <Check size={22} aria-hidden="true" />
        <h1>
          {result.decision === "approve"
            ? "Access approved"
            : "Request declined"}
        </h1>
        <p>
          Return to {context?.policy.client_name ?? "your client"} to finish.
        </p>
        <a
          className="oauth-consent-primary"
          href={result.redirect}
          rel="noreferrer"
          referrerPolicy="no-referrer"
        >
          Continue to {new URL(result.redirect).host}
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
        <Link className="oauth-consent-quiet" to="/app">
          Back to Offtasks
        </Link>
      </section>
    );
  return (
    <section
      className="oauth-consent-panel oauth-consent-enter"
      aria-busy={pending}
    >
      <LockKeyhole size={22} aria-hidden="true" />
      <h1>
        {context
          ? `Connect ${context.policy.client_name}`
          : "Connect to Offtasks"}
      </h1>
      {error ? (
        <>
          <p role="alert" className="oauth-consent-error">
            {error}
          </p>
          <Link className="oauth-consent-quiet" to="/app">
            Back to Offtasks
          </Link>
        </>
      ) : context ? (
        <>
          <p>Choose what this client can access.</p>
          <dl className="oauth-consent-identity">
            <div>
              <dt>Account</dt>
              <dd>{context.authorization.user.email || context.ownerId}</dd>
            </div>
            <div>
              <dt>Client</dt>
              <dd>
                {context.policy.client_name}
                <span>{context.authorization.client.id}</span>
              </dd>
            </div>
            <div>
              <dt>Service</dt>
              <dd>{new URL(context.policy.resource).host}</dd>
            </div>
          </dl>
          <fieldset disabled={pending}>
            <legend>Offtasks access</legend>
            <label className="oauth-consent-option">
              <input
                type="radio"
                name="access"
                checked={permissions.length === 1}
                onChange={() => setPermissions(["read"])}
              />
              <span>
                Read only
                <small>
                  View your goals, briefs, plans, tasks and progress.
                </small>
              </span>
            </label>
            {context.policy.allowed_permissions.includes("write") ? (
              <label className="oauth-consent-option">
                <input
                  type="radio"
                  name="access"
                  checked={permissions.includes("write")}
                  onChange={() => setPermissions(["read", "write"])}
                />
                <span>
                  Read and write
                  <small>
                    Also save plans, add or edit tasks, and record progress when
                    you ask.
                  </small>
                </span>
              </label>
            ) : null}
          </fieldset>
          {context.authorization.scope ? (
            <div className="oauth-consent-scopes">
              <span>Provider access</span>
              <p>
                {context.authorization.scope
                  .split(/\s+/)
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          ) : null}
          <p className="oauth-consent-disclosure">
            Connecting does not start tasks or grant access to your
            repositories. <Link to="/privacy">Privacy</Link>
          </p>
          <div className="oauth-consent-actions">
            <button
              className="oauth-consent-secondary"
              type="button"
              disabled={pending}
              onClick={() => void decide("deny")}
            >
              Deny
            </button>
            <button
              className="oauth-consent-primary"
              type="button"
              disabled={pending}
              onClick={() => void decide("approve")}
            >
              {pending ? "Confirming…" : "Allow access"}
            </button>
          </div>
        </>
      ) : (
        <p role="status">Reviewing the connection request…</p>
      )}
    </section>
  );
}
