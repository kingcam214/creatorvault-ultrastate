import ts from "typescript";
import path from "node:path";

const root = process.cwd();
const files = [
  "drizzle/schema.ts", "drizzle/schema-stripe-payouts.ts", "server/db.ts",
  "server/_core/stripeWebhook.ts", "server/routers/stripeCheckout.ts",
  "server/routers/stripeIntegration.ts", "server/routers/vaultLive.ts", "server/routers/vaultxRouter.ts",
  "server/routers/marketplace.ts", "server/services/stripeConnectAccounts.ts",
  "server/services/commerceFulfillmentRules.ts", "server/services/stripeCommerceFulfillment.ts",
  "server/services/stripeVaultLive.ts", "server/services/stripeCreatorPayouts.ts",
  "server/services/stripeCreatorPayoutEvents.ts", "server/services/stripeVaultxPpvSettlement.ts",
  "server/services/stripeVaultLiveRevenue.ts", "server/services/stripeCreatorPayouts.test.ts",
  "server/services/stripeCreatorPayouts.integration.test.ts", "server/services/stripeCommerceFulfillment.test.ts",
  "vitest.stripe-payouts.config.ts", "vitest.config.ts", "scripts/check-stripe-payout-types.ts",
];
const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
if (!configPath) throw new Error("Project tsconfig.json is missing");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const owned = new Set(files.map((file) => path.resolve(root, file)));
const program = ts.createProgram({
  rootNames: [...owned],
  options: { ...parsed.options, strict: true, noImplicitAny: true, incremental: false, noEmit: true },
});
const diagnostics = ts.getPreEmitDiagnostics(program);
const scoped = diagnostics.filter((diagnostic) => !diagnostic.file || owned.has(path.resolve(diagnostic.file.fileName)));
const external = diagnostics.length - scoped.length;
const host = { getCurrentDirectory: () => root, getCanonicalFileName: (file: string) => file, getNewLine: () => "\n" };
if (scoped.length) console.error(ts.formatDiagnosticsWithColorAndContext(scoped, host));
console.log(`Task 1 strict TypeScript: ${scoped.length} diagnostics across ${files.length} modified/new files (strict=true, noImplicitAny=true).`);
console.log(`Untouched dependency diagnostics: ${external}; this scoped gate does not assert a clean whole-repository type-check.`);
process.exitCode = scoped.length ? 1 : 0;
