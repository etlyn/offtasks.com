// This worker only handles notifications. It never intercepts requests or caches planner data.
const bindingCache = "offtasks-reminder-device-v1";
const bindingPath = "/offtasks-reminder-device";

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    const message = event.data?.json();
    if (!message || typeof message.id !== "string" || typeof message.deviceId !== "string" ||
        typeof message.body !== "string" || !message.body) return;
    const cache = await caches.open(bindingCache);
    const binding = await cache.match(bindingPath);
    if (await binding?.text() !== message.deviceId) return;
    await self.registration.showNotification("Reminder", {
      body: message.body,
      icon: "/favicon.ico",
      tag: `offtasks-reminder:${message.id}`,
      data: { deviceId: message.deviceId },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const cache = await caches.open(bindingCache);
    const binding = await cache.match(bindingPath);
    if (await binding?.text() !== event.notification.data?.deviceId) return;
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const planner = windows.find((client) => new URL(client.url).pathname === "/app");
    if (planner) await planner.focus();
    else await self.clients.openWindow("/app");
  })());
});
