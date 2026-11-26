import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  ChartNoAxesCombined,
  ChevronRight,
  ExternalLink,
  Moon,
  RefreshCw,
  Settings,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import { analyticsConfigured, privacySignalActive, readAnalyticsEnabled, setAnalyticsEnabled } from "@/analytics";
import { ChatGPTConnection } from "@/components/ChatGPTConnection";
import { chatGPTConnection } from "@/lib/chatgptConnectionClient";
import { setTheme, useTheme, type ThemeMode } from "@/lib/theme";
import { usePlanner } from "./store";
import { Confirm, Switch } from "./ui";

declare const __APP_VERSION__: string;

type View = "menu" | "privacy" | "account";

/**
 * The planner's side panel: who is signed in, Statistics, Return to Later,
 * Light/Dark, privacy and the account. It slides in from the left on phones,
 * like the mobile app's drawer, and from the right on wider screens.
 */
export function AccountPanel({
  open,
  onClose,
  name,
  email,
  onStatistics,
  onThemeChange,
  onSignOut,
  onDeleteData,
  deleting,
}: {
  open: boolean;
  onClose: () => void;
  name?: string;
  email?: string;
  onStatistics: () => void;
  onThemeChange: (mode: ThemeMode) => void;
  onSignOut: () => Promise<void>;
  onDeleteData: () => Promise<void>;
  deleting: boolean;
}) {
  const planner = usePlanner();
  const theme = useTheme();
  const [view, setView] = useState<View>("menu");
  const [confirmLater, setConfirmLater] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  useEffect(() => {
    if (open) {
      setView("menu");
      setSignOutFailed(false);
    }
  }, [open]);

  const identity = name?.trim() || email?.split("@")[0] || "Your account";
  const chooseTheme = (mode: ThemeMode) => {
    setTheme(mode);
    onThemeChange(mode);
  };
  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutFailed(false);
    try {
      await onSignOut();
    } catch {
      setSignOutFailed(true);
    } finally {
      setSigningOut(false);
    }
  };
  const sync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await planner.refresh();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="ot-scrim" />
        <Dialog.Content className="panel" aria-describedby={undefined}>
          <Dialog.Title className="ot-visually-hidden">Account and preferences</Dialog.Title>
          {view === "menu" ? (
            <div className="panel-view" key="menu">
              <header className="panel-identity">
                <p>{identity}</p>
                {email ? <span>{email}</span> : null}
              </header>
              <ul className="panel-rows">
                <li>
                  <button
                    type="button"
                    className="panel-row"
                    onClick={() => {
                      onClose();
                      onStatistics();
                    }}
                  >
                    <i aria-hidden="true">
                      <ChartNoAxesCombined size={18} strokeWidth={1.7} />
                    </i>
                    <span>Statistics</span>
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                </li>
                <li>
                  <div className="panel-row">
                    <i aria-hidden="true">
                      <RefreshCw size={18} strokeWidth={1.7} />
                    </i>
                    <span>
                      Return to Later
                      <small>Move past unfinished tasks back to Later.</small>
                    </span>
                    <Switch
                      checked={planner.movePastToLater}
                      label="Return to Later"
                      onChange={(next) => (next ? setConfirmLater(true) : planner.setMovePastToLater(false))}
                    />
                  </div>
                </li>
                <li>
                  <div className="panel-row">
                    <i aria-hidden="true">
                      <Sun size={18} strokeWidth={1.7} />
                    </i>
                    <span>Appearance</span>
                    <div
                      className="panel-theme"
                      role="radiogroup"
                      aria-label="Appearance"
                      data-mode={theme}
                      onKeyDown={(event) => {
                        if (!event.key.startsWith("Arrow")) return;
                        event.preventDefault();
                        chooseTheme(theme === "Light" ? "Dark" : "Light");
                        const group = event.currentTarget;
                        requestAnimationFrame(() => group.querySelector<HTMLElement>('[aria-checked="true"]')?.focus());
                      }}
                    >
                      <button type="button" role="radio" aria-checked={theme === "Light"} tabIndex={theme === "Light" ? 0 : -1} aria-label="Light mode" onClick={() => chooseTheme("Light")}>
                        <Sun size={15} strokeWidth={1.8} aria-hidden="true" />
                      </button>
                      <button type="button" role="radio" aria-checked={theme === "Dark"} tabIndex={theme === "Dark" ? 0 : -1} aria-label="Dark mode" onClick={() => chooseTheme("Dark")}>
                        <Moon size={15} strokeWidth={1.8} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </li>
                <li>
                  <button type="button" className="panel-row" onClick={() => setView("privacy")}>
                    <i aria-hidden="true">
                      <Settings size={18} strokeWidth={1.7} />
                    </i>
                    <span>Privacy &amp; analytics</span>
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                </li>
                <li className="panel-divided">
                  <button type="button" className="panel-row" onClick={() => setView("account")}>
                    <i aria-hidden="true">
                      <User size={18} strokeWidth={1.7} />
                    </i>
                    <span>Account &amp; sync</span>
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                </li>
              </ul>
              <footer className="panel-foot">
                {signOutFailed ? (
                  <p role="alert" className="ot-notice ot-notice--error">
                    Couldn’t sign out. Try again.
                  </p>
                ) : null}
                <button type="button" className="ot-button ot-button--soft ot-button--block" disabled={signingOut} onClick={() => void signOut()}>
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
                <p>Version {__APP_VERSION__}</p>
              </footer>
            </div>
          ) : view === "privacy" ? (
            <PrivacyView key="privacy" onBack={() => setView("menu")} onLeave={onClose} />
          ) : (
            <div className="panel-view" key="account">
              <header className="panel-head">
                <button type="button" className="ot-round ot-round--plain" aria-label="Back" onClick={() => setView("menu")}>
                  <ArrowLeft size={18} strokeWidth={1.8} aria-hidden="true" />
                </button>
                <h2>Account &amp; sync</h2>
              </header>
              <div className="panel-scroll">
                <div className="panel-identity panel-identity--inset">
                  <p>{identity}</p>
                  {email ? <span>{email}</span> : null}
                </div>
                <p className="panel-label">Workspace</p>
                <ul className="panel-rows">
                  <li>
                    <button type="button" className="panel-row" disabled={syncing} onClick={() => void sync()}>
                      <i aria-hidden="true">
                        <RefreshCw size={18} strokeWidth={1.7} data-spin={syncing || undefined} />
                      </i>
                      <span>
                        Sync now
                        <small>Check for account changes</small>
                      </span>
                    </button>
                  </li>
                </ul>
                <p className="panel-status" role="status">
                  Sync status · {syncing || planner.loading ? "Checking…" : planner.error ? "Not checked" : "Up to date"}
                </p>
                <ul className="panel-rows">
                  <li>
                    <a className="panel-row" href="https://etlyn.com/auth/account" target="_blank" rel="noopener noreferrer">
                      <i aria-hidden="true">
                        <ExternalLink size={18} strokeWidth={1.7} />
                      </i>
                      <span>
                        Manage Etlyn account
                        <small>Opens etlyn.com</small>
                      </span>
                      <ChevronRight size={14} aria-hidden="true" />
                    </a>
                  </li>
                </ul>
                <p className="panel-label">Connected apps</p>
                <ChatGPTConnection key={planner.owner} ownerId={planner.owner} connection={chatGPTConnection} />
              </div>
              <footer className="panel-foot panel-foot--danger">
                <button type="button" className="panel-row panel-row--danger" disabled={deleting} onClick={() => setConfirmDelete(true)}>
                  <i aria-hidden="true">
                    <Trash2 size={18} strokeWidth={1.7} />
                  </i>
                  <span>{deleting ? "Deleting Offtasks data" : "Delete Offtasks data"}</span>
                </button>
              </footer>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>

      <Confirm
        open={confirmLater}
        title="Return to Later?"
        message="Unfinished tasks from past days will lose their date and move to Later. Completed tasks and future dates stay as they are."
        confirmLabel="Enable"
        danger={false}
        onCancel={() => setConfirmLater(false)}
        onConfirm={() => {
          setConfirmLater(false);
          planner.setMovePastToLater(true);
        }}
      />
      <Confirm
        open={confirmDelete}
        title="Delete Offtasks data?"
        message="This permanently deletes your Offtasks tasks, notes, goals, and synced settings. Your Etlyn sign-in stays available for other apps, and this device signs out of Offtasks after deletion."
        confirmLabel={deleting ? "Deleting" : "Delete Offtasks Data"}
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          void onDeleteData().finally(() => setConfirmDelete(false));
        }}
      />
    </Dialog.Root>
  );
}

function PrivacyView({ onBack, onLeave }: { onBack: () => void; onLeave: () => void }) {
  const [enabled, setEnabled] = useState(readAnalyticsEnabled);
  const blocked = privacySignalActive();
  return (
    <div className="panel-view">
      <header className="panel-head">
        <button type="button" className="ot-round ot-round--plain" aria-label="Back" onClick={onBack}>
          <ArrowLeft size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <h2>Privacy &amp; analytics</h2>
      </header>
      <div className="panel-scroll">
        {analyticsConfigured ? (
          <div className="panel-row panel-row--static">
            <i aria-hidden="true">
              <Settings size={18} strokeWidth={1.7} />
            </i>
            <span>Website analytics</span>
            <Switch
              checked={enabled && !blocked}
              disabled={blocked}
              label="Website analytics"
              onChange={(next) => {
                setEnabled(next);
                setAnalyticsEnabled(next);
              }}
            />
          </div>
        ) : null}
        <div className="panel-notice">
          <h3>What is collected</h3>
          <p>
            Nothing from your planner. Tasks, notes, goals and the sign-in pages are never measured.
            {analyticsConfigured
              ? " On the public pages we count visits, selected links and confirmed contact submissions, without analytics cookies."
              : ""}
          </p>
        </div>
        <p className="panel-text">
          {analyticsConfigured
            ? `Your choice stays in this browser.${blocked ? " Your browser's privacy signal currently prevents collection." : ""} `
            : ""}
          The full details are in the{" "}
          <Link className="ot-link" to="/privacy" onClick={onLeave}>
            privacy policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
