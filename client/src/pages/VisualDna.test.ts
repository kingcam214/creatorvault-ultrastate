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

  it("uses the owner's exact numeric typography scale rather than a framework substitute", () => {
    const declarations = (name: string) => {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const blocks = [
        ...css.matchAll(new RegExp(`\\.${escaped}\\s*\\{([^}]+)\\}`, "g")),
      ];
      expect(blocks.length, name).toBeGreaterThan(0);
      return Object.fromEntries(
        blocks
          .flatMap(block => [...block[1].matchAll(/([a-z-]+):\s*([^;]+);/g)])
          .map(match => [match[1], match[2].trim()])
      );
    };
    for (const [name, size, height] of [
      ["display-xl", "clamp(64px, 14vw, 120px)", "0.9"],
      ["display-lg", "clamp(48px, 10vw, 88px)", "0.95"],
      ["display-md", "clamp(36px, 8vw, 64px)", "1"],
      ["heading-xl", "clamp(28px, 6vw, 48px)", "1"],
      ["heading-lg", "36px", "1"],
      ["heading-md", "28px", "1"],
      ["heading-sm", "22px", "1.1"],
      ["heading-xs", "18px", "1.1"],
      ["body-xl", "18px", "1.6"],
      ["body-lg", "16px", "1.6"],
      ["body-md", "15px", "1.5"],
      ["body-sm", "13px", "1.5"],
      ["body-xs", "12px", "1.4"],
    ]) {
      expect(declarations(name)).toMatchObject({
        "font-size": size,
        "line-height": height,
      });
    }
    for (const [name, size, weight] of [
      ["data-xl", "24px", "700"],
      ["data-lg", "18px", "700"],
      ["data-md", "14px", "400"],
      ["data-sm", "12px", "400"],
    ]) {
      expect(declarations(name)).toMatchObject({
        "font-size": size,
        "font-weight": weight,
      });
    }
    expect(declarations("cta-text")).toMatchObject({
      "font-size": "16px",
      "letter-spacing": "0.1em",
    });
    expect(declarations("display-xl")).toMatchObject({
      "letter-spacing": "0.02em",
    });
    expect(declarations("data-xs")).toMatchObject({
      "font-size": "10px",
      "letter-spacing": "0.15em",
    });
    expect(declarations("badge-text")).toMatchObject({
      "font-size": "9px",
      "letter-spacing": "0.15em",
    });
    expect(css).toMatch(
      /\.eyebrow,\s*\.cv-eyebrow\s*\{\s*font-size: 10px;[\s\S]*?letter-spacing: 0\.2em;/
    );
    expect(css).not.toMatch(/\.cv-dna p\s*\{/);
    expect(css).toContain(':not([class*="body-"])');
    expect(css).toContain(':not([class*="display-"])');
    expect(css).toContain(':not([class*="heading-"])');
    expect(css).toContain(":not(.cta-text)");
    expect(css).toContain(
      ".cv-dna :where(nav a, button:not(.cv-ghost), a.cv-cta, a.cv-cta-outline)"
    );
    expect(css).not.toContain(
      ".cv-dna :is(nav a, button:not(.cv-ghost), a.cv-cta, a.cv-cta-outline)"
    );
    expect(css).toContain("animation: pulseCyan 2.5s ease infinite");
    expect(css).toContain("animation: pulseGold 2.5s ease infinite");
    expect(css).toContain("animation: float 3s ease-in-out infinite");
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
