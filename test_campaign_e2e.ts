import "dotenv/config";
import { createAIDrop, sendDropToChannel, recordCampaignEvent } from "./server/services/telegramCampaign";

async function main() {
  console.log("=== STEP 1: Create AI Drop ===");
  const drop = await createAIDrop({
    contentId: 4,
    creatorId: 1,
    campaignMode: "FAST",
    campaignType: "PPV_DROP",
    channelEntityId: 1,
  });
  console.log("Campaign created:", JSON.stringify({
    campaignId: drop.campaignId,
    trackingCode: drop.trackingCode,
    distributionJobId: drop.distributionJobId,
    contentTitle: drop.contentTitle,
    priceCents: drop.priceCents,
    aiHook: drop.copy.hook.substring(0, 80),
    aiCaption: drop.copy.caption.substring(0, 120),
    aiCta: drop.copy.cta,
    enginesUsed: drop.copy.enginesUsed,
    costEstimateCents: drop.copy.costEstimateCents,
  }, null, 2));

  console.log("\n=== STEP 2: Send Drop to CreatorVault_Free ===");
  const sendResult = await sendDropToChannel(drop.campaignId);
  console.log("Send result:", JSON.stringify(sendResult, null, 2));

  if (sendResult.success) {
    console.log("\n=== STEP 3: Record Click Attribution ===");
    await recordCampaignEvent(drop.trackingCode, "click", {
      sessionId: "test-session-e2e",
      ipHash: "abc123",
      userAgent: "TestBrowser/1.0",
    });
    console.log("Click recorded for tracking code:", drop.trackingCode);

    console.log("\n=== STEP 4: Record Purchase Conversion ===");
    await recordCampaignEvent(drop.trackingCode, "purchase", {
      userId: 6,
      revenueCents: 1850,
    });
    console.log("Purchase conversion recorded: $18.50");
  }

  console.log("\n=== E2E TEST COMPLETE ===");
  console.log("Tracked URL:", `https://creatorvault.live/r/${drop.trackingCode}`);
}

main().catch(e => {
  console.error("E2E TEST FAILED:", e.message);
  console.error(e.stack);
  process.exit(1);
});
