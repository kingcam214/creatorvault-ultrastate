import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";

const ownerRoles = new Set(["king", "admin", "creator"]);

function requireCreatorAccess(ctx: any) {
  if (!ctx?.user || !ownerRoles.has(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Creator access required" });
  }
}

const bodyRegions = [
  "Face polish",
  "Bust spotlight",
  "Abs definition",
  "Hip curve",
  "Glute lift",
  "Leg length",
  "Full-body cinema grade",
];

const moneyButtons = [
  {
    id: "body-cinema",
    label: "Run Body Cinema",
    subcopy: "Upload a clip. Pick the visual fantasy. Ship a premium PPV-ready master.",
    outcome: "premium_video_bundle",
    revenuePath: "PPV sale, teaser funnel, platform pack",
  },
  {
    id: "trailer-drop",
    label: "Build My Launch Trailer",
    subcopy: "Turn existing vault footage into the 15s, 30s, and 60s promo stack.",
    outcome: "launch_trailer_pack",
    revenuePath: "new subscriber conversion and paid drop demand",
  },
  {
    id: "clone-scene",
    label: "Generate Clone Scene",
    subcopy: "Create synthetic promo media in locations you did not have to rent.",
    outcome: "clone_image_or_video",
    revenuePath: "credit margin plus sellable clone content",
  },
  {
    id: "challenge-sprint",
    label: "Start Revenue Sprint",
    subcopy: "Launch a live proof board where every Stripe sale moves the counter.",
    outcome: "challenge_revenue_board",
    revenuePath: "direct challenge checkout and subscription upsell",
  },
];

function buildBodyCinemaPlan(input?: { niche?: string; tier?: "natural" | "enhanced" | "cinematic" | "god_mode" }) {
  const tier = input?.tier ?? "god_mode";
  const niche = input?.niche?.trim() || "premium adult creator";
  return {
    title: "Body Cinema God Mode",
    tier,
    niche,
    headline: "Stop posting clips. Start dropping scenes people pay to unlock.",
    directCTAs: [
      "Make It Cinematic",
      "Build My PPV Drop",
      "Find The Money Shot",
      "Turn This Into A Trailer",
      "Package For Every Platform",
    ],
    enhancementZones: bodyRegions,
    productionFlow: [
      "AI scans the upload for hooks, body-region focus, motion quality, and first-three-second attention strength.",
      "Creator chooses Natural, Enhanced, Cinematic, or God Mode instead of confusing editor settings.",
      "System returns a premium master, SFW teaser, viral clip pack, cover frame, captions, and PPV price suggestion.",
      "Creator launches the drop to Vault, Stripe, OF/Fansly workflow, social teaser channels, or the challenge board.",
    ],
    promise: `For ${niche}s, Body Cinema turns one raw phone clip into a revenue package instead of another forgotten post.`,
  };
}

export const godModeRouter = router({
  getConsoleState: protectedProcedure.query(({ ctx }) => {
    requireCreatorAccess(ctx);
    return {
      success: true,
      mode: "creator_god_mode",
      owner: { id: ctx.user.id, role: ctx.user.role, username: ctx.user.email ?? "creator" },
      revenueTarget: 5000,
      systems: [
        { key: "vaultx", label: "VaultX Editor", status: "armed", promise: "Turn raw clips into sellable bundles." },
        { key: "body_cinema", label: "Body Cinema", status: "flagship", promise: "Direct visual enhancement controls for premium creator scenes." },
        { key: "trailer", label: "Trailer Studio", status: "wired", promise: "Launch trailers, teaser cuts, captions, and platform packs." },
        { key: "clone", label: "Clone Lab", status: "armed", promise: "Synthetic image and short-video scenes from trained creator models." },
        { key: "challenge", label: "AI Agent Challenge", status: "monetizing", promise: "Live Stripe-backed public revenue proof." },
      ],
      moneyButtons,
      bodyCinema: buildBodyCinemaPlan(),
    };
  }),

  buildBodyCinemaPlan: protectedProcedure
    .input(z.object({ niche: z.string().max(120).optional(), tier: z.enum(["natural", "enhanced", "cinematic", "god_mode"]).optional() }).optional())
    .mutation(({ ctx, input }) => {
      requireCreatorAccess(ctx);
      return { success: true, plan: buildBodyCinemaPlan(input) };
    }),

  launchCreatorAttack: protectedProcedure
    .input(
      z.object({
        system: z.enum(["vaultx", "body_cinema", "trailer", "clone", "challenge"]),
        offerName: z.string().min(1).max(120),
        targetRevenue: z.number().min(100).max(100000).default(5000),
        audience: z.string().max(300).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      requireCreatorAccess(ctx);
      const selected = moneyButtons.find((button) => button.id.includes(input.system.split("_")[0])) ?? moneyButtons[0];
      return {
        success: true,
        attackId: `${input.system}-${Date.now()}`,
        offerName: input.offerName,
        targetRevenue: input.targetRevenue,
        audience: input.audience || "adult creators and premium subscribers",
        command: selected.label,
        nextSteps: [
          "Select or upload the source media.",
          "Generate the premium asset package.",
          "Attach Stripe-backed checkout or PPV pricing.",
          "Launch the teaser and track revenue movement live.",
        ],
      };
    }),
});
