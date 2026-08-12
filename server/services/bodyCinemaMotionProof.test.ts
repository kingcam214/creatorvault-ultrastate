import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const routePath = resolve(projectRoot, "client/src/pages/VaultXDrop.tsx");

const requiredAssets = [
  "final-drop.mp4",
  "hero-transformation.mp4",
  "preview-arch.mp4",
  "preview-curves-360.mp4",
  "preview-mirror.mp4",
  "preview-silhouette.mp4",
] as const;

function assetPath(name: string) {
  return resolve(projectRoot, "client/public/assets", name);
}

function fingerprint(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("Body Cinema motion proof package", () => {
  it("ships every required real motion asset as a non-empty distinct file", () => {
    const hashes = new Set<string>();

    for (const asset of requiredAssets) {
      const path = assetPath(asset);
      expect(existsSync(path), `${asset} must exist`).toBe(true);
      expect(statSync(path).size, `${asset} must contain real video bytes`).toBeGreaterThan(100_000);
      hashes.add(fingerprint(path));
    }

    expect(hashes.size, "no two claimed Body Cinema motion assets may be byte-for-byte duplicates").toBe(requiredAssets.length);
  });

  it("maps the four named treatments to explicit looping preview files", () => {
    const route = readFileSync(routePath, "utf8");
    const treatmentAssets = requiredAssets.filter((name) => name.startsWith("preview-"));

    expect(treatmentAssets).toHaveLength(4);
    expect(route).toContain("const TREATMENT_PREVIEW");
    expect(route).toContain("autoPlay loop muted playsInline");

    for (const asset of treatmentAssets) {
      expect(route, `${asset} must be explicitly mapped by the served Body Cinema route`).toContain(`/assets/${asset}`);
    }
  });

  it("labels demonstration media honestly instead of treating it as a creator-specific completed outcome", () => {
    const route = readFileSync(routePath, "utf8");

    expect(route).toContain("Demo Drop Preview");
    expect(route).toContain("This is one example of the energy a finished drop can carry.");
    expect(route).not.toContain("Finding highest-converting hook");
  });
});
