export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export interface CleanupTarget {
  table: string;
  column: string;
  optional?: boolean;
}

export interface SupabaseErrorLike {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
}

interface DeleteResult {
  error: SupabaseErrorLike | null;
}

interface DeleteQuery {
  eq(column: string, value: string): Promise<DeleteResult>;
}

interface AdminTableClient {
  delete(): DeleteQuery;
}

export interface UserLike {
  id: string;
}

export interface UserClient {
  auth: {
    getUser(accessToken: string): Promise<{
      data: { user: UserLike | null };
      error: SupabaseErrorLike | null;
    }>;
  };
}

export interface AdminClient {
  from(table: string): AdminTableClient;
  auth?: {
    admin?: {
      deleteUser?: (userId: string) => Promise<unknown>;
      signOut?: (userId: string) => Promise<unknown>;
    };
  };
}

export interface DeleteAccountHandlerDependencies {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
  createUserClient: (
    supabaseUrl: string,
    supabaseAnonKey: string,
    authorization: string,
  ) => UserClient;
  createAdminClient: (
    supabaseUrl: string,
    supabaseServiceRoleKey: string,
  ) => AdminClient;
  logger?: Pick<Console, "warn" | "error">;
}

export interface DeleteAccountSuccessResponse {
  deleted: "app-data";
  identityRetained: true;
  signedOutScope: "client-local";
}

type JsonRecord = Record<string, unknown>;

export const cleanupTargets: CleanupTarget[] = [
  { table: "tasks", column: "user_id" },
  { table: "planner_items", column: "user_id", optional: true },
  { table: "user_preferences", column: "user_id", optional: true },
  { table: "profiles", column: "id", optional: true },
  { table: "profiles", column: "user_id", optional: true },
];

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

export const formatSupabaseError = (error: SupabaseErrorLike): string =>
  [error.code, error.message, error.details, error.hint].filter(Boolean).join(" | ");

export const isMissingOptionalSchemaError = (error: SupabaseErrorLike): boolean => {
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

const readJsonBody = async (request: Request): Promise<JsonRecord> => {
  const rawBody = await request.text();

  if (!rawBody.trim()) {
    return {};
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new Error("Account deletion request body must be valid JSON.");
  }

  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("Account deletion request body must be a JSON object.");
  }

  return parsed as JsonRecord;
};

const containsForbiddenUserIdentifier = (body: JsonRecord): boolean =>
  "userId" in body || "user_id" in body || "id" in body;

export const deleteOfftasksData = async (
  adminClient: AdminClient,
  userId: string,
  logger: Pick<Console, "warn"> = console,
): Promise<void> => {
  for (const target of cleanupTargets) {
    const { error } = await adminClient
      .from(target.table)
      .delete()
      .eq(target.column, userId);

    if (error) {
      if (target.optional && isMissingOptionalSchemaError(error)) {
        logger.warn(
          `delete-account skipped optional cleanup target ${target.table}.${target.column}: ${formatSupabaseError(error)}`,
        );
        continue;
      }

      throw new Error(
        `Failed to delete ${target.table}.${target.column}: ${formatSupabaseError(error)}`,
      );
    }
  }
};

export const handleDeleteAccountRequest = async (
  request: Request,
  {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    createUserClient,
    createAdminClient,
    logger = console,
  }: DeleteAccountHandlerDependencies,
): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse(
      { error: "Account deletion is not configured on the server." },
      500,
    );
  }

  let body: JsonRecord;

  try {
    body = await readJsonBody(request);
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Account deletion request body is invalid.",
      },
      400,
    );
  }

  if (containsForbiddenUserIdentifier(body)) {
    return jsonResponse(
      { error: "User identity must come from the signed-in session only." },
      400,
    );
  }

  const authorization = request.headers.get("Authorization");
  const accessToken = authorization?.replace(/^Bearer\s+/i, "");

  if (!authorization || !accessToken) {
    return jsonResponse({ error: "Missing authorization token." }, 401);
  }

  const userClient = createUserClient(supabaseUrl, supabaseAnonKey, authorization);

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(accessToken);

  if (userError || !user) {
    return jsonResponse({ error: "Invalid authorization token." }, 401);
  }

  const adminClient = createAdminClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    await deleteOfftasksData(adminClient, user.id, logger);

    return jsonResponse({
      deleted: "app-data",
      identityRetained: true,
      signedOutScope: "client-local",
    });
  } catch (error) {
    logger.error("delete-account failed", formatUnknownError(error));
    return jsonResponse(
      { error: "Unable to delete Offtasks data right now. Please try again." },
      500,
    );
  }
};
