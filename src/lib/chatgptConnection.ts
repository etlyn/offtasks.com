export type ChatGPTStatus = {
  status: "unavailable" | "disconnected" | "reconnect" | "authorized";
  installUrl: string | null;
  permissions: ("read" | "write")[];
  revision: string | null;
};

type Result = { data: unknown; error: { code?: string } | null };
type Transport = {
  status: (signal: AbortSignal) => PromiseLike<Result>;
  revoke: (
    owner: string,
    revision: string,
    requestKey: string,
    signal: AbortSignal,
  ) => PromiseLike<Result>;
};

/** Only an explicitly configured ChatGPT listing can be opened from Offtasks. */
export function parseChatGPTStatus(value: unknown): ChatGPTStatus {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Connection status unavailable");
  }
  const data = value as Record<string, unknown>;
  if (
    typeof data.status !== "string" ||
    !["unavailable", "disconnected", "reconnect", "authorized"].includes(data.status)
  ) {
    throw new Error("Connection status unavailable");
  }
  const installUrl =
    typeof data.install_url === "string" &&
    /^https:\/\/chatgpt\.com\/plugins\/[A-Za-z0-9_/-]+$/.test(data.install_url)
      ? data.install_url
      : null;
  const permissions = Array.isArray(data.permissions)
    ? data.permissions.filter(
        (item): item is "read" | "write" => item === "read" || item === "write",
      )
    : [];
  const revision =
    typeof data.revision === "string" && /^\d+$/.test(data.revision)
      ? data.revision
      : null;
  if (
    (data.status === "authorized" && (!permissions.includes("read") || !revision)) ||
    (data.status === "reconnect" && !revision)
  ) {
    throw new Error("Connection status unavailable");
  }
  return { status: data.status as ChatGPTStatus["status"], installUrl, permissions, revision };
}

async function withTimeout<T>(signal: AbortSignal | undefined, action: (signal: AbortSignal) => PromiseLike<T>): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 15000);
  try {
    return await action(controller.signal);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export function createChatGPTConnection(transport: Transport) {
  return {
    async read(signal?: AbortSignal): Promise<ChatGPTStatus> {
      const { data, error } = await withTimeout(signal, transport.status);
      if (error?.code === "PGRST202") return parseChatGPTStatus({ status: "unavailable" });
      if (error) throw new Error("Connection status unavailable");
      return parseChatGPTStatus(data);
    },
    async revoke(owner: string, revision: string, requestKey: string, signal?: AbortSignal): Promise<void> {
      const { error } = await withTimeout(signal, (requestSignal) =>
        transport.revoke(owner, revision, requestKey, requestSignal),
      );
      if (error) throw new Error("Could not confirm disconnect");
    },
  };
}

export type ChatGPTConnection = ReturnType<typeof createChatGPTConnection>;
