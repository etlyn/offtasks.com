import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { ChatGPTConnection as Connection, ChatGPTStatus } from "../lib/chatgptConnection";
import { integrationRequestKey } from "../lib/goalWorkbench";

type View =
  | { phase: "loading" | "error" }
  | { phase: "ready"; value: ChatGPTStatus };

export function ChatGPTConnection({ ownerId, connection }: { ownerId: string; connection: Connection }) {
  const [view, setView] = useState<View>({ phase: "loading" });
  const [confirming, setConfirming] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState(false);
  const mounted = useRef(false);
  const generation = useRef(0);
  const readController = useRef<AbortController | null>(null);
  const revokeController = useRef<AbortController | null>(null);
  const revokeLock = useRef(false);
  const retryKey = useRef<{ revision: string; key: string } | null>(null);

  const refresh = useCallback(async (showLoading = false) => {
    if (revokeLock.current) return;
    const sequence = ++generation.current;
    readController.current?.abort();
    const controller = new AbortController();
    readController.current = controller;
    if (showLoading) setView({ phase: "loading" });
    try {
      const value = await connection.read(controller.signal);
      if (mounted.current && sequence === generation.current) {
        setView({ phase: "ready", value });
        if (value.status !== "authorized" && value.status !== "reconnect") {
          setConfirming(false);
          setDisconnectError(false);
        }
      }
    } catch {
      if (mounted.current && sequence === generation.current) setView({ phase: "error" });
    }
  }, [connection]);

  useEffect(() => {
    mounted.current = true;
    void refresh(true);
    const onFocus = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      mounted.current = false;
      generation.current += 1;
      readController.current?.abort();
      revokeController.current?.abort();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [ownerId, refresh]);

  const disconnect = async () => {
    if (revokeLock.current || view.phase !== "ready" || !view.value.revision) return;
    const revision = view.value.revision;
    if (retryKey.current?.revision !== revision) {
      retryKey.current = { revision, key: integrationRequestKey() };
    }
    const key = retryKey.current.key;
    revokeLock.current = true;
    generation.current += 1;
    readController.current?.abort();
    const controller = new AbortController();
    revokeController.current = controller;
    setDisconnecting(true);
    setDisconnectError(false);
    try {
      await connection.revoke(ownerId, revision, key, controller.signal);
      if (!mounted.current) return;
      retryKey.current = null;
      setConfirming(false);
      revokeLock.current = false;
      await refresh(true);
    } catch {
      if (mounted.current) setDisconnectError(true);
    } finally {
      revokeLock.current = false;
      if (mounted.current) setDisconnecting(false);
    }
  };

  const value = view.phase === "ready" ? view.value : null;
  const hasGrant = value?.status === "authorized" || value?.status === "reconnect";

  return (
    <div className="chatgpt">
      <div className="chatgpt-row">
        <div>
          <p>ChatGPT</p>
          <span aria-live="polite">
            {view.phase === "loading" && "Checking connection…"}
            {view.phase === "error" && "Connection status unavailable"}
            {value?.status === "authorized" && (value.permissions.includes("write") ? "Access allowed · Read and edit" : "Access allowed · Read only")}
            {value?.status === "reconnect" && "Reconnect in ChatGPT"}
            {(value?.status === "unavailable" || value?.status === "disconnected") && (value.installUrl ? "Not connected" : "Coming soon")}
          </span>
        </div>
        <div className="chatgpt-actions">
          {view.phase === "error" && (
            <button type="button" className="ot-chip" onClick={() => void refresh(true)}>Try again</button>
          )}
          {value && !hasGrant && (value.installUrl ? (
            <a href={value.installUrl} target="_blank" rel="noopener noreferrer" className="ot-chip" data-set="">
              Connect ChatGPT <ExternalLink aria-hidden="true" size={13} />
            </a>
          ) : (
            <button type="button" disabled className="ot-chip">Connect ChatGPT</button>
          ))}
          {value?.status === "reconnect" && value.installUrl && (
            <a href={value.installUrl} target="_blank" rel="noopener noreferrer" className="ot-chip" data-set="">
              Reconnect <ExternalLink aria-hidden="true" size={13} />
            </a>
          )}
          {value?.status === "authorized" && value.installUrl && (
            <a href={value.installUrl} target="_blank" rel="noopener noreferrer" className="ot-chip" data-set="">
              Open in ChatGPT <ExternalLink aria-hidden="true" size={13} />
            </a>
          )}
          {hasGrant && !confirming && (
            <button type="button" className="ot-chip" onClick={() => setConfirming(true)}>Disconnect</button>
          )}
        </div>
      </div>

      {confirming && (
        <div className="chatgpt-confirm">
          <p>Disconnect ChatGPT from your Offtasks account?</p>
          {disconnectError && <p role="alert" className="chatgpt-error">Could not confirm disconnection. Try again.</p>}
          <div>
            <button type="button" className="ot-button ot-button--soft ot-button--small" disabled={disconnecting} onClick={() => { setConfirming(false); setDisconnectError(false); }}>Cancel</button>
            <button type="button" className="ot-button ot-button--danger ot-button--small" disabled={disconnecting} onClick={() => void disconnect()}>{disconnecting ? "Disconnecting…" : "Disconnect"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
