#!/usr/bin/env node
// Post-publish guard: verify the registry manifest of every published workspace
// package has no `workspace:` dependency specs.
//
// `pnpm publish` rewrites `workspace:^` to a real range; `npm publish` does not,
// which shipped @simonmak-ascent/mcp@1.9.4 with an uninstallable manifest
// (`EUNSUPPORTEDPROTOCOL` on `npx`). Run this after publishing so that class of
// regression fails the workflow instead of reaching users.
//
// The registry is eventually consistent: a freshly published version can 404 for
// a minute or two, so the lookup retries before reporting a failure.
//
// Usage: node scripts/verify-publish.mjs [--registry https://registry.npmjs.org]
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packagesDir = join(root, "packages");
const registryArg = process.argv.indexOf("--registry");
const registry = registryArg > -1 ? process.argv[registryArg + 1] : undefined;

const ATTEMPTS = Number(process.env.VERIFY_PUBLISH_ATTEMPTS ?? 18);
const DELAY_MS = Number(process.env.VERIFY_PUBLISH_DELAY_MS ?? 10_000);

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

function viewDeps(ref) {
  const args = ["view", ref, "dependencies", "--json"];
  if (registry) args.push("--registry", registry);
  return execFileSync("npm", args, { encoding: "utf8", stdio: "pipe" }).trim();
}

async function fetchDeps(ref) {
  let lastError;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const raw = viewDeps(ref);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      lastError = error;
      if (attempt < ATTEMPTS) await sleep(DELAY_MS);
    }
  }
  throw lastError;
}

const dirs = readdirSync(packagesDir).filter((dir) =>
  statSync(join(packagesDir, dir)).isDirectory(),
);

let failures = 0;

for (const dir of dirs) {
  const manifestPath = join(packagesDir, dir, "package.json");
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    continue;
  }
  if (!manifest.name || manifest.private) continue;

  const ref = `${manifest.name}@${manifest.version}`;

  let deps;
  try {
    deps = await fetchDeps(ref);
  } catch (error) {
    failures++;
    console.error(
      `::error::could not read ${ref} from the registry after ${ATTEMPTS} attempts`,
    );
    console.error(String(error?.stderr ?? error?.message ?? error));
    continue;
  }

  const broken = Object.entries(deps).filter(([, spec]) =>
    String(spec).startsWith("workspace:"),
  );

  if (broken.length > 0) {
    failures++;
    console.error(
      `::error::${ref} is published with workspace: specs: ${JSON.stringify(broken)}`,
    );
  } else {
    console.log(`ok ${ref}`);
  }
}

if (failures > 0) {
  console.error(
    `verify-publish: ${failures} package(s) failed verification — publish with pnpm, not npm`,
  );
  process.exit(1);
}

console.log("verify-publish: OK — no workspace: specs in published manifests");
