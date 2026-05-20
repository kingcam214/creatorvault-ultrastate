export type CreatorVaultBuyerSegment = "studio" | "platform" | "distributor" | "indie_creator" | "solo_operator" | "creator_group";

export interface CreatorVaultProductPackageInput {
  segment: CreatorVaultBuyerSegment | string;
  label: string;
  packageName: string;
  priceCents: number;
  includes?: string[];
  upsells?: string[];
  telegramTrackingSegment?: string;
}

export interface CreatorVaultDeliveryContract {
  contract: "CreatorVaultDeliveryContract";
  productKey: string;
  buyerSegment: string;
  packageName: string;
  priceCents: number;
  saleClaim: string;
  requiredBuyerInputs: string[];
  creatorVaultInjectedAssets: string[];
  visualAndVideoOutputRules: string[];
  embeddedProofMechanics: string[];
  conversionMechanics: string[];
  deliveredFiles: string[];
  operatorCompletionGates: string[];
  telegramMiniAppRoute: string;
  starPaymentPayloadPrefix: string;
  fulfillmentSla: string;
  refundOrHoldGate: string;
}

export interface CreatorVaultDeliverySystemContract {
  contract: "CreatorVaultDeliverySystemContract";
  status: "sellable_when_fulfillment_inputs_present";
  positioningLaw: string[];
  packageCount: number;
  packages: CreatorVaultDeliveryContract[];
  globalFulfillmentGates: string[];
  outputInjectionChecklist: string[];
}

const SEGMENT_SALE_CLAIMS: Record<string, string> = {
  studio: "CreatorVault turns a production team's raw footage, proof points, and launch objective into a studio-grade trailer command package with branded conversion routing, render-proof lineage, and Telegram attribution.",
  platform: "CreatorVault turns platform creator supply into repeatable paid launch packages with intake, trailer proof, onboarding funnels, and buyer attribution per creator cohort.",
  distributor: "CreatorVault turns a release, roster, or channel campaign into a measurable distribution trailer package with partner-safe CTAs, channel cutdowns, and conversion event mapping.",
  indie_creator: "CreatorVault turns an underpackaged independent creator into a premium-looking paid offer with a proof-led trailer, branded flyer/promo assets, Telegram intake, and clear checkout action.",
  solo_operator: "CreatorVault turns a one-person operator into a video-first acquisition system with compressed offer proof, CTA routing, and follow-up automation.",
  creator_group: "CreatorVault turns a small group or collective into a premium media property with member proof beats, shared launch visuals, role clarity, and tracked group monetization.",
};

const INPUTS_BY_SEGMENT: Record<string, string[]> = {
  studio: ["owned trailer footage or approved stills", "release objective", "target buyer/viewer persona", "existing proof points", "required credits or legal disclaimers"],
  platform: ["creator roster or cohort", "platform offer", "onboarding target", "brand rules", "destination URL or Mini App route"],
  distributor: ["release title", "channel destinations", "partner restrictions", "approved source media", "campaign tracking target"],
  indie_creator: ["creator handle", "best owned media", "offer or service", "audience promise", "preferred CTA"],
  solo_operator: ["operator identity", "offer stack", "proof receipts", "source clips or stills", "Telegram or checkout destination"],
  creator_group: ["group name", "member roles", "shared proof assets", "launch objective", "revenue split or payout route"],
};

function safeSegment(value: string): string {
  return value && value.trim().length > 0 ? value.trim() : "indie_creator";
}

function routeSegment(segment: string): string {
  return encodeURIComponent(segment.replace(/[^a-z0-9_\-]/gi, "_").toLowerCase());
}

export function buildCreatorVaultDeliverySystemContract(packages: CreatorVaultProductPackageInput[], basePath = "/vaultx"): CreatorVaultDeliverySystemContract {
  const normalizedPackages = packages.map((pkg) => buildCreatorVaultDeliveryContract(pkg, basePath));
  return {
    contract: "CreatorVaultDeliverySystemContract",
    status: "sellable_when_fulfillment_inputs_present",
    positioningLaw: [
      "Every paid asset must visibly or audibly position CreatorVault/VaultX as the mechanism, not only as a logo.",
      "Every trailer, flyer, promo, Mini App route, and invoice must state what the buyer receives and what action the audience should take.",
      "No render, distribution, or success claim is allowed unless real output URL, source lineage, and validation proof exist.",
    ],
    packageCount: normalizedPackages.length,
    packages: normalizedPackages,
    globalFulfillmentGates: [
      "buyer inputs collected before fulfillment starts",
      "owned/licensed media source lineage attached",
      "CreatorVault mechanism injected into script, overlay, caption, CTA, and invoice copy",
      "operator validation completed before render/distribution claim",
      "payment proof linked to package, segment, tracking code, and payout ledger",
    ],
    outputInjectionChecklist: [
      "brand mark or verbal CreatorVault/VaultX mechanism",
      "segment-specific pain and promise",
      "proof beat or receipt moment",
      "exact paid deliverable list",
      "Telegram Mini App or checkout CTA",
      "tracking code or attribution route",
      "render/output proof status",
    ],
  };
}

export function buildCreatorVaultDeliveryContract(pkg: CreatorVaultProductPackageInput, basePath = "/vaultx"): CreatorVaultDeliveryContract {
  const segment = safeSegment(pkg.segment);
  const route = routeSegment(segment);
  const inputs = INPUTS_BY_SEGMENT[segment] || INPUTS_BY_SEGMENT.indie_creator;
  const packageName = pkg.packageName || "CreatorVault Launch Package";
  return {
    contract: "CreatorVaultDeliveryContract",
    productKey: `creatorvault_${route}_delivery`,
    buyerSegment: segment,
    packageName,
    priceCents: Number.isFinite(pkg.priceCents) ? pkg.priceCents : 0,
    saleClaim: SEGMENT_SALE_CLAIMS[segment] || SEGMENT_SALE_CLAIMS.indie_creator,
    requiredBuyerInputs: inputs,
    creatorVaultInjectedAssets: [
      "CreatorVault/VaultX mechanism statement",
      "segment-specific hook and authority line",
      "branded offer card or lower-third",
      "Telegram Mini App CTA with tracking code",
      "Star Payment or checkout payload reference",
      "source-lineage proof note for owned/licensed assets",
    ],
    visualAndVideoOutputRules: [
      "hook frame must communicate transformation or measurable result within first two seconds",
      "middle proof beat must show source asset, receipt, roster, testimonial, or launch evidence rather than generic hype",
      "CTA frame must name the exact package outcome and route the buyer through CreatorVault/VaultX",
      "flyers and promos must include the same offer, proof, CTA, tracking, and package identity as the trailer",
      "no generic stock-like scene directions are allowed when buyer source media exists",
    ],
    embeddedProofMechanics: [
      "scene lineage references selected source assets",
      "B-roll checklist is tied to hook, proof, and CTA roles",
      "validation gate records whether real render output exists",
      "Telegram attribution stores segment and tracking code",
      "operator can identify what was paid for before releasing output",
    ],
    conversionMechanics: [
      `Mini App route: ${basePath}?source=telegram_mini_app&segment=${route}`,
      `Star payload prefix: cvx_${route}_`,
      "reply keyword or package button must map to the same segment",
      "checkout/invoice copy must repeat the deliverables, not just the package name",
    ],
    deliveredFiles: [
      "validated trailer manifest with scene-by-scene direction",
      "render-ready timeline and provider handoff requirements",
      "B-roll package sheet with source lineage",
      "promo/flyer copy and visual rules using the same offer mechanics",
      "Telegram launch copy, Mini App route, and payment payload metadata",
      ...(pkg.includes || []),
    ],
    operatorCompletionGates: [
      "all required buyer inputs present",
      "CreatorVault mechanism visible in output instructions",
      "proof beat is not empty or generic",
      "CTA route and tracking code attached",
      "render/distribution blocked until output proof exists",
    ],
    telegramMiniAppRoute: `${basePath}?source=telegram_mini_app&segment=${route}`,
    starPaymentPayloadPrefix: `cvx_${route}_`,
    fulfillmentSla: segment === "studio" || segment === "platform" || segment === "distributor" ? "operator_scoped_enterprise_delivery" : "rapid_creator_launch_delivery",
    refundOrHoldGate: "hold fulfillment or manual review if source media rights, buyer input completeness, or payment proof cannot be verified",
  };
}
