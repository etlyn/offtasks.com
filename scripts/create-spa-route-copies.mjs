import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const buildDir = join(projectRoot, "build");
const indexFile = join(buildDir, "index.html");

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
];

await copyFile(indexFile, join(buildDir, "404.html"));

await Promise.all(
  appRoutes.map(async (route) => {
    const routeDir = join(buildDir, route);
    await mkdir(routeDir, { recursive: true });
    await copyFile(indexFile, join(routeDir, "index.html"));
  }),
);

console.log(
  `Created SPA fallback files for ${appRoutes.length} routes and build/404.html.`,
);