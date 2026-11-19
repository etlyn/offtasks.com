import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabaseClient } from "@/lib/supabase";
import type { PlannerTask } from "./model";
import { reminderTarget, reminderTaskKey, type ReminderTarget } from "./reminders";
import { usePlanner } from "./store";

type ReminderRow = ReminderTarget & { remind_at: string };
export type ReminderSelection = { at: string; subscription: PushSubscriptionJSON };
type ReminderMap = Record<string, string>;
type PushState = {
  key: string;
  worker: ServiceWorkerRegistration;
  subscription: PushSubscription | null;
};

type ReminderContextValue = {
  getReminder: (taskId: string) => string | null;
  chooseReminder: (at: string) => Promise<ReminderSelection>;
  saveReminder: (task: Pick<PlannerTask, "id" | "noteId">, selection: ReminderSelection | null) => Promise<void>;
  disconnect: () => Promise<void>;
};

const ReminderContext = createContext<ReminderContextValue | null>(null);
const maxTimerDelay = 2 ** 31 - 1;
const bindingCache = "offtasks-reminder-device-v1";
const bindingPath = "/offtasks-reminder-device";

const storageKey = (owner: string) => `offtasks-reminder-device:v1:${owner}`;

function readDevice(owner: string) {
  try {
    const id = localStorage.getItem(storageKey(owner));
    return id && /^[a-f0-9-]{36}$/i.test(id) ? id : null;
  } catch {
    return null;
  }
}

const supported = () => window.isSecureContext && "Notification" in window
  && "PushManager" in window && "serviceWorker" in navigator && "caches" in window;

function unsupportedMessage() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios
    ? "Add Offtasks to your Home Screen and open it there to get reminders."
    : "This browser does not support Web Push reminders.";
}

function notificationKey(key: string): Uint8Array<ArrayBuffer> {
  const decoded = atob(key.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

async function linkedDevice(cache: Cache) {
  const entry = await cache.match(bindingPath);
  return entry ? await entry.text() : null;
}

async function bindBrowser(owner: string) {
  const bind = async () => {
    const id = readDevice(owner) ?? crypto.randomUUID();
    localStorage.setItem(storageKey(owner), id);
    const cache = await caches.open(bindingCache);
    await cache.put(bindingPath, new Response(id));
    return id;
  };
  // Tabs in one browser must use the same ID for its single push subscription.
  return navigator.locks ? navigator.locks.request(bindingCache, bind) : bind();
}

export function RemindersProvider({ owner, children }: { owner: string; children: ReactNode }) {
  const [reminders, setReminders] = useState<ReminderMap>({});
  const { syncedAt } = usePlanner();
  const active = useRef(false);
  const push = useRef<PushState | null>(null);
  const revision = useRef(0);

  const refresh = useCallback(async () => {
    const id = readDevice(owner);
    if (!id) return;
    const attempt = ++revision.current;
    const { data, error } = await supabaseClient.rpc("offtask_web_reminder_list", { browser_device: id })
      .abortSignal(AbortSignal.timeout(8000));
    if (!error && active.current && attempt === revision.current && Array.isArray(data)) {
      setReminders(Object.fromEntries((data as ReminderRow[]).map((row) => [reminderTaskKey(row), row.remind_at])));
    }
  }, [owner]);

  useEffect(() => {
    active.current = true;
    let current = true;
    if (supported()) {
      void (async () => {
        const { data, error } = await supabaseClient.rpc("offtask_web_reminder_key", { browser_origin: location.origin })
          .abortSignal(AbortSignal.timeout(8000));
        if (!current || error || typeof data !== "string" || !/^B[A-Za-z0-9_-]{86}$/.test(data)) return;
        await navigator.serviceWorker.register("/offtasks-reminders.js", { scope: "/app" });
        const worker = await navigator.serviceWorker.ready;
        if (!current) return;
        const cache = await caches.open(bindingCache);
        const previous = await linkedDevice(cache);
        const id = readDevice(owner);
        let subscription = await worker.pushManager.getSubscription();
        if (!current) return;
        if (previous && previous !== id) {
          await cache.delete(bindingPath);
          await subscription?.unsubscribe();
          subscription = null;
        }
        if (current) push.current = { key: data, worker, subscription };
      })().catch(() => undefined);
    }

    const update = () => { if (document.visibilityState === "visible") void refresh(); };
    void refresh();
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    return () => {
      active.current = false;
      current = false;
      push.current = null;
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
    };
  }, [owner, refresh]);

  useEffect(() => {
    if (syncedAt) void refresh();
  }, [syncedAt, refresh]);

  useEffect(() => {
    const now = Date.now();
    const next = Math.min(...Object.values(reminders).map(Date.parse).filter((time) => time > now));
    if (!Number.isFinite(next)) return;
    const timer = window.setTimeout(() => {
      setReminders((current) => Object.fromEntries(Object.entries(current).filter(([, at]) => Date.parse(at) > Date.now())));
    }, Math.min(next - now, maxTimerDelay));
    return () => window.clearTimeout(timer);
  }, [reminders]);

  const chooseReminder = useCallback(async (at: string): Promise<ReminderSelection> => {
    if (!supported()) throw new Error(unsupportedMessage());
    const delivery = push.current;
    if (!delivery) throw new Error("Web reminders aren’t available here yet. Try again in a moment.");
    if (Notification.permission === "denied") {
      throw new Error("Allow notifications for Offtasks in this browser’s site settings.");
    }
    try {
      // Subscribe directly from the Done button. Browsers prompt here if needed.
      delivery.subscription ??= await delivery.worker.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: notificationKey(delivery.key),
      });
      return { at, subscription: delivery.subscription.toJSON() };
    } catch {
      if (Notification.permission !== "granted") {
        throw new Error("Allow notifications for Offtasks in this browser’s site settings, then try again.");
      }
      throw new Error("This browser couldn’t turn on notifications. Please try again.");
    }
  }, []);

  const saveReminder = useCallback(async (task: Pick<PlannerTask, "id" | "noteId">, selection: ReminderSelection | null) => {
    let id = readDevice(owner);
    if (selection) {
      if (Date.parse(selection.at) <= Date.now()) throw new Error("Choose a later time for this task’s reminder.");
      id = await bindBrowser(owner);
    }
    if (!id || !active.current) return;
    const { task_id, note_id } = reminderTarget(task);
    const { error } = await supabaseClient.rpc("offtask_web_reminder_set", {
      browser_device: id,
      browser_origin: location.origin,
      task_key: task_id,
      note_key: note_id,
      fire_at: selection?.at ?? null,
      subscription: selection?.subscription ?? null,
    }).abortSignal(AbortSignal.timeout(8000));
    if (error) throw new Error("Open the task to try its reminder again.");
    revision.current += 1;
    if (!active.current) return;
    setReminders((current) => {
      const next = { ...current };
      if (selection) next[task.id] = selection.at;
      else delete next[task.id];
      return next;
    });
  }, [owner]);

  const disconnect = useCallback(async () => {
    const id = readDevice(owner);
    if (!id) return;
    revision.current += 1;
    await Promise.allSettled([
      supabaseClient.rpc("offtask_web_reminder_disconnect", { browser_device: id }).abortSignal(AbortSignal.timeout(5000)),
      (async () => {
        if (!supported()) return;
        const cache = await caches.open(bindingCache);
        if (await linkedDevice(cache) !== id) return;
        await cache.delete(bindingPath);
        const worker = await navigator.serviceWorker.getRegistration("/app");
        const subscription = await worker?.pushManager.getSubscription();
        await subscription?.unsubscribe();
        for (const notification of await worker?.getNotifications() ?? []) {
          if (notification.data?.deviceId === id) notification.close();
        }
      })(),
    ]);
    if (push.current) push.current.subscription = null;
    try { localStorage.removeItem(storageKey(owner)); } catch { /* Storage may be blocked. */ }
    setReminders({});
  }, [owner]);

  const getReminder = (taskId: string) => {
    const at = reminders[taskId];
    return Date.parse(at) > Date.now() ? at : null;
  };

  return (
    <ReminderContext.Provider value={{ getReminder, chooseReminder, saveReminder, disconnect }}>
      {children}
    </ReminderContext.Provider>
  );
}

export function useReminders() {
  const reminders = useContext(ReminderContext);
  if (!reminders) throw new Error("Reminders need a signed-in planner");
  return reminders;
}
