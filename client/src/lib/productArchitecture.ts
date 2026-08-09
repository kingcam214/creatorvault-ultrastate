export const CreatorVaultRoute = {
  home: "/",
  creatorOS: "/dashboard",
  creatorTools: "/creator/tools",
  creatorMoney: "/creator/earnings",
  creatorIntelligence: "/creator/analytics",
  mediaVault: "/king/media-vault",
  vaultX: "/vaultx",
  bodyCinema: "/vault-x/studio",
  socialEmpire: "/social-hub",
  telegram: "/king/telegram-hub",
  creatorStorefront: "/vaultx",
} as const;

export type ProductDomain = "creator_os" | "vaultx" | "body_cinema" | "social_empire" | "channel" | "operator";

export type ProductDomainDefinition = {
  id: ProductDomain;
  eyebrow: string;
  label: string;
  role: string;
  route: string;
  relationship: string;
};

export const PRODUCT_DOMAINS: ProductDomainDefinition[] = [
  {
    id: "creator_os",
    eyebrow: "CreatorVault",
    label: "Creator OS",
    role: "The creator operating loop for making, packaging, reaching people, earning, and learning from results.",
    route: CreatorVaultRoute.creatorOS,
    relationship: "The control layer for the whole CreatorVault experience.",
  },
  {
    id: "vaultx",
    eyebrow: "CreatorVault vertical",
    label: "VaultX",
    role: "The adult-creator storefront, offer, subscription, and private-access layer inside CreatorVault.",
    route: CreatorVaultRoute.vaultX,
    relationship: "A specialized vertical, not a separate platform.",
  },
  {
    id: "body_cinema",
    eyebrow: "VaultX production engine",
    label: "Body Cinema",
    role: "Source-aware treatment planning and governed premium-video production from creator-owned media.",
    route: CreatorVaultRoute.bodyCinema,
    relationship: "A Body Cinema request stays evidence-gated and provider-controlled inside VaultX.",
  },
  {
    id: "social_empire",
    eyebrow: "CreatorVault audience layer",
    label: "Social Empire",
    role: "The native social, audience, attribution, and approval-controlled distribution control layer.",
    route: CreatorVaultRoute.socialEmpire,
    relationship: "It turns owned media into native posts and approved external drafts; it does not silently publish.",
  },
  {
    id: "channel",
    eyebrow: "Channel endpoint",
    label: "Telegram & community",
    role: "A community and delivery endpoint with tracked drops, receipts, and explicit approval boundaries.",
    route: CreatorVaultRoute.telegram,
    relationship: "A channel inside the operating loop, never a separate product home.",
  },
  {
    id: "operator",
    eyebrow: "Role-scoped control",
    label: "Owner controls",
    role: "Governance, approval, and operator oversight reserved for the authenticated owner or administrator.",
    route: "/king",
    relationship: "Role-scoped operations, not a creator or public product destination.",
  },
];

export const CANONICAL_PRIMARY_NAV = [
  { label: "Creator OS", href: CreatorVaultRoute.creatorOS },
  { label: "VaultX", href: CreatorVaultRoute.vaultX },
  { label: "Social Empire", href: CreatorVaultRoute.socialEmpire },
] as const;

export const LEGACY_ROUTE_REDIRECTS: Record<string, string> = {
  "/body-cinema": CreatorVaultRoute.bodyCinema,
  "/telegram-hub": CreatorVaultRoute.telegram,
  "/trailer-maker": "/vaultx/trailers",
  "/social-audit": CreatorVaultRoute.socialEmpire,
  "/social-autoposter": CreatorVaultRoute.socialEmpire,
  "/social/factory": CreatorVaultRoute.socialEmpire,
  "/social/posting-hub": CreatorVaultRoute.socialEmpire,
};

export const CLAIMS_POLICY = {
  generatedOutput: "Do not claim a generation result is real, premium, sellable, or approved unless a persisted provider task, durable asset, and quality-review record support it.",
  externalPublishing: "Do not claim an external post, schedule, automation, audience metric, or connected account without the corresponding durable delivery or verified account-read record.",
  mediaEvidence: "Use only media paths that return the expected media MIME type; otherwise label the item unavailable rather than presenting it as proof.",
} as const;
