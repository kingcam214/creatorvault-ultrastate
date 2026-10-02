import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { getStripePayoutDb, saveCreatorStripeConnectAccount } from "../db";

export async function createCreatorConnectOnboarding(
  stripe: Stripe, creatorId: number, configuredApplicationUrl: string,
): Promise<{ accountId: string; onboardingUrl: string }> {
  if (!Number.isSafeInteger(creatorId) || creatorId <= 0) throw new Error("Invalid creator user ID");
  const application = new URL(configuredApplicationUrl);
  if (application.protocol !== "https:" && !(application.protocol === "http:" && ["localhost", "127.0.0.1"].includes(application.hostname))) {
    throw new Error("Stripe onboarding requires the server's trusted HTTPS application URL");
  }
  const database = await getStripePayoutDb();
  const [creator] = await database.select({ accountId: users.stripeConnectAccountId }).from(users).where(eq(users.id, creatorId));
  if (!creator) throw new Error("Creator not found");
  let accountId = creator.accountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express", metadata: { userId: String(creatorId) },
      capabilities: { transfers: { requested: true } },
    }, { idempotencyKey: `creatorvault:connect-account:v1:${creatorId}` });
    await saveCreatorStripeConnectAccount(creatorId, account.id);
    accountId = account.id;
  }
  // Account Links are short-lived; create a fresh URL on every protected request.
  // Destinations are derived solely from trusted server configuration, not user input.
  const link = await stripe.accountLinks.create({
    account: accountId, type: "account_onboarding",
    refresh_url: `${application.origin}/dashboard?stripeConnect=refresh`,
    return_url: `${application.origin}/dashboard?stripeConnect=complete`,
  });
  return { accountId, onboardingUrl: link.url };
}
