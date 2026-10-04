import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = (relative: string) =>
  readFileSync(
    fileURLToPath(new URL(`../../${relative}`, import.meta.url)),
    "utf8"
  );
const css = source("src/index.css");
const documentHead = readFileSync(
  fileURLToPath(new URL("../../index.html", import.meta.url)),
  "utf8"
);

describe("immutable CreatorVault visual DNA", () => {
  it("maps exact semantic color and surface tokens", () => {
    for (const [token, value] of Object.entries({
      "bg-void": "#0A0A0A",
      "bg-surface": "#1A1A1A",
      "bg-elevated": "#2A2A2A",
      "accent-cyan": "#00D9FF",
      "accent-gold": "#C9A84C",
      success: "#00FF94",
      danger: "#FF3B3B",
      warning: "#FFB800",
      live: "#FF3B3B",
    })) {
      const declarations = [
        ...css.matchAll(new RegExp(`--${token}:\\s*([^;]+);`, "g")),
      ];
      expect(declarations.at(-1)?.[1].trim().toUpperCase()).toBe(
        value.toUpperCase()
      );
    }
    for (const token of [
      "bg-glass-dark",
      "accent-cyan-glow",
      "accent-gold-glow",
      "text-disabled",
      "border-medium",
      "gradient-hero",
      "gradient-card",
      "gradient-cyan",
      "gradient-gold",
    ]) {
      expect(css).toContain(`--${token}:`);
    }
  });

  it("loads only the three specified families with preconnect and swap", () => {
    expect(documentHead).toContain('rel="preconnect"');
    expect(documentHead).toContain("/fonts/visual-dna-fonts.css");
    const fonts = source("public/fonts/visual-dna-fonts.css");
    for (const family of ["Bebas Neue", "DM Sans", "Space Mono"]) {
      expect(fonts).toContain(`font-family: '${family}'`);
    }
    for (const weight of [300, 400, 500, 600, 700]) {
      expect(fonts).toContain(`font-weight: ${weight}`);
    }
    expect(fonts).toContain("font-display: swap");
    expect(fonts).not.toContain("url(https://");
    expect(documentHead).not.toContain("family=Playfair");
    expect(css).not.toContain("@import url(");
  });

  it("retains every required animation and accessible reduced motion", () => {
    for (const name of [
      "fadeUp",
      "fadeIn",
      "scaleIn",
      "pulseCyan",
      "pulseGold",
      "scanDown",
      "dataFlicker",
      "float",
      "emberFloat",
      "shimmer",
      "spin",
      "expandWidth",
    ])
      expect(css).toContain(`@keyframes ${name}`);
    for (const name of [
      "animate-fade-up",
      "animate-fade-in",
      "animate-scale-in",
      "live-stat",
      "cta-pulse-cyan",
      "cta-pulse-gold",
      "float",
    ])
      expect(css).toContain(`.${name}`);
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain(":focus-visible");
  });

  it("provides real reusable state and control primitives", () => {
    for (const name of [
      "cv-cta",
      "cv-cta-outline",
      "cv-cta-gold",
      "cv-ghost",
      "cv-danger",
      "cv-panel",
      "cv-panel-elevated",
      "cv-panel-cyan",
      "cv-panel-gold",
      "cv-panel-glass",
      "cv-badge",
      "cv-input",
      "cv-select",
      "cv-state",
      "cv-state-error",
      "cv-state-success",
      "cv-shimmer",
    ])
      expect(css).toContain(`.${name}`);
    expect(css).toMatch(/min-height:\s*52px/);
    expect(css).toMatch(/border-radius:\s*2px/);
    expect(css).toMatch(/border-radius:\s*8px/);
  });
});
