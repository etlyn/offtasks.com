import { useEffect, useRef, useState, type RefObject } from "react";
import { Copy, ExternalLink, Sparkles, X } from "lucide-react";
import { chatGPTConnection } from "@/lib/chatgptConnectionClient";
import type { ChatGPTStatus } from "@/lib/chatgptConnection";
import { chatGPTPrompt, type ChatGPTRequest } from "./chatgptHandoff";
import { Sheet } from "./ui";

export function ChatGPTHandoffSheet({ request, onClose, onTrack, returnFocus }: {
  request: ChatGPTRequest | null;
  onClose: () => void;
  onTrack: (request: ChatGPTRequest) => void;
  returnFocus: RefObject<HTMLButtonElement>;
}) {
  const [last, setLast] = useState(request);
  useEffect(() => { if (request) setLast(request); }, [request]);
  const shown = request ?? last;
  const title = shown?.kind === "goal" ? "Start with AI" : "Do with ChatGPT";
  return (
    <Sheet
      open={!!request}
      onClose={onClose}
      title={title}
      size="small"
      onCloseAutoFocus={(event) => {
        if (!returnFocus.current?.isConnected) return;
        event.preventDefault();
        returnFocus.current.focus({ preventScroll: true });
      }}
    >
      {shown ? (
        <HandoffBody
          key={shown.key}
          request={shown}
          title={title}
          onClose={onClose}
          onTrack={onTrack}
        />
      ) : null}
    </Sheet>
  );
}

function HandoffBody({ request, title, onClose, onTrack }: {
  request: ChatGPTRequest;
  title: string;
  onClose: () => void;
  onTrack: (request: ChatGPTRequest) => void;
}) {
  const [connection, setConnection] = useState<ChatGPTStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const promptField = useRef<HTMLTextAreaElement>(null);
  const prompt = chatGPTPrompt(request);

  useEffect(() => {
    const controller = new AbortController();
    const check = () => {
      if (document.visibilityState !== "visible") return;
      void chatGPTConnection.read(controller.signal).then((value) => {
        if (controller.signal.aborted) return;
        setConnection(value);
        setFailed(false);
      }, () => { if (!controller.signal.aborted) setFailed(true); });
    };
    check();
    window.addEventListener("focus", check);
    return () => {
      controller.abort();
      window.removeEventListener("focus", check);
    };
  }, [refresh]);

  const canWrite = !failed && connection?.status === "authorized" && connection.permissions.includes("write");
  const track = () => onTrack({ ...request, openedAt: Date.now() });
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      track();
      setCopied(true);
    } catch {
      setShowRequest(true);
      requestAnimationFrame(() => {
        promptField.current?.focus();
        promptField.current?.select();
      });
    }
  };

  return (
    <div className="composer ai-handoff">
      <header className="sheet-head">
        <button type="button" className="ot-round ot-round--plain" aria-label="Close" onClick={onClose}>
          <X size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <h2>{title}</h2>
        <span className="sheet-head-spacer" />
      </header>
      {canWrite ? (
        <>
          <p>{request.kind === "goal"
            ? "ChatGPT reads the saved description and suggests tasks for you to approve."
            : "ChatGPT reads this task and reports when work starts and when it’s ready to review."}</p>
          <p className="ai-handoff-hint">Copy the request, select Offtasks in ChatGPT, then paste and send it.</p>
          <div className="ai-handoff-actions">
            <button type="button" className="ot-button ot-button--soft ot-button--small" onClick={() => void copy()}>
              <Copy size={14} aria-hidden="true" /> {copied ? "Copied" : "Copy request"}
            </button>
            <a
              className="ot-button ot-button--small"
              href={connection.installUrl ?? "https://chatgpt.com/"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                track();
                if (copied) onClose();
              }}
            >
              Open ChatGPT <ExternalLink size={14} aria-hidden="true" />
            </a>
          </div>
          <button type="button" className="ot-link ai-handoff-show" aria-expanded={showRequest} onClick={() => setShowRequest((value) => !value)}>
            {showRequest ? "Hide request" : "Show request"}
          </button>
          {showRequest ? <textarea ref={promptField} className="ot-input" readOnly rows={6} aria-label="ChatGPT request" value={prompt} /> : null}
        </>
      ) : (
        <>
          <p role="status">{failed ? "Couldn’t check your connection." : !connection ? "Checking connection…" :
            connection.status === "authorized" ? "ChatGPT needs edit access for this request." :
            connection.installUrl ? "Connect Offtasks in ChatGPT to use this request." : "ChatGPT connection is unavailable."}</p>
          {failed ? (
            <button type="button" className="ot-chip ai-handoff-show" onClick={() => setRefresh((value) => value + 1)}>Try again</button>
          ) : connection?.installUrl ? (
            <a className="ot-button ot-button--small ai-handoff-show" href={connection.installUrl} target="_blank" rel="noopener noreferrer">
              <Sparkles size={14} aria-hidden="true" /> {connection.status === "authorized" ? "Manage access" : "Connect ChatGPT"}
            </a>
          ) : null}
        </>
      )}
    </div>
  );
}
