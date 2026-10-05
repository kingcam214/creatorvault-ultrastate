import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const files = [
  "scripts/securityReleasePolicy.ts",
  "scripts/securityReleaseVerification.ts",
  "scripts/consolidatedReleasePolicy.ts",
  "scripts/consolidatedMigrations.ts",
  "scripts/consolidatedReleaseRunner.ts",
  "scripts/consolidatedReleaseEntrypoint.ts",
  "scripts/prepareConsolidatedReleaseArtifact.ts",
  "scripts/consolidatedRelease.test.ts",
  "scripts/consolidatedMigrations.test.ts",
  "scripts/portableMariaDbTools.ts",
  "scripts/portableMariaDbTools.test.ts",
  "scripts/bodyCinemaPhaseAMigration.ts",
  "scripts/bodyCinemaPhaseAMigration.test.ts",
  "vitest.body-cinema-lifecycle.config.ts",
  "vitest.consolidated-release.config.ts",
  "scripts/check-consolidated-release-types.ts",
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
    violations.push(`${file}: required consolidated release source is missing`);
    continue;
  }
  const checkedSource = source;
  function visit(node: ts.Node): void {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      const position = checkedSource.getLineAndCharacterOfPosition(
        node.getStart()
      );
      violations.push(
        `${file}:${position.line + 1}: explicit unsafe top type is prohibited`
      );
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (/@ts-(?:ignore|nocheck|expect-error)\b/.test(checkedSource.text))
    violations.push(`${file}: TypeScript diagnostic suppression is prohibited`);
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
  `Consolidated release strict TypeScript: ${diagnostics.length} diagnostics, ${violations.length} unsafe-type/suppression violations across ${files.length} required files.`
);
process.exitCode = diagnostics.length || violations.length ? 1 : 0;
