from pathlib import Path

path = Path('/home/ubuntu/creatorvault-ultrastate-clean/server/services/adaptiveTrailerPlanner.ts')
src = path.read_text()

helper = r'''

function buildTrailerMonetizationPackages() {
  return [
    { segment: "studio", label: "Studios and production teams", packageName: "Studio Trailer Command Package", priceCents: 250000, primaryCTA: "Book studio trailer command review", distributionPath: "telegram_studio_producer_lane" },
    { segment: "platform", label: "Creator platforms and marketplaces", packageName: "Platform Supply Activation Package", priceCents: 500000, primaryCTA: "Open platform supply activation", distributionPath: "telegram_platform_operator_lane" },
    { segment: "distributor", label: "Distributors, labels, agencies, and channel owners", packageName: "Distribution Partner Revenue Package", priceCents: 350000, primaryCTA: "Request distribution revenue package", distributionPath: "telegram_distribution_partner_lane" },
    { segment: "indie_creator", label: "Small independent creators", packageName: "Indie Creator Launch Package", priceCents: 9900, primaryCTA: "Start indie trailer launch", distributionPath: "telegram_indie_creator_lane" },
    { segment: "solo_operator", label: "Solo operators and founder-creators", packageName: "Solo Operator Domination Package", priceCents: 19900, primaryCTA: "Launch solo operator trailer funnel", distributionPath: "telegram_solo_operator_lane" },
    { segment: "creator_group", label: "Small creator groups and collectives", packageName: "Creator Group Expansion Package", priceCents: 29900, primaryCTA: "Package the creator group", distributionPath: "telegram_creator_group_lane" },
  ];
}
'''

if 'buildTrailerMonetizationPackages' not in src:
    marker = 'function cropGuidance(platform: string, sourceFormat: string | undefined): string {\n'
    if marker not in src:
        raise SystemExit('cropGuidance marker not found')
    src = src.replace(marker, helper + '\n' + marker)

src = src.replace(
'''  const structure = buildStructure(blueprint, creatorType, useCase);
  const platforms = ["tiktok", "reels", "shorts", "story", "telegram_promo", "whatsapp_teaser", "hero_video_loop", "website_header_loop"];

  return {
''',
'''  const structure = buildStructure(blueprint, creatorType, useCase);
  const platforms = ["tiktok", "reels", "shorts", "story", "telegram_promo", "whatsapp_teaser", "hero_video_loop", "website_header_loop"];
  const trailerMonetizationPackages = buildTrailerMonetizationPackages();

  return {
'''
)

src = src.replace(
'''    planningSignals: {
      projectType: blueprint.project?.type ?? "launch_trailer",
      format,
      sourceAssetIds: selectedAssetIds(blueprint),
      sceneCount: blueprint.scenes?.length ?? 0,
      estimatedDurationSeconds: pacingPlan.totalDurationSeconds ?? blueprint.readiness?.estimatedDurationSeconds ?? 0,
      hooksProvided: blueprint.hooks?.length ?? 0,
    },
''',
'''    planningSignals: {
      projectType: blueprint.project?.type ?? "launch_trailer",
      format,
      sourceAssetIds: selectedAssetIds(blueprint),
      sceneCount: blueprint.scenes?.length ?? 0,
      estimatedDurationSeconds: pacingPlan.totalDurationSeconds ?? blueprint.readiness?.estimatedDurationSeconds ?? 0,
      hooksProvided: blueprint.hooks?.length ?? 0,
    },
    trailerMonetizationPackages,
    creatorSegmentCoverage: {
      enterprise: trailerMonetizationPackages.filter((pkg) => ["studio", "platform", "distributor"].includes(pkg.segment)).map((pkg) => pkg.segment),
      independent: trailerMonetizationPackages.filter((pkg) => ["indie_creator", "solo_operator", "creator_group"].includes(pkg.segment)).map((pkg) => pkg.segment),
      rule: "No trailer plan is complete unless it can be sold to enterprise partners and small independent creator segments without removing either side.",
    },
'''
)

src = src.replace(
'''        renderClaim: "mutation plan only; no platform-specific output URL is claimed until a real render job completes",
''',
'''        monetizationCTA: platform === "telegram_promo" ? "reply with the matching creator segment keyword and route to the priced VaultX package" : "drive to the selected CreatorVault/VaultX trailer package",
        packageRoutes: trailerMonetizationPackages.map((pkg) => ({ segment: pkg.segment, packageName: pkg.packageName, priceCents: pkg.priceCents, distributionPath: pkg.distributionPath })),
        renderClaim: "mutation plan only; no platform-specific output URL is claimed until a real render job completes",
'''
)

path.write_text(src)
print('Patched adaptiveTrailerPlanner.ts with monetized creator-segment package routes.')
