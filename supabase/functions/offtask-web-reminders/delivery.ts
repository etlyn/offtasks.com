import webPush from "npm:web-push@3.6.7";

export type ReminderJob = {
  id: string;
  lease: string;
  device_id: string;
  endpoint: string;
  p256dh: string;
  auth_secret: string;
  body: string | null;
  expires_at: string;
};

export type Vapid = { subject: string; publicKey: string; privateKey: string };
export type DeliveryResult = "sent" | "discard" | "expired-device" | "retry";

function isPushService(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && !url.hash
      && /^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/.test(url.hostname);
  } catch {
    return false;
  }
}

export async function deliverReminder(
  job: ReminderJob,
  vapid: Vapid,
  send: typeof fetch = fetch,
): Promise<DeliveryResult> {
  const ttl = Math.floor((Date.parse(job.expires_at) - Date.now()) / 1000);
  if (!job.body || !Number.isFinite(ttl) || ttl <= 0 || !isPushService(job.endpoint)) return "discard";
  try {
    const request = webPush.generateRequestDetails(
      { endpoint: job.endpoint, keys: { p256dh: job.p256dh, auth: job.auth_secret } },
      JSON.stringify({ id: job.id, deviceId: job.device_id, body: job.body }),
      {
        TTL: Math.min(ttl, 900),
        urgency: "high",
        topic: job.id.replaceAll("-", ""),
        contentEncoding: "aes128gcm",
        vapidDetails: vapid,
      },
    );
    const headers = new Headers(request.headers);
    headers.delete("Content-Length");
    const response = await send(job.endpoint, {
      method: "POST",
      headers,
      body: new Uint8Array(request.body),
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    await response.body?.cancel();
    if (response.ok) return "sent";
    if (response.status === 404 || response.status === 410) return "expired-device";
    if (response.status === 400 || response.status === 413) return "discard";
    return "retry";
  } catch {
    return "retry";
  }
}
