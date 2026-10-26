import { supabaseClient } from "@/lib/supabase";
import { createOAuthConsentService } from "@/lib/oauthConsent";

export const oauthConsentService = createOAuthConsentService({
  providerUrl: import.meta.env.VITE_PUBLIC_SUPABASE_URL,
  apiKey: import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY,
  identity: async () => {
    const { data, error } = await supabaseClient.auth.getSession();
    return !error && data.session
      ? { userId: data.session.user.id, accessToken: data.session.access_token }
      : null;
  },
  rpc: async (name, args) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      return await supabaseClient
        .rpc(name, args)
        .abortSignal(controller.signal);
    } finally {
      clearTimeout(timeout);
    }
  },
});
