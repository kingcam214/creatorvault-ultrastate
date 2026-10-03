import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { requireRelease, ReleaseFailure } from "./securityReleasePolicy";

export async function prepareSecurityReleaseArtifact(
  root: string
): Promise<void> {
  const directory = path.join(root, "dist");
  const original = path.join(directory, "index.js");
  const meta = await fs.lstat(original);
  requireRelease(
    meta.isFile() && !meta.isSymbolicLink() && meta.size > 0,
    "APP_ARTIFACT_MISSING"
  );
  const server = await fs.readFile(original, "utf8");
  requireRelease(
    !server.includes("local_kingcam_6") &&
      server.includes('"/api/dev-login"') &&
      server.includes("res.status(404)"),
    "BUILT_AUTH_PROTECTION_MISSING"
  );
  const target = path.join(directory, "secure-app.js");
  const old = await fs.lstat(target).catch(() => undefined);
  requireRelease(
    !old || (old.isFile() && !old.isSymbolicLink()),
    "UNSAFE_BUILD_TARGET"
  );
  await build({
    entryPoints: [path.join(root, "scripts/securityReleaseRunner.ts")],
    outfile: path.join(directory, "security-release-runtime.mjs"),
    platform: "node",
    format: "esm",
    bundle: true,
    packages: "external",
    logLevel: "silent",
  });
  await fs.rename(original, target);
  await build({
    entryPoints: [path.join(root, "scripts/securityReleaseEntrypoint.ts")],
    outfile: original,
    platform: "node",
    format: "esm",
    bundle: true,
    packages: "external",
    logLevel: "silent",
  });
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  void prepareSecurityReleaseArtifact(process.cwd())
    .then(() => console.log("GUARDED_ARTIFACT=PASS"))
    .catch((error: unknown) => {
      console.error(
        error instanceof ReleaseFailure
          ? error.code
          : "GUARDED_ARTIFACT_BUILD_FAILED"
      );
      process.exitCode = 1;
    });
}
