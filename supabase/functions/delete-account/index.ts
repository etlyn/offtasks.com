import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

type CleanupTarget = {
  table: string;
  column: string;
  optional?: boolean;
};

type SupabaseErrorLike = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
};

const cleanupTargets: CleanupTarget[] = [
  { table: "tasks", column: "user_id" },
  { table: "user_preferences", column: "user_id", optional: true },
  { table: "profiles", column: "id", optional: true },
  { table: "profiles", column: "user_id", optional: true },
];

const formatSupabaseError = (error: SupabaseErrorLike): string =>
  [error.code, error.message, error.details, error.hint].filter(Boolean).join(" | ");

const isMissingOptionalSchemaError = (error: SupabaseErrorLike): boolean => {
  const message = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    error.code === "PGRST204" ||
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.code === "42703" ||
    message.includes("could not find the table") ||
    message.includes("could not find the") ||
    message.includes("does not exist")
  );
};

const formatUnknownError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse(
      { error: "Account deletion is not configured on the server." },
      500,
    );
  }

  const authorization = request.headers.get("Authorization");
  const accessToken = authorization?.replace(/^Bearer\s+/i, "");

  if (!authorization || !accessToken) {
    return jsonResponse({ error: "Missing authorization token." }, 401);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(accessToken);

  if (userError || !user) {
    return jsonResponse({ error: "Invalid authorization token." }, 401);
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    for (const target of cleanupTargets) {
      const { error } = await adminClient
        .from(target.table)
        .delete()
        .eq(target.column, user.id);

      if (error) {
        if (target.optional && isMissingOptionalSchemaError(error)) {
          console.warn(
            `delete-account skipped optional cleanup target ${target.table}.${target.column}: ${formatSupabaseError(error)}`,
          );
          continue;
        }

        throw new Error(
          `Failed to delete ${target.table}.${target.column}: ${formatSupabaseError(error)}`,
        );
      }
    }

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteUserError) {
      throw deleteUserError;
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("delete-account failed", formatUnknownError(error));
    return jsonResponse(
      { error: "Unable to delete account right now. Please try again." },
      500,
    );
  }
});