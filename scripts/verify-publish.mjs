#!/usr/bin/env node
// Post-publish guard: verify the registry manifest of every published workspace
// package has no `workspace:` dependency specs.
//
// `pnpm publish` rewrites `workspace:^` to a real range; `npm publish` does not,
// which shipped @simonmak-ascent/mcp@1.9.4 with an uninstallable manifest
// (`EUNSUPPORTEDPROTOCOL` on `npx`). Run this after publishing so that class of
// regression fails the workflow instead of reaching users.
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
  const args = ["view", ref, "dependencies", "--json"];
  if (registry) args.push("--registry", registry);

  let raw;
  try {
    raw = execFileSync("npm", args, { encoding: "utf8" }).trim();
  } catch (error) {
    console.error(`::error::could not read ${ref} from the registry`);
    console.error(String(error.stderr ?? error.message));
    failures++;
    continue;
  }

  const deps = raw ? JSON.parse(raw) : {};
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
    `verify-publish: ${failures} package(s) have uninstallable manifests — publish with pnpm, not npm`,
  );
  process.exit(1);
}

console.log("verify-publish: OK — no workspace: specs in published manifests");
