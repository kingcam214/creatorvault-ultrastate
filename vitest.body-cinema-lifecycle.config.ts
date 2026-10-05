import { lstatSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { defineConfig } from "vitest/config";
import base from "./vitest.config";

const databaseUrl = process.env.CREATORVAULT_BODY_CINEMA_TEST_DATABASE_URL;
if (!databaseUrl) throw new Error("BODY_CINEMA_NATIVE_FIXTURE_REQUIRED");
try {
  const parsed = new URL(databaseUrl);
  const socketPath = parsed.searchParams.get("socketPath");
  if (
    parsed.protocol !== "mysql:" ||
    parsed.username !== "cv_phase_a" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) ||
    parsed.pathname !== "/creatorvault_body_cinema_test" ||
    !socketPath
  )
    throw new Error("BODY_CINEMA_NATIVE_FIXTURE_REQUIRED");
  const fixture = path.dirname(socketPath);
  const directory = lstatSync(fixture);
  const endpoint = lstatSync(socketPath);
  if (
    path.dirname(fixture) !== path.resolve(tmpdir()) ||
    !/^creatorvault-cv-video-026-phase-a-[A-Za-z0-9_-]+$/.test(
      path.basename(fixture)
    ) ||
    realpathSync(fixture) !== fixture ||
    !directory.isDirectory() ||
    directory.isSymbolicLink() ||
    (directory.mode & 0o077) !== 0 ||
    directory.uid !== process.getuid?.() ||
    !endpoint.isSocket() ||
    endpoint.uid !== directory.uid
  )
    throw new Error("BODY_CINEMA_NATIVE_FIXTURE_REQUIRED");
} catch {
  throw new Error("BODY_CINEMA_NATIVE_FIXTURE_REQUIRED");
}

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    include: [
      "server/services/bodyCinemaBodyDirection.test.ts",
      "client/src/components/body-cinema/BodyDirectedDirector.test.tsx",
      "server/services/bodyCinemaCandidateLifecycle.test.ts",
      "server/services/bodyCinemaLifecycleBoundaries.test.ts",
      "server/services/bodyCinemaVerifiedSourceAttestationService.test.ts",
      "scripts/bodyCinemaPhaseAMigration.test.ts",
      "client/src/pages/BodyCinemaLifecycle.test.tsx",
    ],
    env: { ...base.test?.env, DATABASE_URL: databaseUrl, NODE_ENV: "test" },
  },
});
