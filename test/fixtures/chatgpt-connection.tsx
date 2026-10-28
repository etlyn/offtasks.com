import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ChatGPTConnection } from "../../src/components/ChatGPTConnection";
import type { ChatGPTConnection as Connection, ChatGPTStatus } from "../../src/lib/chatgptConnection";
import "../../src/styles/globals.css";

const mode = new URLSearchParams(location.search).get("mode");
const calls: { owner: string; revision: string; key: string }[] = [];
let revoked = false;
Object.assign(window, { fixtureCalls: calls });
if (location.search.includes("dark")) document.documentElement.classList.add("dark");

function Fixture() {
  const [owner, setOwner] = useState("owner-a");
  const connection = useMemo<Connection>(() => ({
    read: async () => {
      if (mode === "race" && owner === "owner-a") await new Promise((resolve) => setTimeout(resolve, 500));
      const connected = !revoked && (mode === "connected" || mode === "retry" || (mode === "race" && owner === "owner-a"));
      return {
        status: connected ? "authorized" : "disconnected",
        installUrl: mode === "public" ? "https://chatgpt.com/plugins/offtasks" : null,
        permissions: connected ? ["read", "write"] : [],
        revision: connected ? "42" : null,
      } as ChatGPTStatus;
    },
    revoke: async (initiator, revision, key) => {
      calls.push({ owner: initiator, revision, key });
      if (mode === "retry" && calls.length === 1) throw new Error("uncertain result");
      revoked = true;
    },
  }), [owner]);
  return (
    <div className="min-h-screen bg-white p-5 dark:bg-zinc-900">
      <button onClick={() => setOwner("owner-b")}>Switch account</button>
      <div className="mt-4 max-w-[460px] rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
        <p className="mb-3 text-sm text-zinc-700 dark:text-zinc-300">Account</p>
        <ChatGPTConnection key={owner} ownerId={owner} connection={connection} />
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
