
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const { version } = JSON.parse(
  readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf8"),
);

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(version) },
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