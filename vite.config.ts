
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const { version } = JSON.parse(
  readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf8"),
);

// Vercel builds every branch except the production one as "preview". That is staging
// (stg.offtasks.com), and its visits must not be counted with the public site's.
const staging = process.env.VERCEL_ENV === "preview";

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    "import.meta.env.VITE_STAGING": JSON.stringify(staging ? "1" : ""),
  },
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  build: {
    target: "esnext",
    outDir: "build"
  },
  server: {
    port: 9500,
    // The sample-data launcher starts the site without opening a browser window.
    open: !process.env.OFFTASKS_NO_OPEN
  }
});