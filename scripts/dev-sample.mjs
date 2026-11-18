// Runs the site against the local sample backend, for design work without an account.
//   yarn dev:sample            then open http://127.0.0.1:9500
// The sample sign-in is in scripts/sample-data.mjs.
import { spawn } from "node:child_process";
import { server } from "./sample-backend.mjs";

const backendPort = Number(process.env.SAMPLE_BACKEND_PORT || 54399);
const sitePort = process.env.SAMPLE_SITE_PORT || "9500";

server.listen(backendPort, "127.0.0.1", () => {
  console.log(`Sample backend on http://127.0.0.1:${backendPort}`);
  const site = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", sitePort, "--strictPort", ...process.argv.slice(2)], {
    stdio: "inherit",
    env: {
      ...process.env,
      OFFTASKS_NO_OPEN: "1",
      VITE_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${backendPort}`,
      VITE_PUBLIC_SUPABASE_ANON_KEY: "sample-anon-key",
      VITE_PUBLIC_SITE_URL: `http://127.0.0.1:${sitePort}`,
    },
  });
  const stop = () => {
    site.kill();
    server.close();
  };
  site.on("exit", (code) => {
    server.close();
    process.exit(code ?? 0);
  });
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
});
