import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const files = [
  "scripts/securityReleasePolicy.ts",
  "scripts/securityReleaseRunner.ts",
  "scripts/securityReleaseVerification.ts",
  "scripts/securityReleaseEntrypoint.ts",
  "scripts/prepareSecurityReleaseArtifact.ts",
  "scripts/securityRelease.test.ts",
  "scripts/securityReleaseIntegrity.ts",
  "scripts/securityReleaseIntegrity.test.ts",
  "scripts/githubWorkflowPermissionPreflight.ts",
  "scripts/githubWorkflowPermissionPreflight.test.ts",
  "vitest.github-workflow-preflight.config.ts",
  "scripts/check-security-release-types.ts",
  "vitest.security-release.config.ts",
];
const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
if (!configPath) throw new Error("Project tsconfig.json is missing");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error)
  throw new Error(
    ts.flattenDiagnosticMessageText(config.error.messageText, "\n")
  );
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const program = ts.createProgram({
  rootNames: files.map(file => path.resolve(root, file)),
  options: {
    ...parsed.options,
    strict: true,
    noImplicitAny: true,
    incremental: false,
    noEmit: true,
  },
});
const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
const violations: string[] = [];
for (const file of files) {
  const source = program.getSourceFile(path.resolve(root, file));
  if (!source) {
    violations.push(`${file}: required release source file is missing`);
    continue;
  }
  function visit(node: ts.Node): void {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      const position = source?.getLineAndCharacterOfPosition(node.getStart());
      violations.push(
        `${file}:${(position?.line ?? 0) + 1}: explicit unsafe top type is prohibited`
      );
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (/@ts-(?:ignore|nocheck|expect-error)\b/.test(source.text)) {
    violations.push(`${file}: TypeScript diagnostic suppression is prohibited`);
  }
}
const host: ts.FormatDiagnosticsHost = {
  getCurrentDirectory: () => root,
  getCanonicalFileName: file => file,
  getNewLine: () => "\n",
};
if (diagnostics.length)
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, host));
for (const violation of violations) console.error(violation);
console.log(
  `Security release strict TypeScript: ${diagnostics.length} diagnostics, ${violations.length} unsafe-type/suppression violations across ${files.length} required files.`
);
console.log(
  "No diagnostics are filtered; this focused gate does not replace the mandatory whole-project compiler gate."
);
process.exitCode = diagnostics.length || violations.length ? 1 : 0;
