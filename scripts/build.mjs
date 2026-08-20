import { build } from "esbuild";
import { copyFile, mkdir, cp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(root, "..");
const srcDir = path.join(projectRoot, "src");
const distDir = path.join(projectRoot, "dist");

function runTypecheck() {
  const result = spawnSync(
    path.join(projectRoot, "node_modules/.bin/tsc"),
    ["--noEmit", "-p", "tsconfig.json"],
    { cwd: projectRoot, stdio: "inherit" },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function copyStatic() {
  await copyFile(path.join(srcDir, "manifest.json"), path.join(distDir, "manifest.json"));
  await cp(path.join(srcDir, "icons"), path.join(distDir, "icons"), { recursive: true });
  await ensureDir(path.join(distDir, "popup"));
  await copyFile(path.join(srcDir, "popup/popup.html"), path.join(distDir, "popup/popup.html"));
  await copyFile(path.join(srcDir, "popup/popup.css"), path.join(distDir, "popup/popup.css"));
}

runTypecheck();
await rm(distDir, { recursive: true, force: true });
await ensureDir(distDir);

// MAIN-world page must be a classic IIFE so it runs synchronously at document_start
// (ES module content scripts are deferred and miss ytInitialPlayerResponse).
await build({
  entryPoints: [path.join(srcDir, "content/page.ts")],
  outfile: path.join(distDir, "content/page.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2022"],
  legalComments: "none",
});

await build({
  entryPoints: [path.join(srcDir, "content/bridge.ts")],
  outfile: path.join(distDir, "content/bridge.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2022"],
  legalComments: "none",
});

await build({
  entryPoints: [path.join(srcDir, "popup/popup.ts")],
  outfile: path.join(distDir, "popup/popup.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2022"],
  legalComments: "none",
});

await copyStatic();
console.log("Build complete → dist/");
