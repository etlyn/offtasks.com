import { createClient } from "@supabase/supabase-js";
import { isManagedSignInCallback } from "./googleAuth";

const SUPABASE_URL = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL) {
  throw new Error("Missing VITE_PUBLIC_SUPABASE_URL. Check your environment variables.");
}

if (!SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_PUBLIC_SUPABASE_ANON_KEY. Check your environment variables.");
}

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { flowType: "pkce", detectSessionInUrl: !isManagedSignInCallback(window.location), persistSession: true, autoRefreshToken: true } });

// Tasks, notes and goals are read and written in src/planner/cloud.ts.

export interface UserPreferences {
  user_id: string;
  hide_completed: boolean;
  advanced_mode: boolean;
  theme_mode: "Light" | "Dark";
  auto_arrange: boolean;
  updated_at?: string;
}

interface ContactMessageInput {
  name: string;
  email: string;
  message: string;
  source?: string;
}

export const submitContactMessage = async ({
  name,
  email,
  message,
  source = "landing",
}: ContactMessageInput): Promise<void> => {
  const payload = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    message: message.trim(),
    source,
  };

  const { error } = await supabaseClient
    .from("contact_messages")
    .insert([payload]);

  if (error) {
    console.error("Error submitting contact message", error);
    throw error;
  }
};

export const fetchUserPreferences = async (
  userId: string,
): Promise<UserPreferences | null> => {
  const { data, error } = await supabaseClient
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user preferences", error);
    return null;
  }

  return data ?? null;
};

export const upsertUserPreferences = async (
  prefs: UserPreferences,
): Promise<void> => {
  const { error } = await supabaseClient.from("user_preferences").upsert(
    {
      ...prefs,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("Error updating user preferences", error);
    throw error;
  }
};

interface DeleteAccountResponse {
  deleted?: "app-data";
  identityRetained?: boolean;
  signedOutScope?: "client-local";
  error?: string;
}

export const deleteAccount = async (): Promise<DeleteAccountResponse> => {
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error("You need to be signed in to delete your Offtasks data.");
  }

  const { data, error } = await supabaseClient.functions.invoke<DeleteAccountResponse>(
    "delete-account",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    },
  );

  if (error) {
    console.error("Error deleting account", error);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (data?.deleted !== "app-data" || data.identityRetained !== true) {
    throw new Error("Offtasks data deletion did not complete.");
  }

  return data;
};
