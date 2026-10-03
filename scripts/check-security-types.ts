import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const files = [
  "server/_core/trpc.ts",
  "server/_core/context.ts",
  "server/_core/authorizationPolicy.ts",
  "server/_core/authenticationRoutes.ts",
  "server/_core/securityTestSetup.ts",
  "server/_core/authenticationRoutes.security.test.ts",
  "server/_core/authorization.security.test.ts",
  "server/_core/resourceAuthorization.security.test.ts",
  "server/typescriptReleaseGate.test.ts",
  "scripts/securityProcedureInventory.ts",
  "scripts/check-security-types.ts",
  "vitest.security.config.ts",
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
  `Security strict TypeScript: ${scoped.length} diagnostics across ${files.length} security-owned files.`
);
console.log(
  `Dependency diagnostics: ${diagnostics.length - scoped.length}; this targeted gate does NOT replace pnpm check. The deployment workflow must also pass the whole-project compiler.`
);
process.exitCode = scoped.length ? 1 : 0;
