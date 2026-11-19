# Web task reminders

The task composer uses the iPhone's Remind me, date-and-time, Done and No reminder flow. An upcoming reminder shows as a bell and time on the task row. The selected task date and reminder time are independent.

Allow notifications when setting the time. Chrome and other compatible browsers can receive Web Push with every Offtasks tab closed. On iPhone or iPad, add Offtasks to the Home Screen and open it there to enable web notifications. Device-local reminders set in the native app and subscriptions set in the web app are separate.

## Delivery

The browser sends its subscription only when a reminder is saved. Reminders are bound to a first-party session and one browser. The dispatcher reads the current task title when due, encrypts the payload, and hands it to the browser's notification service. Due jobs are picked up each minute, with retries within a 15-minute delivery window. Browser and operating system settings, connectivity and the push service affect when the notification appears. Completing or deleting a task cancels its reminder, including changes made in the other client. Signing out clears reminders in that browser.

## Deployment

1. Apply `20261119000000_offtask_web_reminders.sql` and deploy the updated `delete-account` function. It deletes browser subscriptions and scheduled reminders along with other Offtasks data.
2. Generate one VAPID key pair and a random 32-byte hexadecimal cron token. Set `OFFTASKS_PUSH_PUBLIC_KEY`, `OFFTASKS_PUSH_PRIVATE_KEY` and `OFFTASKS_PUSH_CRON_TOKEN` as Edge Function secrets. Keep the existing key pair on subsequent deploys so browser subscriptions remain valid.
3. Deploy `offtask-web-reminders` with Supabase gateway JWT verification off. The handler authenticates its dedicated token and uses the runtime's service role only for claiming and finishing jobs.
4. Store the function URL and the same cron token in Supabase Vault under `offtasks_web_reminder_url` and `offtasks_web_reminder_token`. Apply [the cron setup SQL](../supabase/offtask-web-reminder-cron.sql). It calls the function only when an enabled origin has work due.
5. Add the approved web origin and VAPID public key to `public.offtask_web_reminder_origins`. Enable `https://stg.offtasks.com` for staging review and add the public origin when the web release is approved.

To pause delivery, unschedule the `offtasks-web-reminders` job and remove the corresponding public key configuration from the origins table. Preserve the current VAPID keys for resuming delivery.

The local sample backend can simulate saving and listing reminders when started with `SAMPLE_PUSH_PUBLIC_KEY`. It does not run the dispatch job.

## Verification

Run `yarn test:database` for the owner, session, completion, cancellation and lease contracts. Run `deno test --frozen --allow-env` from `supabase/functions/offtask-web-reminders` for transport and encryption behavior. Browser acceptance covers a dedicated sample task, notification permission, saving after reload, and delivery while the planner tab is closed.
