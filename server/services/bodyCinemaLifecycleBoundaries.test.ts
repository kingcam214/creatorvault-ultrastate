import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = (name: string) =>
  readFileSync(fileURLToPath(new URL(name, import.meta.url)), "utf8");

describe("Body Cinema Phase A connected boundaries", () => {
  it("blocks legacy generic link mutations and legacy assembly acceptance for lifecycle projects", () => {
    const service = source("./creationProjectService.ts");
    expect(service).toContain("body_cinema_candidate_lifecycles");
    expect(service).toContain("NOT EXISTS");
    expect(
      service.includes(
        "assertCreationProjectOutsideCandidateLifecycle(input.projectId)"
      )
    ).toBe(true);
    expect(
      service.includes(
        "candidate lifecycle. Generic links and assembly acceptance cannot replace"
      )
    ).toBe(true);
  });

  it("keeps private candidates out of generic source lists and ordinary trailer draft creation", () => {
    const router = source("../routers/mediaAssets.ts");
    expect(router).toMatch(
      /created_by_feature[^\n]*(?:!=|<>)[^\n]*body_cinema_candidate/
    );
    expect(router).toContain(
      "Body Cinema candidates require the accepted-master planning handoff."
    );
  });

  it("mounts real authenticated playback rather than a public candidate upload URL", () => {
    const entry = source("../_core/index.ts");
    const playback = source("../routers/bodyCinemaCandidatePlayback.ts");
    expect(entry).toContain("registerBodyCinemaCandidatePlayback(app)");
    expect(playback).toContain("authenticateRequest");
    expect(playback).toContain("openPlayback");
    expect(playback).toContain("no-store");
    expect(playback).toContain("Content-Range");
  });

  it("reads the accepted planning handoff inside existing Trailer Maker without rendering or publishing", () => {
    const page = source("../../client/src/pages/TrailerStudio.tsx");
    expect(page).toContain("bodyCinemaHandoffId");
    expect(page).toContain("trpc.bodyCinema.lifecycle.getHandoff.useQuery");
    expect(page).toContain("savedHandoff.candidateHash");
    expect(page).toContain("savedHandoff.decisionId");
    expect(page).toContain("savedHandoff.teaserPlanSeconds");
    expect(page).toContain("savedHandoff.reelPlanSeconds");
    expect(page).toContain("No rendered trailer to download");
    const planning = page.slice(
      page.indexOf("function BodyCinemaAcceptedMasterPlanning"),
      page.indexOf("function ExistingTrailerStudio")
    );
    expect(planning).not.toMatch(
      /\.useMutation\(|ffmpeg|generate_video|stripe\./i
    );
  });
  it("never provisions production login fixtures in the Phase A worker and keeps future pilot authorization server-only", () => {
    const runner = source("../../scripts/consolidatedReleaseRunner.ts");
    const workerStart = runner.indexOf("async function runProductionRelease(");
    expect(workerStart).toBeGreaterThan(0);
    const worker = runner.slice(
      workerStart,
      runner.indexOf("async function systemdActive", workerStart)
    );
    expect(worker).not.toContain("provisionLoginVerifier(");
    expect(worker).not.toContain("persistFixtureOwnership(");
    expect(worker).not.toContain("cleanupOwnedFixture(");
    expect(worker).not.toMatch(/if\s*\(\s*!proof/);
    expect(worker).toMatch(/if\s*\(\s*!processBefore\s*\)/);
    expect(worker).toMatch(/verifyLive\(\s*inputs\.sha,\s*undefined,/);
    expect(runner).toContain(
      "NO_PRODUCTION_TEST_ACCOUNTS_OR_AUTHENTICATED_WRITES"
    );
    expect(
      source("../routers/bodyCinemaCandidateLifecycleRouter.ts")
    ).not.toContain("authorizeFutureAttachment");
  });
});
