#!/usr/bin/env node

import { execSync, spawn } from "child_process";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const port = process.env.PORT || "3847";

if (!existsSync(resolve(root, ".next"))) {
  console.log("Building clawgether...");
  execSync("npm run build", { cwd: root, stdio: "inherit" });
}

console.log(`\n  🦞 clawgether running at http://localhost:${port}\n`);

const server = spawn("node", ["--import", "tsx", "server.ts"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production", PORT: port },
});

server.on("close", (code) => process.exit(code ?? 0));

process.on("SIGINT", () => {
  server.kill("SIGINT");
});
