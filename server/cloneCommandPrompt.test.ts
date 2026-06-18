import { describe, expect, it } from "vitest";
import {
  buildKingCamIdentityPrompt,
  buildKingCamNegativePrompt,
} from "./routers/cloneCommandRouter";

describe("Clone Command prompt guardrails", () => {
  it("does not force the old default fade-and-waves hairstyle into paid prompts", () => {
    const finalPrompt = buildKingCamIdentityPrompt(
      "cinematic creator portrait, exact hairstyle from reference media, black hoodie, luxury low-key lighting",
    );

    expect(finalPrompt).toContain("fluxdevCam");
    expect(finalPrompt).toContain("exact hairstyle from reference media");
    expect(finalPrompt).toContain("preserve the exact hairstyle");
    const oldForcedFadePhrase = ["man with natural hair", "fade haircut"].join(" ");
    const oldForcedWavesPhrase = ["thick visible", "waves on top"].join(" ");
    expect(finalPrompt).not.toContain(oldForcedFadePhrase);
    expect(finalPrompt).not.toContain(oldForcedWavesPhrase);
  });

  it("keeps user hairstyle instructions as the source of truth while blocking invented defaults", () => {
    const userPrompt =
      "match the attached image exactly: keep the same hairstyle, same hairline, same length, same texture, and same jewelry";
    const finalPrompt = buildKingCamIdentityPrompt(userPrompt);
    const finalNegativePrompt = buildKingCamNegativePrompt("do not change the reference hair");

    expect(finalPrompt).toContain(userPrompt);
    expect(finalPrompt).toContain("do not invent, replace, clean up, or stylize the hairstyle");
    expect(finalNegativePrompt).toContain("wrong hairstyle");
    expect(finalNegativePrompt).toContain("unrequested thick waves");
    expect(finalNegativePrompt).toContain("do not change the reference hair");
  });
});
