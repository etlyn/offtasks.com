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
  const actionClass = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";

  return (
    <div className="border-t border-zinc-200 pt-3 font-['Poppins',_sans-serif] dark:border-zinc-700">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="text-[14px] text-zinc-900 dark:text-zinc-100">ChatGPT</p>
          <p className="text-[12px] text-zinc-500 dark:text-zinc-400" aria-live="polite">
            {view.phase === "loading" && "Checking connection…"}
            {view.phase === "error" && "Connection status unavailable"}
            {value?.status === "authorized" && (value.permissions.includes("write") ? "Access allowed · Read and edit" : "Access allowed · Read only")}
            {value?.status === "reconnect" && "Reconnect in ChatGPT"}
            {(value?.status === "unavailable" || value?.status === "disconnected") && (value.installUrl ? "Not connected" : "Coming soon")}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-x-1">
          {view.phase === "error" && (
            <button type="button" onClick={() => void refresh(true)} className={`${actionClass} text-teal-800 hover:bg-teal-100 dark:text-teal-300 dark:hover:bg-teal-900/40`}>Try again</button>
          )}
          {value && !hasGrant && (value.installUrl ? (
            <a href={value.installUrl} target="_blank" rel="noopener noreferrer" className={`${actionClass} bg-teal-800 text-white hover:bg-teal-900 dark:bg-teal-700 dark:hover:bg-teal-600`}>
              Connect ChatGPT <ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
          ) : (
            <button type="button" disabled className={`${actionClass} cursor-not-allowed bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400`}>Connect ChatGPT</button>
          ))}
          {value?.status === "reconnect" && value.installUrl && (
            <a href={value.installUrl} target="_blank" rel="noopener noreferrer" className={`${actionClass} text-teal-800 hover:bg-teal-100 dark:text-teal-300 dark:hover:bg-teal-900/40`}>
              Reconnect <ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
          )}
          {value?.status === "authorized" && value.installUrl && (
            <a href={value.installUrl} target="_blank" rel="noopener noreferrer" className={`${actionClass} text-teal-800 hover:bg-teal-100 dark:text-teal-300 dark:hover:bg-teal-900/40`}>
              Open in ChatGPT <ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
          )}
          {hasGrant && !confirming && (
            <button type="button" onClick={() => setConfirming(true)} className={`${actionClass} text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700`}>Disconnect</button>
          )}
        </div>
      </div>

      {confirming && (
        <div className="mt-2 rounded-lg bg-white p-3 dark:bg-zinc-900">
          <p className="text-[12px] text-zinc-600 dark:text-zinc-300">Disconnect ChatGPT from your Offtasks account?</p>
          {disconnectError && <p role="alert" className="mt-1 text-[12px] text-red-700 dark:text-red-300">Could not confirm disconnection. Try again.</p>}
          <div className="mt-1 flex justify-end gap-1">
            <button type="button" disabled={disconnecting} onClick={() => { setConfirming(false); setDisconnectError(false); }} className={`${actionClass} text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800`}>Cancel</button>
            <button type="button" disabled={disconnecting} onClick={() => void disconnect()} className={`${actionClass} text-red-700 hover:bg-red-50 disabled:opacity-60 dark:text-red-300 dark:hover:bg-red-950/40`}>{disconnecting ? "Disconnecting…" : "Disconnect"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
