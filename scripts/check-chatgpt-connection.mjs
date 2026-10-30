import assert from "node:assert/strict";
import { createServer } from "vite";

// Synthetic account data and transport; never opens a real user's account.
const modulePath = process.env.OFFTASK_PLAYWRIGHT_MODULE;
if (!modulePath) throw new Error("Set OFFTASK_PLAYWRIGHT_MODULE to playwright/index.mjs");
const { chromium } = await import(modulePath);
const server = await createServer({ server: { host: "127.0.0.1", port: 0, open: false } });
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}/test/fixtures/chatgpt-connection.html`;
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 650 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base);
  await page.getByText("Coming soon").waitFor();
  assert.equal(await page.getByRole("button", { name: "Connect ChatGPT" }).isDisabled(), true);
  assert.equal(await page.locator("html").evaluate((node) => node.scrollWidth <= node.clientWidth), true);
  await page.screenshot({ path: "/tmp/offtasks-chatgpt-web-available-light.png" });
  await page.goto(`${base}?mode=public`);
  assert.equal(await page.getByRole("link", { name: "Connect ChatGPT" }).getAttribute("href"), "https://chatgpt.com/plugins/offtasks");
  await page.goto(`${base}?mode=connected-public`);
  assert.equal(await page.getByRole("link", { name: "Open in ChatGPT" }).getAttribute("href"), "https://chatgpt.com/plugins/offtasks");
  assert.equal(await page.getByRole("button", { name: "Disconnect" }).isVisible(), true);
  assert.equal(await page.locator("html").evaluate((node) => node.scrollWidth <= node.clientWidth), true);
  await page.screenshot({ path: "/tmp/offtasks-chatgpt-web-connected-public.png" });
  await page.goto(`${base}?mode=connected&dark`);
  await page.getByText("Access allowed · Read and edit").waitFor();
  await page.screenshot({ path: "/tmp/offtasks-chatgpt-web-connected-dark.png" });
  await page.getByRole("button", { name: "Disconnect" }).click();
  await page.getByText("Disconnect ChatGPT from your Offtasks account?").waitFor();
  await page.getByRole("button", { name: "Cancel" }).click();
  assert.deepEqual(await page.evaluate(() => window.fixtureCalls), []);
  await page.goto(`${base}?mode=race`);
  await page.getByRole("button", { name: "Switch account" }).click();
  await page.getByText("Coming soon").waitFor();
  await page.waitForTimeout(650);
  assert.equal(await page.getByText("Access allowed · Read and edit").count(), 0);
  await page.goto(`${base}?mode=retry`);
  await page.getByText("Access allowed · Read and edit").waitFor();
  await page.getByRole("button", { name: "Disconnect" }).click();
  await page.getByRole("button", { name: "Disconnect", exact: true }).last().click();
  await page.getByRole("alert").waitFor();
  await page.getByRole("button", { name: "Disconnect", exact: true }).last().click();
  await page.getByText("Coming soon").waitFor();
  const calls = await page.evaluate(() => window.fixtureCalls);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], calls[1]);
  assert.equal(calls[0].owner, "owner-a");
  assert.equal(calls[0].revision, "42");
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ fixture: "synthetic web account", narrow: true, publicLink: true, disconnectConfirmation: true, staleAccountGuard: true, idempotentRetry: true, dark: true, errors }));
} finally {
  await browser.close();
  await server.close();
}
