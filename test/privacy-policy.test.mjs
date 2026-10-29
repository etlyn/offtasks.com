import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const policy = JSON.parse(await readFile("src/config/privacyPolicy.json", "utf8"));
const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);

test("both privacy routes expose the complete current policy in their initial HTML", async () => {
  for (const route of ["privacy", "privacy-policy"]) {
    const html = await readFile(`build/${route}/index.html`, "utf8");
    assert.match(html, /<title>Privacy Policy \| Offtasks<\/title>/);
    assert.match(html, /<link rel="canonical" href="https:\/\/www\.offtasks\.com\/privacy"\s*\/>/);
    assert.ok(html.includes(escapeHtml(policy.updatedLabel)));
    for (const section of policy.sections) {
      assert.ok(html.includes(`<h2>${escapeHtml(section.title)}</h2>`), section.title);
      for (const item of section.items) assert.ok(html.includes(escapeHtml(item)), item);
      for (const link of section.links ?? []) {
        assert.ok(html.includes(`href="${escapeHtml(link.href)}"`), link.href);
      }
    }
    assert.ok(html.includes('href="/support#contact"'));
    assert.ok(html.includes('<script type="module"'));
  }
});

test("other SPA routes do not include the privacy fallback", async () => {
  for (const route of ["app", "support", "login"]) {
    const html = await readFile(`build/${route}/index.html`, "utf8");
    assert.ok(html.includes('<div id="root"></div>'), route);
  }
});

test("Vercel serves the policy HTML for the exact public URLs before the SPA fallback", async () => {
  const config = JSON.parse(await readFile("vercel.json", "utf8"));
  const fallback = config.rewrites.findIndex((rewrite) => rewrite.source === "/(.*)");
  assert.ok(fallback >= 0);
  for (const route of ["privacy", "privacy-policy"]) {
    const index = config.rewrites.findIndex((rewrite) =>
      rewrite.source === `/${route}` && rewrite.destination === `/${route}/index.html`,
    );
    assert.ok(index >= 0 && index < fallback, route);
  }
});
