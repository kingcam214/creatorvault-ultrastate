// This is the generated production entry wrapper, not an application feature.
// The real approved server module keeps the same directory and is imported only
// after durable release state proves verified completion or a live supervisor.
async function boot(): Promise<void> {
  try {
    const runtime: unknown = await import(
      new URL("./security-release-runtime.mjs", import.meta.url).href
    );
    if (
      typeof runtime !== "object" ||
      runtime === null ||
      !("assertAppBootAuthorized" in runtime)
    )
      throw new Error("SECURITY_BOOT_GATE_UNAVAILABLE");
    const candidate: unknown = runtime.assertAppBootAuthorized;
    if (typeof candidate !== "function")
      throw new Error("SECURITY_BOOT_GATE_UNAVAILABLE");
    const guard = candidate as () => Promise<void>;
    await guard();
    if (
      !("activateAuthoritativeSigningSource" in runtime) ||
      typeof runtime.activateAuthoritativeSigningSource !== "function"
    )
      throw new Error("SECURITY_SIGNING_SOURCE_UNAVAILABLE");
    const activate =
      runtime.activateAuthoritativeSigningSource as () => Promise<void>;
    await activate();
    await import(new URL("./secure-app.js", import.meta.url).href);
  } catch {
    // Neither runtime errors nor configuration values are printed.
    console.error("CREATORVAULT_SECURITY_BOOT_GATE_FAILED");
    process.exitCode = 1;
  }
}
void boot();
