import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanupTargets,
  handleDeleteAccountRequest,
  type AdminClient,
  type SupabaseErrorLike,
  type UserClient,
} from "./delete-account.js";

type DeleteCall = {
  table: string;
  column: string;
  value: string;
};

const testUserId = "2ef7d910-2293-4dbf-b3f7-9fb7b080ca19";
const foreignUserId = "8eb55f9c-9ef6-41d0-95fd-e5fd9eb1b4f7";

class FakeAdminClient implements AdminClient {
  readonly calls: DeleteCall[] = [];
  readonly deleteUserCalls: string[] = [];
  readonly rows: Record<string, Set<string>>;
  readonly failOnceTargets = new Set<string>();

  constructor({
    rows,
    failOnceTargets = [],
  }: {
    rows?: Record<string, string[]>;
    failOnceTargets?: string[];
  } = {}) {
    this.rows = Object.fromEntries(
      Object.entries(rows ?? {}).map(([table, userIds]) => [table, new Set(userIds)]),
    );

    for (const target of failOnceTargets) {
      this.failOnceTargets.add(target);
    }
  }

  auth = {
    admin: {
      deleteUser: async (userId: string) => {
        this.deleteUserCalls.push(userId);
        return { error: null };
      },
    },
  };

  from(table: string) {
    return {
      delete: () => ({
        eq: async (column: string, value: string) => {
          this.calls.push({ table, column, value });

          const failKey = `${table}.${column}`;
          if (this.failOnceTargets.has(failKey)) {
            this.failOnceTargets.delete(failKey);
            return {
              error: {
                code: "XX000",
                message: `planned failure for ${failKey}`,
              } satisfies SupabaseErrorLike,
            };
          }

          this.rows[table]?.delete(value);
          return { error: null };
        },
      }),
    };
  }
}

const createUserClient = (userId: string | null): UserClient => ({
  auth: {
    getUser: async (accessToken: string) => {
      if (accessToken !== "valid-token" || !userId) {
        return {
          data: { user: null },
          error: { message: "invalid token" },
        };
      }

      return {
        data: { user: { id: userId } },
        error: null,
      };
    },
  },
});

const createRequest = (body: unknown = {}) =>
  new Request("https://example.com/functions/v1/delete-account", {
    method: "POST",
    headers: {
      Authorization: "Bearer valid-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

const createDependencies = (adminClient: FakeAdminClient, userId: string | null = testUserId) => ({
  supabaseUrl: "https://example.supabase.co",
  supabaseAnonKey: "anon-key",
  supabaseServiceRoleKey: "service-role-key",
  createUserClient: () => createUserClient(userId),
  createAdminClient: () => adminClient,
  logger: {
    warn: () => undefined,
    error: () => undefined,
  },
});

test("deletes Offtasks-owned data, retains identity, and never deletes the auth user", async () => {
  const adminClient = new FakeAdminClient({
    rows: {
      tasks: [testUserId, foreignUserId],
      planner_items: [testUserId, foreignUserId],
      user_preferences: [testUserId, foreignUserId],
      profiles: [testUserId, foreignUserId],
    },
  });

  const response = await handleDeleteAccountRequest(
    createRequest(),
    createDependencies(adminClient),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    deleted: "app-data",
    identityRetained: true,
    signedOutScope: "client-local",
  });
  assert.deepEqual(
    adminClient.calls.map(({ table, column }) => `${table}.${column}`),
    cleanupTargets.map(({ table, column }) => `${table}.${column}`),
  );
  assert.equal(adminClient.deleteUserCalls.length, 0);
  assert.deepEqual([...adminClient.rows.tasks], [foreignUserId]);
  assert.deepEqual([...adminClient.rows.planner_items], [foreignUserId]);
  assert.deepEqual([...adminClient.rows.user_preferences], [foreignUserId]);
  assert.deepEqual([...adminClient.rows.profiles], [foreignUserId]);
});

test("retry after a partial failure is safe and completes cleanup", async () => {
  const adminClient = new FakeAdminClient({
    rows: {
      tasks: [testUserId],
      planner_items: [testUserId],
      user_preferences: [testUserId],
      profiles: [testUserId],
    },
    failOnceTargets: ["planner_items.user_id"],
  });

  const firstResponse = await handleDeleteAccountRequest(
    createRequest(),
    createDependencies(adminClient),
  );
  assert.equal(firstResponse.status, 500);
  assert.deepEqual(await firstResponse.json(), {
    error: "Unable to delete Offtasks data right now. Please try again.",
  });
  assert.deepEqual([...adminClient.rows.tasks], []);
  assert.deepEqual([...adminClient.rows.planner_items], [testUserId]);

  const secondResponse = await handleDeleteAccountRequest(
    createRequest(),
    createDependencies(adminClient),
  );
  assert.equal(secondResponse.status, 200);
  assert.deepEqual(await secondResponse.json(), {
    deleted: "app-data",
    identityRetained: true,
    signedOutScope: "client-local",
  });
  assert.deepEqual([...adminClient.rows.tasks], []);
  assert.deepEqual([...adminClient.rows.planner_items], []);
  assert.deepEqual([...adminClient.rows.user_preferences], []);
  assert.deepEqual([...adminClient.rows.profiles], []);
});

test("rejects unauthenticated requests", async () => {
  const adminClient = new FakeAdminClient();
  const response = await handleDeleteAccountRequest(
    new Request("https://example.com/functions/v1/delete-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }),
    createDependencies(adminClient),
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: "Missing authorization token.",
  });
  assert.equal(adminClient.calls.length, 0);
  assert.equal(adminClient.deleteUserCalls.length, 0);
});

test("rejects forged body user identifiers and does not trust caller-supplied ids", async () => {
  const adminClient = new FakeAdminClient();
  const response = await handleDeleteAccountRequest(
    createRequest({ userId: foreignUserId }),
    createDependencies(adminClient),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "User identity must come from the signed-in session only.",
  });
  assert.equal(adminClient.calls.length, 0);
  assert.equal(adminClient.deleteUserCalls.length, 0);
});
