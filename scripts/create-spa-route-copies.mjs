import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const buildDir = join(projectRoot, "build");
const indexFile = join(buildDir, "index.html");
const privacyPolicy = JSON.parse(
  await readFile(join(projectRoot, "src/config/privacyPolicy.json"), "utf8"),
);
const indexHtml = await readFile(indexFile, "utf8");

const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

// Put the same policy used by React in the initial response. This keeps it
// readable when scripts are unavailable and lets reviewers inspect the text.
const privacyMarkup = `<main style="max-width: 52rem; margin: 0 auto; padding: 2rem 1.25rem; font: 16px/1.65 system-ui, sans-serif; color: #17212b">
  <a href="/">Offtasks home</a>
  <h1>${escapeHtml(privacyPolicy.title)}</h1>
  <p>${escapeHtml(privacyPolicy.description)}</p>
  <p>${escapeHtml(privacyPolicy.updatedLabel)}</p>
  ${privacyPolicy.sections.map((section) => `<section>
    <h2>${escapeHtml(section.title)}</h2>
    <ul>${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    ${(section.links ?? []).map((link) => `<p><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></p>`).join("")}
  </section>`).join("\n")}
  <p><a href="/support#contact">Contact support for privacy requests</a></p>
  </main>`;

if (!indexHtml.includes('<div id="root"></div>')) {
  throw new Error("Cannot add the privacy fallback: the SPA root is missing.");
}
const privacyHtml = indexHtml
  .replace('<div id="root"></div>', `<div id="root">${privacyMarkup}</div>`)
  .replace("<title>Offtasks: To-Do without noise</title>", "<title>Privacy Policy | Offtasks</title>")
  .replace('<link rel="canonical" href="https://offtasks.com/" />', '<link rel="canonical" href="https://www.offtasks.com/privacy" />');

const appRoutes = [
  "privacy",
  "privacy-policy",
  "support",
  "contact",
  "terms",
  "app",
  "login",
  "signup",
  "forgot-password",
  "reset-password",
  "oauth/consent",
];

await copyFile(indexFile, join(buildDir, "404.html"));

await Promise.all(
  appRoutes.map(async (route) => {
    const routeDir = join(buildDir, route);
    await mkdir(routeDir, { recursive: true });
    if (route === "privacy" || route === "privacy-policy") {
      await writeFile(join(routeDir, "index.html"), privacyHtml);
    } else {
      await copyFile(indexFile, join(routeDir, "index.html"));
    }
  }),
);

console.log(
  `Created SPA fallback files for ${appRoutes.length} routes and build/404.html.`,
);
