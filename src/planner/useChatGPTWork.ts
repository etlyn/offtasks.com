import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { integrationRequestKey } from "@/lib/goalWorkbench";
import { chatGPTRequestStorageKey } from "@/lib/offtasksLocalState";
import { chatGPTPhase, matchesReceipt, readChatGPTRequests, receiptKeys, type ChatGPTRequest, type ChatGPTRequestKind } from "./chatgptHandoff";
import { fetchAICreatedTaskIds, fetchChatGPTReceipts } from "./cloud";
import type { PlannerTask } from "./model";

const watchForMs = 30 * 60_000;
const pollEveryMs = 8_000;

const sameTarget = (request: ChatGPTRequest, kind: ChatGPTRequestKind, id: string) =>
  request.kind === kind && request.id === id;

function readRequests(key: string) {
  try {
    return readChatGPTRequests(localStorage.getItem(key));
  } catch {
    return [];
  }
}

export function useChatGPTWork(owner: string, tasks: PlannerTask[], syncedAt: number | null, refresh: () => Promise<void>) {
  const storageKey = chatGPTRequestStorageKey(owner);
  const [requests, setRequests] = useState(() => readRequests(storageKey));
  const [created, setCreated] = useState<Set<string>>(() => new Set());
  const [received, setReceived] = useState<ReadonlySet<string>>(() => new Set());
  const latestTasks = useRef(tasks);
  const latestRequests = useRef(requests);
  const receipts = useRef(new Set<string>());
  latestTasks.current = tasks;
  latestRequests.current = requests;

  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) setRequests(readRequests(storageKey));
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [storageKey]);

  useEffect(() => {
    if (syncedAt === null) return;
    let active = true;
    void fetchAICreatedTaskIds(owner).then((ids) => {
      if (active) setCreated(ids);
    }, () => undefined);
    return () => { active = false; };
  }, [owner, syncedAt]);

  useEffect(() => {
    if (!requests.length) return;
    let active = true;
    let polling = false;
    const poll = async (force: boolean) => {
      if (polling || document.visibilityState !== "visible") return;
      const watching = force ? requests : requests.filter((request) => {
        const task = request.kind === "task" ? latestTasks.current.find((item) => item.id === request.id) : undefined;
        const phase = task ? chatGPTPhase(task, request, receipts.current) : null;
        if (task?.isComplete || phase === "review" || phase === "blocked") return false;
        return phase === "working" || Date.now() - request.openedAt < watchForMs;
      });
      const keys = [...new Set(watching.flatMap(receiptKeys))];
      if (!keys.length) return;
      polling = true;
      try {
        const updates = await fetchChatGPTReceipts(owner, keys);
        if (!active) return;
        const next = new Set(receipts.current);
        for (const update of updates) {
          if (watching.some((request) => matchesReceipt(request, update))) next.add(update.request_key);
        }
        if (next.size !== receipts.current.size) {
          receipts.current = next;
          setReceived(next);
          void refresh();
        }
      } catch {
        // Keep the last confirmed activity when the connection is unavailable.
      } finally {
        polling = false;
      }
    };
    const onReturn = () => void poll(true);
    onReturn();
    const timer = window.setInterval(() => void poll(false), pollEveryMs);
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [owner, requests, refresh]);

  const track = useCallback((request: ChatGPTRequest) => {
    const latest = readRequests(storageKey);
    const byTarget = new Map([...latestRequests.current, ...latest, request].map((item) => [`${item.kind}:${item.id}`, item]));
    const next = [...byTarget.values()];
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // The open planner can still track this request.
    }
    latestRequests.current = next;
    setRequests(next);
  }, [storageKey]);

  return useMemo(() => ({
    created,
    track,
    prepare: (kind: ChatGPTRequestKind, id: string): ChatGPTRequest => {
      const saved = requests.find((request) => sameTarget(request, kind, id));
      const reusable = saved && !receiptKeys(saved).some((key) => received.has(key));
      return { kind, id, key: reusable ? saved.key : `offtasks-web-${integrationRequestKey()}`, openedAt: Date.now() };
    },
    phase: (task: PlannerTask) =>
      chatGPTPhase(task, requests.find((request) => sameTarget(request, "task", task.id)), received),
  }), [created, received, requests, track]);
}
