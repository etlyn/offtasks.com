import { timingSafeEqual } from "node:crypto";
import { createClient } from "npm:@supabase/supabase-js@2.75.1";
import { deliverReminder, type ReminderJob } from "./delivery.ts";

const secret = Deno.env.get("OFFTASKS_PUSH_CRON_TOKEN") ?? "";
const vapid = {
  subject: "mailto:info@etlyn.com",
  publicKey: Deno.env.get("OFFTASKS_PUSH_PUBLIC_KEY") ?? "",
  privateKey: Deno.env.get("OFFTASKS_PUSH_PRIVATE_KEY") ?? "",
};
const encode = new TextEncoder();

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const supplied = request.headers.get("x-offtasks-cron") ?? "";
  if (!/^[a-f0-9]{64}$/.test(secret) || !/^[a-f0-9]{64}$/.test(supplied)
      || !timingSafeEqual(encode.encode(secret), encode.encode(supplied))) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!vapid.publicKey || !vapid.privateKey) return new Response("Unavailable", { status: 503 });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.rpc("offtask_web_reminder_claim", { worker_key: vapid.publicKey })
    .abortSignal(AbortSignal.timeout(8000));
  if (error) return new Response("Queue unavailable", { status: 503 });

  const outcomes = await Promise.all((data as ReminderJob[]).map(async (job) => {
    const result = await deliverReminder(job, vapid);
    if (result === "retry") return result;
    const finished = await admin.rpc("offtask_web_reminder_finish", {
      job_id: job.id,
      job_lease: job.lease,
      expired_endpoint: result === "expired-device" ? job.endpoint : null,
    }).abortSignal(AbortSignal.timeout(8000));
    return finished.error ? "retry" : result;
  }));

  return Response.json({
    claimed: outcomes.length,
    sent: outcomes.filter((result) => result === "sent").length,
    retry: outcomes.filter((result) => result === "retry").length,
  });
});
