import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createCodexDatabaseFixture,
  OWNER_A,
  OWNER_B,
} from "./helpers/codex-database.mjs";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGM4OTMZiBggFAAzMgcVZeU6ewAAAABJRU5ErkJggg==";
const JPEG = [
  "/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAA",
  "AqADAAQAAAABAAAAAgAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgA",
  "AgACAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBh",
  "NRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SF",
  "hoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMB",
  "AQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1Lw",
  "FWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqK",
  "jpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMAAgICAgICAwICAwUDAwMFBgUFBQUG",
  "CAYGBgYGCAoICAgICAgKCgoKCgoKCgwMDAwMDA4ODg4ODw8PDw8PD//bAEMBAgICBAQEBwQEBxALCQsQEBAQEBAQEBAQEBAQEBAQEBAQ",
  "EBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEP/dAAQAAf/aAAwDAQACEQMRAD8A+hKKKK/nM/cD/9k=",
].join("");

async function setup(t) {
  const fixture = await createCodexDatabaseFixture(t);
  const { db, owner } = fixture;
  await db.exec("reset role");
  await db.exec(await readFile(new URL(
    "../supabase/migrations/20261111000000_offtask_goal_logos.sql",
    import.meta.url,
  ), "utf8"));
  await owner(OWNER_A);
  const saveLogo = (id, type, image) =>
    db.query("select public.offtask_set_goal_logo($1, $2, $3)", [id, type, image]);
  const logos = async () => (await db.query(
    "select goal_id, mime_type, image_base64 from public.offtask_goal_logos",
  )).rows;
  return { ...fixture, saveLogo, logos };
}

test("logo belongs to the canonical goal and can be replaced or removed", async (t) => {
  const { db, read, mutate, saveLogo, logos } = await setup(t);
  await db.query("insert into planner_items(user_id, kind, id, value) values ($1, 'goal', 'travel', '\"Travel\"')", [OWNER_A]);
  const { goals: [goal] } = await read("list_goals");
  assert.deepEqual(await logos(), []);
  await saveLogo(goal.id, "image/png", PNG);
  assert.deepEqual(await logos(), [{ goal_id: goal.id, mime_type: "image/png", image_base64: PNG }]);
  assert.equal((await read("list_goals")).goals[0].revision, goal.revision);
  assert.ok(!JSON.stringify(await read("get_goal_context", { goal_id: goal.id })).includes(PNG));

  const { goal: renamed } = await mutate("save_goal", {
    goal_id: goal.id, expected_revision: goal.revision, title: "Vacation",
  });
  const { rows } = await db.query(`
    select logo.goal_id, goal.legacy_goal_id
    from public.offtask_goal_logos logo join public.offtask_goals goal on logo.goal_id = goal.id
  `);
  assert.deepEqual(rows, [{ goal_id: goal.id, legacy_goal_id: "vacation" }]);

  await saveLogo(goal.id, "image/jpeg", JPEG);
  await saveLogo(goal.id, "image/jpeg", JPEG);
  assert.deepEqual(await logos(), [{ goal_id: goal.id, mime_type: "image/jpeg", image_base64: JPEG }]);
  await saveLogo(goal.id, null, null);
  await saveLogo(goal.id, null, null);
  assert.deepEqual(await logos(), []);

  await saveLogo(goal.id, "image/png", PNG);
  await mutate("save_goal", {
    goal_id: goal.id, expected_revision: renamed.revision, title: renamed.title, status: "archived",
  });
  assert.deepEqual(await logos(), []);
  await assert.rejects(() => saveLogo(goal.id, "image/png", PNG), /not_found/);
  await db.exec("reset role");
  await db.query("delete from public.offtask_goals where id = $1", [goal.id]);
  assert.deepEqual(await logos(), []);
});

test("a logo is private to the first-party session of the goal owner", async (t) => {
  const { db, owner, mutate, saveLogo, logos } = await setup(t);
  const { goal } = await mutate("save_goal", { title: "Private" });
  await saveLogo(goal.id, "image/png", PNG);
  await assert.rejects(() => db.exec("delete from public.offtask_goal_logos"), /permission denied/);

  await owner(OWNER_B);
  assert.deepEqual(await logos(), []);
  await assert.rejects(() => saveLogo(goal.id, "image/png", PNG), /not_found/);
  await assert.rejects(() => saveLogo(goal.id, null, null), /not_found/);

  await owner(OWNER_A);
  await db.exec(`select set_config('request.jwt.claims', '{"client_id":"oauth"}', false)`);
  assert.deepEqual(await logos(), []);
  await assert.rejects(() => saveLogo(goal.id, "image/png", PNG), /OAuth credentials/);

  await db.exec("reset role; set role anon");
  await assert.rejects(logos, /permission denied/);
  await assert.rejects(() => saveLogo(goal.id, null, null), /permission denied/);
});

test("invalid format, size and dimensions leave the existing logo intact", async (t) => {
  const { mutate, saveLogo, logos } = await setup(t);
  const { goal } = await mutate("save_goal", { title: "Validate" });
  await saveLogo(goal.id, "image/png", PNG);
  const pngWide = Buffer.from(PNG, "base64");
  pngWide.writeUInt32BE(1025, 16);
  const jpegTall = Buffer.from(JPEG, "base64");
  const frame = jpegTall.indexOf(Buffer.from([0xff, 0xc0]));
  assert.ok(frame > 0);
  jpegTall.writeUInt16BE(1025, frame + 5);
  for (const [type, image] of [
    ["image/png", null],
    ["image/svg+xml", PNG],
    ["image/jpeg", PNG],
    ["image/png", `data:image/png;base64,${PNG}`],
    ["image/png", Buffer.alloc(131073).toString("base64")],
    ["image/png", pngWide.toString("base64")],
    ["image/jpeg", jpegTall.toString("base64")],
    ["image/jpeg", "/9j/2Q=="],
  ]) {
    await assert.rejects(() => saveLogo(goal.id, type, image), /Invalid goal logo image/);
  }
  assert.deepEqual(await logos(), [{ goal_id: goal.id, mime_type: "image/png", image_base64: PNG }]);
});
