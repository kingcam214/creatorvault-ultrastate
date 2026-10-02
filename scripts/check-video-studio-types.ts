import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const files = [
  "client/src/App.tsx",
  "client/src/pages/VideoStudioTimelinePage.tsx",
  "client/src/components/video-studio/types.ts",
  "client/src/components/video-studio/audioBeatDetector.ts",
  "client/src/components/video-studio/BrandOverlayTrack.tsx",
  "client/src/components/video-studio/VideoStudioTimeline.tsx",
  "client/src/components/video-studio/__tests__/VideoStudioTimeline.test.tsx",
  "vitest.video-studio.config.ts",
  "scripts/check-video-studio-types.ts",
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
