import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ChatGPTConnection } from "../../src/components/ChatGPTConnection";
import type { ChatGPTConnection as Connection, ChatGPTStatus } from "../../src/lib/chatgptConnection";
import "../../src/styles/base.css";
import "../../src/styles/planner.css";

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
      const connected = !revoked && (mode === "connected" || mode === "connected-public" || mode === "retry" || (mode === "race" && owner === "owner-a"));
      return {
        status: connected ? "authorized" : "disconnected",
        installUrl: mode === "public" || mode === "connected-public" ? "https://chatgpt.com/plugins/offtasks" : null,
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
    <div style={{ minHeight: "100vh", padding: "1.25rem", background: "var(--ot-surface)" }}>
      <button onClick={() => setOwner("owner-b")}>Switch account</button>
      <div style={{ maxWidth: "22.5rem", marginTop: "1rem" }}>
        <p className="panel-label">Connected apps</p>
        <ChatGPTConnection key={owner} ownerId={owner} connection={connection} />
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
