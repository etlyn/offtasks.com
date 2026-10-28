import {
  createReturnPathStore,
  createSupabaseGoogleAuth,
  type GoogleAuthClient,
} from "@etlyn/etlyn-auth/supabase";
import { safePlannerReturn } from "./goalWorkbench";

/** /app is already allowlisted for both Offtasks hosts. Keep the callback exact;
 * navigation (including a pending consent request) stays in this tab. */
export function createOfftasksGoogleAuth(options: {
  client: GoogleAuthClient;
  origin: string;
  storage: () => Pick<Storage, "getItem" | "setItem" | "removeItem">;
  scrubCallbackUrl: (url: string) => void;
}) {
  const auth = createSupabaseGoogleAuth({
    ...options,
    callbackPath: "/app",
    fallback: "/app",
    returnPathStore: createReturnPathStore(
      options.storage,
      "offtasks:google-return:v1"
    ),
  });
  return {
    start: (returnTo: string) => auth.start(safePlannerReturn(returnTo)),
    async complete(url: string) {
      const result = await auth.complete(url);
      return { returnPath: safePlannerReturn(result.returnPath) };
    },
  };
}

/** Recovery retains SDK handling on its own route. Only the /app code exchange
 * is owned by the callback view, so a code is never exchanged twice. */
export function isManagedSignInCallback(
  url: Pick<URL, "pathname" | "search" | "hash">
) {
  const query = new URLSearchParams(url.search);
  const fragment = new URLSearchParams(url.hash.slice(1));
  return (
    url.pathname === "/app" &&
    (query.has("code") || query.has("error") || fragment.has("error"))
  );
}
