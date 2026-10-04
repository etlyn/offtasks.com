import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { handleDeleteAccountRequest } from "./delete-account.ts";

serve(async (request) => {
  return handleDeleteAccountRequest(request, {
    supabaseUrl: Deno.env.get("SUPABASE_URL"),
    supabaseAnonKey: Deno.env.get("SUPABASE_ANON_KEY"),
    supabaseServiceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    createUserClient: (supabaseUrl, supabaseAnonKey, authorization) =>
      createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: authorization,
          },
        },
      }),
    createAdminClient: (supabaseUrl, supabaseServiceRoleKey) =>
      createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }),
    logger: console,
  });
});