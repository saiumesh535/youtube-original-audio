import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(projectRoot, "dist");
const releaseDir = path.join(projectRoot, "release");

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const manifestText = await readFile(path.join(projectRoot, "src/manifest.json"), "utf8");
const manifest = JSON.parse(manifestText);
const version = typeof manifest.version === "string" ? manifest.version : "0.0.0";
const zipName = `youtube-original-audio-${version}.zip`;

run("node", [path.join(projectRoot, "scripts/build.mjs")], projectRoot);

await rm(releaseDir, { recursive: true, force: true });
await mkdir(releaseDir, { recursive: true });
run("zip", ["-r", path.join(releaseDir, zipName), "."], distDir);

console.log(`Packed ${zipName}`);
