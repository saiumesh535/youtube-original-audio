import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(command, args, capture) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (result.status !== 0) {
    if (capture && result.stderr) {
      process.stderr.write(result.stderr);
    }
    process.exit(result.status ?? 1);
  }
  return (result.stdout ?? "").trim();
}

function succeeded(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return result.status === 0;
}

const manifestText = await readFile(path.join(projectRoot, "src/manifest.json"), "utf8");
const manifest = JSON.parse(manifestText);
if (typeof manifest.version !== "string" || manifest.version.length === 0) {
  console.error("src/manifest.json is missing a version string.");
  process.exit(1);
}

const version = manifest.version;
const tag = `v${version}`;
const zipPath = path.join(projectRoot, "release", `youtube-original-audio-${version}.zip`);

if (run("git", ["status", "--porcelain"], true).length > 0) {
  console.error("Working tree is dirty. Commit your changes first.");
  process.exit(1);
}

if (!succeeded("gh", ["auth", "status"])) {
  console.error("GitHub CLI is not logged in. Run gh auth login.");
  process.exit(1);
}

run("node", [path.join(projectRoot, "scripts/pack.mjs")]);

if (!succeeded("git", ["rev-parse", tag])) {
  run("git", ["tag", tag]);
  console.log(`Created tag ${tag}`);
}

run("git", ["push", "origin", "HEAD"]);
run("git", ["push", "origin", tag]);

if (succeeded("gh", ["release", "view", tag])) {
  run("gh", ["release", "upload", tag, zipPath, "--clobber"]);
  console.log(`Updated GitHub Release ${tag}`);
} else {
  run("gh", [
    "release",
    "create",
    tag,
    zipPath,
    "--title",
    `YouTube Original Audio ${version}`,
    "--generate-notes",
  ]);
  console.log(`Created GitHub Release ${tag}`);
}
