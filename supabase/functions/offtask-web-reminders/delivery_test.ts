import assert from "node:assert/strict";
import { createECDH, randomBytes } from "node:crypto";
import webPush from "npm:web-push@3.6.7";
import { deliverReminder, type ReminderJob } from "./delivery.ts";

const vapid = { ...webPush.generateVAPIDKeys(), subject: "mailto:info@etlyn.com" };
const subscriber = createECDH("prime256v1");
const job: ReminderJob = {
  id: "11111111-1111-4111-8111-111111111111",
  lease: "22222222-2222-4222-8222-222222222222",
  device_id: "33333333-3333-4333-8333-333333333333",
  endpoint: "https://fcm.googleapis.com/fcm/send/fixture",
  p256dh: subscriber.generateKeys().toString("base64url"),
  auth_secret: randomBytes(16).toString("base64url"),
  body: "Sample private task",
  expires_at: new Date(Date.now() + 120_000).toISOString(),
};

Deno.test("the browser push service receives an authenticated encrypted payload", async () => {
  const result = await deliverReminder(job, vapid, async (url, options) => {
    assert.equal(url, job.endpoint);
    assert.equal(options?.redirect, "error");
    assert.equal(options?.method, "POST");
    const headers = new Headers(options?.headers);
    assert.equal(headers.get("content-encoding"), "aes128gcm");
    assert.ok(headers.get("authorization")?.startsWith("vapid "));
    assert.equal(headers.get("topic"), job.id.replaceAll("-", ""));
    assert.ok(Number(headers.get("ttl")) > 0);
    assert.ok(options?.body instanceof Uint8Array);
    assert.ok(!new TextDecoder().decode(options.body).includes(job.body!));
    return new Response(null, { status: 201 });
  });
  assert.equal(result, "sent");
});

Deno.test("delivery retries transient failures and removes expired subscriptions", async () => {
  for (const [status, result] of [[410, "expired-device"], [404, "expired-device"], [503, "retry"], [429, "retry"], [400, "discard"]] as const) {
    assert.equal(await deliverReminder(job, vapid, () => Promise.resolve(new Response(null, { status }))), result);
  }

  const unexpected = () => { throw new Error("Must not make a request"); };
  assert.equal(await deliverReminder({ ...job, body: null }, vapid, unexpected), "discard");
  assert.equal(await deliverReminder({ ...job, expires_at: new Date(0).toISOString() }, vapid, unexpected), "discard");
  assert.equal(await deliverReminder({ ...job, endpoint: "https://unrecognized.example/push" }, vapid, unexpected), "discard");
});
