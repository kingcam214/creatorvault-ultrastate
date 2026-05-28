from pathlib import Path

path = Path('/home/ubuntu/creatorvault-ultrastate-clean/server/media-os/orchestration/trailerMediaOSOrchestrator.ts')
src = path.read_text()

src = src.replace(
'    recommendedNextEngine: renderHandoff?.recommendedNextEngine ? String(renderHandoff.recommendedNextEngine) : "remotion_or_ffmpeg_with_optional_pollo_scene_extension",\n',
'    recommendedNextEngine: renderHandoff?.recommendedNextEngine ? String(renderHandoff.recommendedNextEngine) : "remotion_provider_render_queue_with_optional_pollo_scene_extension",\n'
)

helper = r'''

type StudioGradeTrailerRevenuePackage = {
  segment: string;
  label: string;
  packageName: string;
  priceCents: number;
  includes: string[];
  upsells: string[];
  telegramTrackingSegment: string;
};

function buildStudioGradeTrailerPackages(blueprint: any): StudioGradeTrailerRevenuePackage[] {
  const customPackages = asArray<StudioGradeTrailerRevenuePackage>(blueprint?.studioGradeMonetization?.packages);
  if (customPackages.length > 0) return customPackages;
  return [
    {
      segment: "studio",
      label: "Studios and production teams",
      packageName: "Studio Trailer Command Package",
      priceCents: 250000,
      includes: ["validated trailer manifest", "B-roll selection sheet", "scene lineage", "render handoff", "Telegram acquisition campaign"],
      upsells: ["multi-platform cutdowns", "voiceover variation pack", "premium launch war-room"],
      telegramTrackingSegment: "studio_producer",
    },
    {
      segment: "platform",
      label: "Creator platforms and marketplaces",
      packageName: "Platform Supply Activation Package",
      priceCents: 500000,
      includes: ["repeatable trailer template", "creator intake lane", "batch B-roll packaging", "attribution manifest", "Telegram onboarding funnel"],
      upsells: ["monthly creator supply engine", "custom platform mutation set", "white-label package library"],
      telegramTrackingSegment: "platform_operator",
    },
    {
      segment: "distributor",
      label: "Distributors, labels, agencies, and channel owners",
      packageName: "Distribution Partner Revenue Package",
      priceCents: 350000,
      includes: ["distribution-ready trailer", "partner-safe CTA plan", "channel-specific cutdowns", "campaign tracking codes", "conversion event mapping"],
      upsells: ["release calendar automation", "partner reporting dashboard", "creator roster packaging"],
      telegramTrackingSegment: "distribution_partner",
    },
    {
      segment: "indie_creator",
      label: "Small independent creators",
      packageName: "Indie Creator Launch Package",
      priceCents: 9900,
      includes: ["premium trailer plan", "lean B-roll checklist", "CreatorVault landing CTA", "Telegram intake tracking"],
      upsells: ["fast turnaround render", "caption mutation pack", "VIP launch review"],
      telegramTrackingSegment: "indie_creator",
    },
    {
      segment: "solo_operator",
      label: "Solo operators and founder-creators",
      packageName: "Solo Operator Domination Package",
      priceCents: 19900,
      includes: ["operator-first trailer plan", "proof-led CTA sequence", "scene-by-scene lineage", "Telegram follow-up funnel"],
      upsells: ["weekly launch system", "voiceover stack", "conversion audit"],
      telegramTrackingSegment: "solo_operator",
    },
    {
      segment: "creator_group",
      label: "Small creator groups and collectives",
      packageName: "Creator Group Expansion Package",
      priceCents: 29900,
      includes: ["group trailer arc", "member proof beats", "shared B-roll package", "collective CTA routing"],
      upsells: ["member cutdowns", "collab launch kit", "group revenue reporting"],
      telegramTrackingSegment: "creator_group",
    },
  ];
}

function buildBrollPackagingManifest(blueprint: any, scenes: SceneManifest[]) {
  const selectedAssetIds = asArray<string>(blueprint?.lineage?.selectedAssetIds).map(String);
  const requestedBroll = asArray<any>(blueprint?.brollPackaging?.items);
  const items = scenes.map((scene, index) => {
    const source = requestedBroll[index] ?? {};
    return {
      sceneIndex: scene.sceneIndex,
      sourceAssetId: scene.sourceAssetId || selectedAssetIds[index] || null,
      role: scene.role === "hook" ? "pattern_interrupt" : scene.role === "cta" ? "conversion_close" : "proof_support",
      usage: asString(source?.usage, `Support ${scene.role} with verified owned media, no unlicensed filler.`),
      required: scene.role === "hook" || scene.role === "cta",
      lineage: {
        sourceUrl: scene.sourceUrl,
        assetKind: scene.assetKind,
        deterministicBasis: "ordered scene manifest and selected user-owned asset list",
      },
    };
  });
  return {
    contract: "BrollPackagingManifest",
    status: items.length > 0 ? "ready_for_validation" : "blocked_no_scene_assets",
    itemCount: items.length,
    items,
    blocksRenderWhenMissingRequired: items.some((item) => item.required && !item.sourceAssetId),
  };
}

function buildProviderAwareRenderControl(blueprint: any, render: RenderManifest, validation: ValidationReport) {
  const requestedProvider = asString(blueprint?.renderHandoff?.provider ?? blueprint?.renderHandoff?.recommendedProvider, "provider_queue_unselected");
  const realOutputUrl = asString(blueprint?.renderHandoff?.outputUrl ?? blueprint?.outputUrl, "");
  const providerJobId = asString(blueprint?.renderHandoff?.providerJobId, "");
  const blocks = [
    validation.status !== "handoff_prepared" && validation.status !== "complete" ? "validation_not_ready" : null,
    realOutputUrl ? null : "real_output_url_missing",
    providerJobId ? null : "provider_job_id_missing",
  ].filter(Boolean) as string[];
  return {
    contract: "ProviderAwareRenderControl",
    requestedProvider,
    providerJobId: providerJobId || null,
    outputUrl: realOutputUrl || null,
    renderClaimAllowed: blocks.length === 0,
    distributionAllowed: blocks.length === 0 && render.status === "complete",
    blockingReasons: blocks,
    requiredBeforeProviderCall: [
      "validated_scene_manifest",
      "owned_or_licensed_media_assets",
      "broll_required_items_present",
      "pricing_package_selected",
      "telegram_tracking_code_attached",
    ],
  };
}
'''

if 'buildStudioGradeTrailerPackages' not in src:
    marker = 'function buildStageBoundaries(): MediaOSStageBoundary[] {\n'
    if marker not in src:
        raise SystemExit('stage boundary marker not found')
    src = src.replace(marker, helper + '\n' + marker)

src = src.replace(
'''  const render = buildRenderManifest(blueprint);
  const distribution = buildDistributionManifest();
  const stageBoundaries = buildStageBoundaries();
''',
'''  const render = buildRenderManifest(blueprint);
  const distribution = buildDistributionManifest();
  const studioGradeTrailerPackages = buildStudioGradeTrailerPackages(blueprint);
  const brollPackaging = buildBrollPackagingManifest(blueprint, scenes);
  const providerAwareRenderControl = buildProviderAwareRenderControl(blueprint, render, validation);
  const stageBoundaries = buildStageBoundaries();
'''
)

src = src.replace(
'''      renderPipelineSeparate: true,
      deterministicManifestPreserved: true,
      existingTrailerRoutePreserved: true,
    },
''',
'''      renderPipelineSeparate: true,
      providerRenderBlockedWithoutProof: !providerAwareRenderControl.renderClaimAllowed,
      brollLineageRequired: true,
      monetizationPackageRequired: true,
      deterministicManifestPreserved: true,
      existingTrailerRoutePreserved: true,
    },
'''
)

src = src.replace(
'''      ...distribution.warnings,
    ],
  };
''',
'''      ...distribution.warnings,
      ...(brollPackaging.blocksRenderWhenMissingRequired ? [normalizeWarning("brollPackaging", "Required B-roll lineage is missing for at least one hook or CTA scene; render remains blocked.", "warning")] : []),
      ...providerAwareRenderControl.blockingReasons.map((reason) => normalizeWarning("providerAwareRenderControl", reason, "warning")),
    ],
  };

  (mediaOSManifest as any).studioGradeTrailerPackages = studioGradeTrailerPackages;
  (mediaOSManifest as any).brollPackaging = brollPackaging;
  (mediaOSManifest as any).providerAwareRenderControl = providerAwareRenderControl;
  (mediaOSManifest as any).monetizationSummary = {
    status: "priced_and_ready_for_checkout_or_invoice",
    packageCount: studioGradeTrailerPackages.length,
    lowestPriceCents: Math.min(...studioGradeTrailerPackages.map((pkg) => pkg.priceCents)),
    highestPriceCents: Math.max(...studioGradeTrailerPackages.map((pkg) => pkg.priceCents)),
    indieSegmentsCovered: studioGradeTrailerPackages.filter((pkg) => ["indie_creator", "solo_operator", "creator_group"].includes(pkg.segment)).map((pkg) => pkg.segment),
    enterpriseSegmentsCovered: studioGradeTrailerPackages.filter((pkg) => ["studio", "platform", "distributor"].includes(pkg.segment)).map((pkg) => pkg.segment),
  };
'''
)

path.write_text(src)
print('Patched trailerMediaOSOrchestrator.ts with studio-grade monetization, provider blocking, B-roll, and lineage controls.')
