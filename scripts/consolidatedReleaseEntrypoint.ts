// Generated production entry wrapper. It imports application code only after the
// durable consolidated-release boot authorization and authoritative signing check.
async function boot(): Promise<void> {
  try {
    const runtime: unknown = await import(
      new URL("./consolidated-release-runtime.mjs", import.meta.url).href
    );
    if (
      typeof runtime !== "object" ||
      runtime === null ||
      !("assertConsolidatedAppBootAuthorized" in runtime) ||
      !("activateConsolidatedSigningSource" in runtime)
    )
      throw new Error("CONSOLIDATED_BOOT_GATE_UNAVAILABLE");
    const guard = runtime.assertConsolidatedAppBootAuthorized;
    const activate = runtime.activateConsolidatedSigningSource;
    if (typeof guard !== "function" || typeof activate !== "function")
      throw new Error("CONSOLIDATED_BOOT_GATE_UNAVAILABLE");
    await guard();
    await activate();
    await import(new URL("./secure-app.js", import.meta.url).href);
  } catch {
    // Never expose root configuration, JWT material, database details, or logs.
    console.error("CREATORVAULT_CONSOLIDATED_BOOT_GATE_FAILED");
    process.exitCode = 1;
  }
}

void boot();
