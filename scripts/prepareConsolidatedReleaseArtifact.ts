import { promises as fs } from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import { requireRelease } from "./securityReleasePolicy";

/**
 * Converts a completed build into a boot-gated artifact.  This is deliberately
 * callable only: the approved deployment controller chooses when to build it.
 */
export async function prepareConsolidatedReleaseArtifact(
  root: string
): Promise<void> {
  const dist = path.join(root, "dist");
  const entry = path.join(dist, "index.js");
  const source = await fs.lstat(entry);
  requireRelease(
    source.isFile() &&
      !source.isSymbolicLink() &&
      source.nlink === 1 &&
      source.size > 0,
    "CONSOLIDATED_APP_ARTIFACT_MISSING"
  );
  const server = await fs.readFile(entry, "utf8");
  requireRelease(
    !server.includes("local_kingcam_6") &&
      server.includes('"/api/dev-login"') &&
      server.includes("res.status(404)"),
    "CONSOLIDATED_BUILT_AUTH_PROTECTION_MISSING"
  );

  const protectedApp = path.join(dist, "secure-app.js");
  const prior = await fs.lstat(protectedApp).catch(() => undefined);
  requireRelease(
    !prior || (prior.isFile() && !prior.isSymbolicLink() && prior.nlink === 1),
    "CONSOLIDATED_UNSAFE_BUILD_TARGET"
  );

  await build({
    entryPoints: [path.join(root, "scripts/consolidatedReleaseRunner.ts")],
    outfile: path.join(dist, "consolidated-release-runtime.mjs"),
    platform: "node",
    format: "esm",
    bundle: true,
    packages: "external",
    logLevel: "silent",
  });
  await fs.rename(entry, protectedApp);
  await build({
    entryPoints: [path.join(root, "scripts/consolidatedReleaseEntrypoint.ts")],
    outfile: entry,
    platform: "node",
    format: "esm",
    bundle: true,
    packages: "external",
    logLevel: "silent",
  });
}
