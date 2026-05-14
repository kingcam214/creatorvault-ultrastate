
import fs from 'fs';
import mysql from 'mysql2/promise';
import { pathToFileURL } from 'url';
process.chdir('/root/creatorvault');

const targets = [{"rank": 1, "sourceTable": "greatest_show_creators", "sourceId": "6", "platform": "greatest_show", "handle": "Lirys_Twin__greatest_show_creators_6", "sourceHandle": "Lirys (Twin)", "displayName": "Lirys (Twin)", "bio": "Chef de 5 estrellas, anfitriona de Airbnb, y creadora de contenido. La vida es un banquete.", "niche": "cooking", "followers": 0, "engagementRate": 0.0, "score": 90, "band": "critical", "reasons": ["existing Greatest Show creator row", "known monetization/projection signal in source", "fast activation priority"], "rawStatus": "active", "packagePriority": "creatorvault_growth_system", "projectedSetupRevenueCents": 400000, "projectedMrrCents": 44985, "channel": "manual", "riskLevel": "low", "approvalStatus": "requires_kingcam_approval", "suggestedMessage": "Hey Lirys (Twin), I prepared a CreatorVault packet for your cooking audience showing the first paid offer, Telegram/VIP path, and subscription setup. Want me to send it for review?"}, {"rank": 2, "sourceTable": "greatest_show_creators", "sourceId": "3", "platform": "greatest_show", "handle": "Delbania__greatest_show_creators_3", "sourceHandle": "Delbania", "displayName": "Delbania", "bio": "Mami fit, empresaria, y mamá soltera. Cabello premium y contenido de vida real. Boutique de cabello + fitness + lifestyle.", "niche": "lifestyle", "followers": 0, "engagementRate": 0.0, "score": 90, "band": "critical", "reasons": ["existing Greatest Show creator row", "known monetization/projection signal in source", "fast activation priority"], "rawStatus": "active", "packagePriority": "creatorvault_growth_system", "projectedSetupRevenueCents": 400000, "projectedMrrCents": 44985, "channel": "manual", "riskLevel": "low", "approvalStatus": "requires_kingcam_approval", "suggestedMessage": "Hey Delbania, I prepared a CreatorVault packet for your lifestyle audience showing the first paid offer, Telegram/VIP path, and subscription setup. Want me to send it for review?"}, {"rank": 3, "sourceTable": "greatest_show_creators", "sourceId": "4", "platform": "greatest_show", "handle": "China_Marielka__greatest_show_creators_4", "sourceHandle": "China (Marielka)", "displayName": "China (Marielka)", "bio": "Cosita linda de la RD. Contenido exclusivo para los que saben apreciar. VaultX activo.", "niche": "adult", "followers": 0, "engagementRate": 0.0, "score": 96, "band": "critical", "reasons": ["existing Greatest Show creator row", "known monetization/projection signal in source", "VaultX/adult fit", "fast activation priority"], "rawStatus": "active", "packagePriority": "creatorvault_growth_system", "projectedSetupRevenueCents": 400000, "projectedMrrCents": 59985, "channel": "manual", "riskLevel": "low", "approvalStatus": "requires_kingcam_approval", "suggestedMessage": "Hey China (Marielka), I prepared a CreatorVault packet for your adult audience showing the first paid offer, Telegram/VIP path, and subscription setup. Want me to send it for review?"}, {"rank": 4, "sourceTable": "greatest_show_creators", "sourceId": "7", "platform": "greatest_show", "handle": "Leslie_Princesa_De_Africa__greatest_show_creators_7", "sourceHandle": "Leslie (Princesa De Africa)", "displayName": "Leslie (Princesa De Africa)", "bio": "Princesa de África. Cuerpo fit, mente libre, contenido exclusivo para gringos que saben lo que quieren. Adult fitness + lifestyle.", "niche": "adult", "followers": 0, "engagementRate": 0.0, "score": 96, "band": "critical", "reasons": ["existing Greatest Show creator row", "known monetization/projection signal in source", "VaultX/adult fit", "fast activation priority"], "rawStatus": "active", "packagePriority": "creatorvault_growth_system", "projectedSetupRevenueCents": 400000, "projectedMrrCents": 59985, "channel": "manual", "riskLevel": "low", "approvalStatus": "requires_kingcam_approval", "suggestedMessage": "Hey Leslie (Princesa De Africa), I prepared a CreatorVault packet for your adult audience showing the first paid offer, Telegram/VIP path, and subscription setup. Want me to send it for review?"}, {"rank": 5, "sourceTable": "greatest_show_creators", "sourceId": "5", "platform": "greatest_show", "handle": "Lizzy__greatest_show_creators_5", "sourceHandle": "Lizzy", "displayName": "Lizzy", "bio": "Mami fit con actitud. Workouts, lifestyle, y contenido que inspira. En proceso de demostrar consistencia.", "niche": "fitness", "followers": 0, "engagementRate": 0.0, "score": 90, "band": "critical", "reasons": ["existing Greatest Show creator row", "known monetization/projection signal in source", "fast activation priority"], "rawStatus": "active", "packagePriority": "creatorvault_growth_system", "projectedSetupRevenueCents": 400000, "projectedMrrCents": 44985, "channel": "manual", "riskLevel": "low", "approvalStatus": "requires_kingcam_approval", "suggestedMessage": "Hey Lizzy, I prepared a CreatorVault packet for your fitness audience showing the first paid offer, Telegram/VIP path, and subscription setup. Want me to send it for review?"}, {"rank": 6, "sourceTable": "greatest_show_creators", "sourceId": "2", "platform": "greatest_show", "handle": "Princesa_De_Africa__greatest_show_creators_2", "sourceHandle": "Princesa De Africa", "displayName": "Princesa De Africa", "bio": "Dominicana living in Colombia. Fit body, adult content creator, sexy fitness model. VaultX exclusive. TikTok: @princesadeafrica | IG: @negriitax3", "niche": "lifestyle", "followers": 6977, "engagementRate": 3.73, "score": 89, "band": "critical", "reasons": ["existing Greatest Show creator row", "audience signal", "VaultX/adult fit"], "rawStatus": "active", "packagePriority": "creatorvault_growth_system", "projectedSetupRevenueCents": 400000, "projectedMrrCents": 275931, "channel": "manual", "riskLevel": "low", "approvalStatus": "requires_kingcam_approval", "suggestedMessage": "Hey Princesa De Africa, I prepared a CreatorVault packet for your lifestyle audience showing the first paid offer, Telegram/VIP path, and subscription setup. Want me to send it for review?"}, {"rank": 7, "sourceTable": "greatest_show_creators", "sourceId": "8", "platform": "greatest_show", "handle": "DelBania__greatest_show_creators_8", "sourceHandle": "DelBania", "displayName": "DelBania", "bio": "Fitness influencer. Dueña de boutique de cabello premium. Mamá soltera y jefa. 💪", "niche": "fitness", "followers": 4945, "engagementRate": 0.0, "score": 76, "band": "high", "reasons": ["existing Greatest Show creator row", "audience signal"], "rawStatus": "active", "packagePriority": "ai_monetization_audit", "projectedSetupRevenueCents": 250000, "projectedMrrCents": 146951, "channel": "manual", "riskLevel": "low", "approvalStatus": "requires_kingcam_approval", "suggestedMessage": "Hey DelBania, I prepared a CreatorVault packet for your fitness audience showing the first paid offer, Telegram/VIP path, and subscription setup. Want me to send it for review?"}, {"rank": 8, "sourceTable": "greatest_show_creators", "sourceId": "9", "platform": "greatest_show", "handle": "China__greatest_show_creators_9", "sourceHandle": "China", "displayName": "China", "bio": "Creadora de contenido exclusivo. VaultX verified. Dominicana 🇩🇴", "niche": "adult", "followers": 3889, "engagementRate": 0.0, "score": 86, "band": "critical", "reasons": ["existing Greatest Show creator row", "audience signal", "VaultX/adult fit"], "rawStatus": "active", "packagePriority": "creatorvault_growth_system", "projectedSetupRevenueCents": 400000, "projectedMrrCents": 114000, "channel": "manual", "riskLevel": "low", "approvalStatus": "requires_kingcam_approval", "suggestedMessage": "Hey China, I prepared a CreatorVault packet for your adult audience showing the first paid offer, Telegram/VIP path, and subscription setup. Want me to send it for review?"}, {"rank": 9, "sourceTable": "greatest_show_creators", "sourceId": "1", "platform": "greatest_show", "handle": "Lirys_Twin_Rodriguez__greatest_show_creators_1", "sourceHandle": "Lirys \"Twin\" Rodriguez", "displayName": "Lirys \"Twin\" Rodriguez", "bio": "Self-taught 5-star chef, Airbnb host, and lifestyle queen from the Dominican Republic. I cook, I host, I live beautifully. My kitchen is my stage and the DR is my backdrop. SHEIN ambassador in the making. 🌴🍽️👑", "niche": "lifestyle", "followers": 1400, "engagementRate": 0.0, "score": 76, "band": "high", "reasons": ["existing Greatest Show creator row", "audience signal"], "rawStatus": "active", "packagePriority": "ai_monetization_audit", "projectedSetupRevenueCents": 250000, "projectedMrrCents": 41986, "channel": "manual", "riskLevel": "low", "approvalStatus": "requires_kingcam_approval", "suggestedMessage": "Hey Lirys \"Twin\" Rodriguez, I prepared a CreatorVault packet for your lifestyle audience showing the first paid offer, Telegram/VIP path, and subscription setup. Want me to send it for review?"}, {"rank": 10, "sourceTable": "greatest_show_creators", "sourceId": "10", "platform": "greatest_show", "handle": "Lizzy_Slim__greatest_show_creators_10", "sourceHandle": "Lizzy (Slim)", "displayName": "Lizzy (Slim)", "bio": "Sexy fitness girl. Lifestyle. Mamá soltera. 🏋️‍♀️", "niche": "fitness", "followers": 0, "engagementRate": 0.0, "score": 70, "band": "high", "reasons": ["existing Greatest Show creator row"], "rawStatus": "active", "packagePriority": "ai_monetization_audit", "projectedSetupRevenueCents": 250000, "projectedMrrCents": 29984, "channel": "manual", "riskLevel": "low", "approvalStatus": "requires_kingcam_approval", "suggestedMessage": "Hey Lizzy (Slim), I prepared a CreatorVault packet for your fitness audience showing the first paid offer, Telegram/VIP path, and subscription setup. Want me to send it for review?"}, {"rank": 11, "sourceTable": "users", "sourceId": "8078", "platform": "creatorvault", "handle": "yodeiris__users_8078", "sourceHandle": "yodeiris", "displayName": "La Yoder", "bio": "Existing CreatorVault creator signup with generated monetization roadmap and VaultSpace platform strategy.", "niche": "creator monetization", "followers": 2500, "engagementRate": 0.0, "score": 81, "band": "high", "reasons": ["existing CreatorVault user/signup row", "audience signal", "VaultX/adult fit"], "rawStatus": "active", "packagePriority": "ai_monetization_audit", "projectedSetupRevenueCents": 250000, "projectedMrrCents": 74975, "channel": "manual", "riskLevel": "low", "approvalStatus": "requires_kingcam_approval", "suggestedMessage": "Hey La Yoder, I prepared a CreatorVault packet for your creator monetization audience showing the first paid offer, Telegram/VIP path, and subscription setup. Want me to send it for review?"}, {"rank": 12, "sourceTable": "vaultspace_profiles", "sourceId": "2", "platform": "vaultspace", "handle": "reshula24__vaultspace_profiles_2", "sourceHandle": "reshula24", "displayName": "Paola ReShula - CreatorVault Dominicana", "bio": "🔥 Dominican Model & Content Creator\n💎 CreatorVault Adult Brand Ambassador\n🎓 Real Street English Teacher\n🌎 SlangExxchange Founder\n👥 Leader of 2,000+ DR Creators\n\n📍 Dominican Republic\n📸 Instagram: 29.2K | Twitter: 7.5K\n\n💰 Join my VaultSpace for exclusive content, direct access, and VIP perks!\n\nTiers:\n🥉 Bronze ($99/mo) - Exclusive photos & videos\n🥈 Silver ($199/mo) - Everything + Weekly live sessions\n🥇 Gold ($299/mo) - Everything + 1-on-1 video calls", "niche": "creator monetization", "followers": 0, "engagementRate": 0.0, "score": 79, "band": "high", "reasons": ["existing VaultSpace profile row", "VaultX/adult fit"], "rawStatus": null, "packagePriority": "vip_funnel_setup", "projectedSetupRevenueCents": 250000, "projectedMrrCents": 44985, "channel": "manual", "riskLevel": "low", "approvalStatus": "requires_kingcam_approval", "suggestedMessage": "Hey Paola ReShula - CreatorVault Dominicana, I prepared a CreatorVault packet for your creator monetization audience showing the first paid offer, Telegram/VIP path, and subscription setup. Want me to send it for review?"}, {"rank": 13, "sourceTable": "haitian_sector_creators", "sourceId": "1", "platform": "tiktok", "handle": "haitianvault__haitian_sector_creators_1", "sourceHandle": "@haitianvault", "displayName": "Haitian Creator Network", "bio": "", "niche": "Lifestyle + Kontni Kreyasyon", "followers": 0, "engagementRate": 0.0, "score": 63, "band": "medium", "reasons": ["manual Haitian/DR sector creator prospect row"], "rawStatus": "ONBOARDING", "packagePriority": "telegram_money_machine", "projectedSetupRevenueCents": 150000, "projectedMrrCents": 44985, "channel": "TikTok/manual", "riskLevel": "medium", "approvalStatus": "requires_kingcam_approval", "suggestedMessage": "Hey Haitian Creator Network, I prepared a CreatorVault packet for your Lifestyle + Kontni Kreyasyon audience showing the first paid offer, Telegram/VIP path, and subscription setup. Want me to send it for review?"}, {"rank": 14, "sourceTable": "haitian_sector_creators", "sourceId": "2", "platform": "tiktok", "handle": "petionville__haitian_sector_creators_2", "sourceHandle": "@petionville", "displayName": "Pétion-Ville Creator", "bio": "", "niche": "Lifestyle + Beauty", "followers": 0, "engagementRate": 0.0, "score": 63, "band": "medium", "reasons": ["manual Haitian/DR sector creator prospect row"], "rawStatus": "ONBOARDING", "packagePriority": "telegram_money_machine", "projectedSetupRevenueCents": 150000, "projectedMrrCents": 44985, "channel": "TikTok/manual", "riskLevel": "medium", "approvalStatus": "requires_kingcam_approval", "suggestedMessage": "Hey Pétion-Ville Creator, I prepared a CreatorVault packet for your Lifestyle + Beauty audience showing the first paid offer, Telegram/VIP path, and subscription setup. Want me to send it for review?"}, {"rank": 15, "sourceTable": "haitian_sector_creators", "sourceId": "3", "platform": "tiktok", "handle": "caphaitian__haitian_sector_creators_3", "sourceHandle": "@caphaitian", "displayName": "Cap-Haïtien Creator", "bio": "", "niche": "Fitness + Lifestyle", "followers": 0, "engagementRate": 0.0, "score": 63, "band": "medium", "reasons": ["manual Haitian/DR sector creator prospect row"], "rawStatus": "ONBOARDING", "packagePriority": "telegram_money_machine", "projectedSetupRevenueCents": 150000, "projectedMrrCents": 44985, "channel": "TikTok/manual", "riskLevel": "medium", "approvalStatus": "requires_kingcam_approval", "suggestedMessage": "Hey Cap-Haïtien Creator, I prepared a CreatorVault packet for your Fitness + Lifestyle audience showing the first paid offer, Telegram/VIP path, and subscription setup. Want me to send it for review?"}, {"rank": 16, "sourceTable": "users", "sourceId": "8002", "platform": "creatorvault", "handle": "marielka__users_8002", "sourceHandle": "marielka", "displayName": "Marielka", "bio": "", "niche": "creator monetization", "followers": 0, "engagementRate": 0.0, "score": 75, "band": "high", "reasons": ["existing CreatorVault user/signup row", "VaultX/adult fit"], "rawStatus": "active", "packagePriority": "ai_monetization_audit", "projectedSetupRevenueCents": 250000, "projectedMrrCents": 44985, "channel": "manual", "riskLevel": "low", "approvalStatus": "requires_kingcam_approval", "suggestedMessage": "Hey Marielka, I prepared a CreatorVault packet for your creator monetization audience showing the first paid offer, Telegram/VIP path, and subscription setup. Want me to send it for review?"}, {"rank": 17, "sourceTable": "users", "sourceId": "8005", "platform": "creatorvault", "handle": "leslie__users_8005", "sourceHandle": "leslie", "displayName": "leslie", "bio": "", "niche": "creator monetization", "followers": 0, "engagementRate": 0.0, "score": 65, "band": "medium", "reasons": ["existing CreatorVault user/signup row"], "rawStatus": "pending", "packagePriority": "ai_monetization_audit", "projectedSetupRevenueCents": 150000, "projectedMrrCents": 44985, "channel": "manual", "riskLevel": "low", "approvalStatus": "requires_kingcam_approval", "suggestedMessage": "Hey leslie, I prepared a CreatorVault packet for your creator monetization audience showing the first paid offer, Telegram/VIP path, and subscription setup. Want me to send it for review?"}, {"rank": 18, "sourceTable": "users", "sourceId": "8004", "platform": "creatorvault", "handle": "twin__users_8004", "sourceHandle": "twin", "displayName": "Lirys", "bio": "", "niche": "creator monetization", "followers": 0, "engagementRate": 0.0, "score": 65, "band": "medium", "reasons": ["existing CreatorVault user/signup row"], "rawStatus": "active", "packagePriority": "ai_monetization_audit", "projectedSetupRevenueCents": 150000, "projectedMrrCents": 44985, "channel": "manual", "riskLevel": "low", "approvalStatus": "requires_kingcam_approval", "suggestedMessage": "Hey Lirys, I prepared a CreatorVault packet for your creator monetization audience showing the first paid offer, Telegram/VIP path, and subscription setup. Want me to send it for review?"}, {"rank": 19, "sourceTable": "users", "sourceId": "8003", "platform": "creatorvault", "handle": "vanessa__users_8003", "sourceHandle": "vanessa", "displayName": "Slim", "bio": "", "niche": "creator monetization", "followers": 0, "engagementRate": 0.0, "score": 65, "band": "medium", "reasons": ["existing CreatorVault user/signup row"], "rawStatus": "active", "packagePriority": "ai_monetization_audit", "projectedSetupRevenueCents": 150000, "projectedMrrCents": 44985, "channel": "manual", "riskLevel": "low", "approvalStatus": "requires_kingcam_approval", "suggestedMessage": "Hey Slim, I prepared a CreatorVault packet for your creator monetization audience showing the first paid offer, Telegram/VIP path, and subscription setup. Want me to send it for review?"}, {"rank": 20, "sourceTable": "social_links", "sourceId": "2", "platform": "instagram", "handle": "Persuasive214__social_links_2", "sourceHandle": "Persuasive214", "displayName": "Persuasive214", "bio": "", "niche": "creator monetization", "followers": 3259, "engagementRate": 0.0, "score": 63, "band": "medium", "reasons": ["stored social handle row", "audience signal"], "rawStatus": "active", "packagePriority": "ai_monetization_audit", "projectedSetupRevenueCents": 150000, "projectedMrrCents": 95968, "channel": "IG/manual", "riskLevel": "medium", "approvalStatus": "requires_kingcam_approval", "suggestedMessage": "Hey Persuasive214, I prepared a CreatorVault packet for your creator monetization audience showing the first paid offer, Telegram/VIP path, and subscription setup. Want me to send it for review?"}];
const report = {
  fedAt: new Date().toISOString(),
  productionHost: 'creatorvault.live',
  targetCount: targets.length,
  insertedProfiles: 0,
  generatedPackets: 0,
  pipelineRows: 0,
  queuedForReview: 0,
  actualRevenueRowsWithNonZero: 0,
  outreachSent: false,
  checks: [],
  targets: [],
  sourceCategories: {},
};
function add(name, pass, details={}) { report.checks.push({ name, pass: Boolean(pass), details }); }
function clamp(n, lo=0, hi=100) { return Math.max(lo, Math.min(hi, Math.round(Number(n)||0))); }
function cents(n) { return Math.max(0, Math.round(Number(n)||0)); }
function sqlDatePlusHours(hours) { return new Date(Date.now() + hours*3600*1000).toISOString(); }
function platformList(t) {
  const base = [t.platform];
  if (String(t.channel||'').toLowerCase().includes('telegram')) base.push('telegram');
  if (String(t.channel||'').toLowerCase().includes('ig')) base.push('instagram');
  if (String(t.channel||'').toLowerCase().includes('tiktok')) base.push('tiktok');
  return [...new Set(base.filter(Boolean))];
}
function auditPreview(t) {
  return {
    source: t.sourceTable,
    sourceId: t.sourceId,
    reasonSelected: t.reasons,
    realProductionSource: true,
    projectedSetupRevenueCents: cents(t.projectedSetupRevenueCents),
    projectedMrrCents: cents(t.projectedMrrCents),
    projectedValuesAreNotLedgerRevenue: true,
    outreachRequiresApproval: true,
  };
}
function scoreBreakdown(t) {
  return {
    monetizationReadiness: clamp(t.score),
    relationshipStrength: t.sourceTable === 'users' || t.sourceTable === 'vaultspace_profiles' ? 82 : t.sourceTable === 'greatest_show_creators' ? 88 : 58,
    ownedChannelReadiness: /telegram|whatsapp/i.test(`${t.channel} ${t.bio}`) ? 76 : 42,
    recurringRevenuePotential: clamp((t.projectedMrrCents || 0) / 3500),
    highTicketPotential: clamp((t.projectedSetupRevenueCents || 0) / 45000),
    noFakeData: true,
  };
}
function outreachMessage(t) {
  return t.suggestedMessage || `Operator review required before sending a CreatorVault packet to ${t.displayName}.`;
}
async function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  return mysql.createConnection(url);
}
const { conversionEngineRouter } = await import(pathToFileURL('/root/creatorvault/server/routers/conversionEngineRouter.ts').href);
const { dailyRevenueEngineRouter } = await import(pathToFileURL('/root/creatorvault/server/routers/dailyRevenueEngineRouter.ts').href);
const ctx = {
  user: { id: 1, role: 'king', username: 'kingcam-revenue-desk', email: 'revenue-desk@creatorvault.local' },
  req: { headers: {}, cookies: {}, protocol: 'https', get: () => 'creatorvault.live' },
  res: { clearCookie: () => undefined, cookie: () => undefined, setHeader: () => undefined },
};
const conversionCaller = conversionEngineRouter.createCaller(ctx);
const dailyCaller = dailyRevenueEngineRouter.createCaller(ctx);
const today = new Date().toISOString().slice(0, 10);
const conn = await getDb();
try {
  await dailyCaller.upsertTodayPlan({
    date: today,
    operatorLabel: 'KingCam Daily Revenue Desk',
    targetCreators: 20,
    targetActivations: 5,
    targetFirstDollars: 1,
    targetMrrCents: targets.reduce((sum, t) => sum + cents(t.projectedMrrCents), 0),
    executionNotes: 'First 20 real creator targets from existing production sources. Projected revenue only; actual revenue remains ledger-backed. Outreach queued for operator approval only.',
  });

  for (const t of targets) {
    report.sourceCategories[t.sourceTable] = (report.sourceCategories[t.sourceTable] || 0) + 1;
    const engagement = Number(t.engagementRate || 0).toFixed(2);
    const metadata = {
      feedRun: 'daily_revenue_first_20_real_targets',
      sourceTable: t.sourceTable,
      sourceId: t.sourceId,
      sourceHandle: t.sourceHandle,
      realProspect: true,
      selectedRank: t.rank,
      approvalStatus: t.approvalStatus,
      channel: t.channel,
      riskLevel: t.riskLevel,
      projectedSetupRevenueCents: cents(t.projectedSetupRevenueCents),
      projectedMrrCents: cents(t.projectedMrrCents),
      projectedRevenueLabel: 'projected_not_actual',
      actualRevenueMustComeFromLedger: true,
      noAutomatedOutreachSent: true,
    };
    await conn.execute(`INSERT INTO recruiter_creator_profiles
      (platform, handle, display_name, profile_url, source, bio, niche, followers, engagement_rate, recent_post, platforms, monetization_score, fit_score, urgency_score, total_score, score_breakdown, audit_preview, trailer_concept, outreach_message, onboarding_url, telegram_username, telegram_ready, stripe_link_status, status, priority, metadata)
      VALUES (?, ?, ?, ?, 'daily_revenue_existing_sources', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'queued', ?, ?)
      ON DUPLICATE KEY UPDATE
        display_name = VALUES(display_name), source = VALUES(source), bio = VALUES(bio), niche = VALUES(niche), followers = VALUES(followers), engagement_rate = VALUES(engagement_rate), recent_post = VALUES(recent_post), platforms = VALUES(platforms), monetization_score = VALUES(monetization_score), fit_score = VALUES(fit_score), urgency_score = VALUES(urgency_score), total_score = VALUES(total_score), score_breakdown = VALUES(score_breakdown), audit_preview = VALUES(audit_preview), trailer_concept = VALUES(trailer_concept), outreach_message = VALUES(outreach_message), onboarding_url = VALUES(onboarding_url), telegram_username = VALUES(telegram_username), telegram_ready = VALUES(telegram_ready), stripe_link_status = VALUES(stripe_link_status), status = VALUES(status), priority = VALUES(priority), metadata = VALUES(metadata), updated_at = NOW()`,
      [t.platform, t.handle, t.displayName, null, t.bio || null, t.niche || 'creator monetization', Number(t.followers||0), engagement, `Selected from ${t.sourceTable}#${t.sourceId} for real Daily Revenue Engine review queue.`, JSON.stringify(platformList(t)), clamp(t.score), clamp(t.score - 4), clamp(t.score - 10), clamp(t.score), JSON.stringify(scoreBreakdown(t)), JSON.stringify(auditPreview(t)), `Money-first CreatorVault onboarding trailer for ${t.displayName}: ${t.niche} → paid vault → Telegram/VIP escalation.`, outreachMessage(t), `/conversion-engine?source=daily-revenue&handle=${encodeURIComponent(t.handle)}`, null, /telegram/i.test(`${t.channel} ${t.bio}`), t.band, JSON.stringify(metadata)]
    );
    const [profileRows] = await conn.execute('SELECT id FROM recruiter_creator_profiles WHERE platform = ? AND handle = ? LIMIT 1', [t.platform, t.handle]);
    const profile = profileRows[0];
    if (!profile) throw new Error(`profile not found after upsert: ${t.handle}`);
    report.insertedProfiles += 1;

    const generated = await conversionCaller.generateForCreator({ profileId: Number(profile.id), assignedRecruiter: 'KingCam revenue desk' });
    const packetId = Number(generated.packet?.id || 0);
    if (!packetId) throw new Error(`conversion packet missing for ${t.handle}`);
    report.generatedPackets += 1;

    const evidencePayload = {
      source: 'daily_revenue_first_20_real_targets',
      sourceTable: t.sourceTable,
      sourceId: t.sourceId,
      displayName: t.displayName,
      reasonSelected: t.reasons,
      conversionPacketId: packetId,
      recruiterProfileId: Number(profile.id),
      suggestedMessage: outreachMessage(t),
      channel: t.channel,
      riskLevel: t.riskLevel,
      approvalStatus: 'requires_kingcam_approval',
      projectedSetupRevenueCents: cents(t.projectedSetupRevenueCents),
      projectedMrrCents: cents(t.projectedMrrCents),
      projectedRevenueLabel: 'projected_not_actual',
      actualRevenueCents: 0,
      actualRevenueSource: 'none_until_completed_transaction',
      noAutomatedOutreachSent: true,
    };
    const targetResult = await dailyCaller.addTargetCreator({
      date: today,
      handle: t.handle,
      platform: t.platform,
      recruiterProfileId: Number(profile.id),
      conversionPacketId: packetId,
      priorityScore: clamp(t.score),
      packagePriority: t.packagePriority,
      nextAction: `Operator review required before sending: ${outreachMessage(t).slice(0, 190)}`,
      nextActionDueAt: sqlDatePlusHours(t.score >= 85 ? 4 : 24),
      evidencePayload,
    });
    const pipelineId = Number(targetResult.pipeline?.id || 0);
    if (!pipelineId) throw new Error(`pipeline row missing for ${t.handle}`);
    report.pipelineRows += 1;
    await dailyCaller.recordStageEvent({
      pipelineId,
      nextStage: 'queued',
      eventType: 'outreach_review_queued',
      eventSource: 'operator_review_queue',
      nextAction: `Await KingCam approval; do not send automated outreach to ${t.displayName}.`,
      activationStatus: 'review_required',
      checkoutStatus: 'not_started',
      evidencePayload,
    });
    report.queuedForReview += 1;
    report.targets.push({
      rank: t.rank,
      displayName: t.displayName,
      handle: t.handle,
      platform: t.platform,
      sourceTable: t.sourceTable,
      sourceId: t.sourceId,
      recruiterProfileId: Number(profile.id),
      conversionPacketId: packetId,
      pipelineId,
      priorityScore: clamp(t.score),
      priorityBand: t.band,
      packagePriority: t.packagePriority,
      channel: t.channel,
      riskLevel: t.riskLevel,
      approvalStatus: 'requires_kingcam_approval',
      projectedSetupRevenueCents: cents(t.projectedSetupRevenueCents),
      projectedMrrCents: cents(t.projectedMrrCents),
      actualRevenueCents: 0,
      outreachSent: false,
    });
  }

  const [pipelineRows] = await conn.execute(`SELECT COUNT(*) AS c, COALESCE(SUM(real_revenue_cents),0) AS realRevenue, SUM(CASE WHEN real_revenue_cents <> 0 THEN 1 ELSE 0 END) AS nonZeroRevenueRows FROM daily_creator_pipeline WHERE DATE(created_at) = ? AND JSON_EXTRACT(evidence_payload, '$.source') = 'daily_revenue_first_20_real_targets'`, [today]);
  const [packetRows] = await conn.execute(`SELECT COUNT(*) AS c FROM creator_conversion_packets ccp JOIN recruiter_creator_profiles rcp ON rcp.id = ccp.profile_id WHERE JSON_EXTRACT(rcp.metadata, '$.feedRun') = 'daily_revenue_first_20_real_targets'`);
  const [eventRows] = await conn.execute(`SELECT COUNT(*) AS c FROM daily_creator_events WHERE event_type = 'outreach_review_queued' AND DATE(created_at) = ?`, [today]);
  const summaryPipeline = pipelineRows[0] || {};
  const summaryPackets = packetRows[0] || {};
  const summaryEvents = eventRows[0] || {};
  report.actualRevenueRowsWithNonZero = Number(summaryPipeline.nonZeroRevenueRows || 0);
  add('20 selected real production-source targets processed', report.targetCount === 20 && report.insertedProfiles === 20, { insertedProfiles: report.insertedProfiles });
  add('20 conversion packets generated through Conversion Engine', report.generatedPackets === 20 && Number(summaryPackets.c || 0) >= 20, { generatedPackets: report.generatedPackets, packetRows: Number(summaryPackets.c || 0) });
  add('20 Daily Revenue Engine pipeline rows created or updated', report.pipelineRows === 20 && Number(summaryPipeline.c || 0) >= 20, { pipelineRows: report.pipelineRows, queryRows: Number(summaryPipeline.c || 0) });
  add('20 outreach review queue events created with approval required', report.queuedForReview === 20 && Number(summaryEvents.c || 0) >= 20, { queuedForReview: report.queuedForReview, eventRowsToday: Number(summaryEvents.c || 0) });
  add('Actual revenue remains ledger-backed only and zero for queued prospects', Number(summaryPipeline.realRevenue || 0) === 0 && report.actualRevenueRowsWithNonZero === 0, { realRevenueCentsForFeedRows: Number(summaryPipeline.realRevenue || 0), nonZeroRevenueRows: report.actualRevenueRowsWithNonZero });
  add('No automated outreach was sent', report.outreachSent === false, { outreachSent: false, enforcement: 'queued for KingCam approval only' });
} finally {
  await conn.end();
}
report.passCount = report.checks.filter(c => c.pass).length;
report.failCount = report.checks.filter(c => !c.pass).length;
console.log(JSON.stringify(report, null, 2));
if (report.failCount > 0) process.exit(10);
