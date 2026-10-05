import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const files = [
  "client/src/App.tsx",
  "client/src/components/AppHeader.tsx",
  "client/src/components/ui/button.tsx",
  "client/src/pages/Home.tsx",
  "client/src/pages/Login.tsx",
  "client/src/pages/CreatorHome.tsx",
  "client/src/pages/VisualDna.test.ts",
  "client/src/components/CreatorSourceVideoIntake.tsx",
  "client/src/components/MediaPicker.tsx",
  "client/src/components/TrailerDirectionPreview.tsx",
  "client/src/pages/CreatorVideoStudio.tsx",
  "client/src/pages/CreatorVideoStudioSourceIntake.test.tsx",
  "client/src/pages/CreatorWorkspace.tsx",
  "client/src/pages/CreatorWorkspace.test.tsx",
  "client/src/pages/TrailerDirectionPreview.test.tsx",
  "client/src/pages/VideoStudioTimelinePage.tsx",
  "client/src/components/video-studio/types.ts",
  "client/src/components/video-studio/audioBeatDetector.ts",
  "client/src/components/video-studio/BrandOverlayTrack.tsx",
  "client/src/components/video-studio/VideoStudioTimeline.tsx",
  "client/src/components/video-studio/__tests__/VideoStudioTimeline.test.tsx",
  "vitest.video-studio.config.ts",
  "scripts/check-video-studio-types.ts",
  "scripts/cvVideo026LocalProofServer.ts",
  "scripts/runCvVideo026LocalProof.ts",
  "scripts/runVisualDnaLocalProof.ts",
  "server/routers/creatorWorkspace.ts",
  "server/routers/mediaAssets.ts",
  "server/services/localTrailerCut.ts",
  "server/services/localTrailerCut.test.ts",
  "shared/bodyCinemaCandidateLifecycle.ts",
  "server/services/bodyCinemaCandidateLifecycle.ts",
  "server/routers/bodyCinemaCandidateLifecycleRouter.ts",
  "server/services/creationProjectService.ts",
  "server/routers/bodyCinemaRouter.ts",
  "client/src/pages/VaultXDrop.tsx",
  "client/src/pages/TrailerStudio.tsx",
  "client/src/pages/BodyCinemaLifecycle.test.tsx",
  "server/services/bodyCinemaCandidateLifecycle.test.ts",
  "vitest.body-cinema-lifecycle.config.ts",
];
const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
if (!configPath) throw new Error("Project tsconfig.json is missing");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error)
  throw new Error(
    ts.flattenDiagnosticMessageText(config.error.messageText, "\n")
  );
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const owned = new Set(files.map(file => path.resolve(root, file)));
const program = ts.createProgram({
  rootNames: [...owned],
  options: {
    ...parsed.options,
    strict: true,
    noImplicitAny: true,
    incremental: false,
    noEmit: true,
  },
});
const diagnostics = ts.getPreEmitDiagnostics(program);
const scoped = diagnostics.filter(
  diagnostic =>
    !diagnostic.file || owned.has(path.resolve(diagnostic.file.fileName))
);
const host = {
  getCurrentDirectory: () => root,
  getCanonicalFileName: (file: string) => file,
  getNewLine: () => "\n",
};
if (scoped.length)
  console.error(ts.formatDiagnosticsWithColorAndContext(scoped, host));
console.log(
  `Task 3 strict TypeScript: ${scoped.length} diagnostics across ${files.length} modified/new files (strict=true, noImplicitAny=true).`
);
console.log(
  `Untouched dependency diagnostics: ${diagnostics.length - scoped.length}; this gate does not assert a clean whole-repository compiler run.`
);
process.exitCode = scoped.length ? 1 : 0;
