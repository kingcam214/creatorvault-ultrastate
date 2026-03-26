"""
Leslie (Princesa De Africa) — Missed Revenue Calculator
TikTok: @princesadeafrica — 1,032 followers, 26K likes (2.52% engagement)
Instagram: @negriitax3 — 4,945 followers, 362 posts
Former Fansly: minimal revenue (essentially $0)
Adult content creator, fit body, NEVER done fitness content
Based in Colombia/DR, targeting English-speaking gringos
"""

# ============================================================
# PLATFORM DATA
# ============================================================
tiktok_followers = 1032
tiktok_likes = 26000
ig_followers = 4945
ig_posts = 362
months_inactive = 24  # 2 years of not monetizing properly

# ============================================================
# 1. FANSLY / ADULT CONTENT — What she was leaving on the table
# ============================================================
# With her look and 6,977 combined followers, conservative estimate:
# - Fansly avg for someone with her profile: $200-800/mo if properly marketed
# - She was making ~$0-50/mo (her own account was "hardly making anything")
# - Properly marketed with Tinder funnel + Telegram: $500-1500/mo
fansly_actual_monthly = 25  # what she was making
fansly_potential_monthly = 750  # conservative with proper funnel
fansly_missed_monthly = fansly_potential_monthly - fansly_actual_monthly
fansly_missed_24mo = fansly_missed_monthly * months_inactive

# ============================================================
# 2. VAULTX — New platform, premium pricing
# ============================================================
# $39.99/mo subscription
# With Tinder funnel targeting gringos: 15-25 subs is realistic in 6 months
# Missed 24 months of building this
vaultx_price = 39.99
vaultx_realistic_subs_now = 20  # if she had started 24 months ago
vaultx_monthly_now = vaultx_price * vaultx_realistic_subs_now
# Ramp: 0 → 5 → 10 → 15 → 20 subs over 24 months, avg 10 subs
vaultx_avg_subs = 10
vaultx_missed_24mo = vaultx_price * vaultx_avg_subs * months_inactive

# ============================================================
# 3. TIKTOK CREATOR FUND + LIVE GIFTS
# ============================================================
# 1,032 followers — can't monetize TikTok directly yet (need 10K)
# BUT: TikTok LIVE gifts with 1K followers is possible
# Average LIVE creator with 1K followers: $50-200/month in gifts
# She's not going live at all
tiktok_live_monthly = 75  # conservative
tiktok_live_missed = tiktok_live_monthly * months_inactive

# TikTok Creator Fund kicks in at 10K followers
# If she had been posting consistently, she'd have 10K+ by now
# Missing out on Creator Fund: ~$20-50/mo at 10K followers
tiktok_fund_missed = 35 * 12  # 1 year of Creator Fund she should have by now

# ============================================================
# 4. INSTAGRAM — Brand deals, collab posts, affiliate
# ============================================================
# 4,945 IG followers with 362 posts = she's been posting but not monetizing
# Micro-influencer brand deals at 5K followers: $100-500 per post
# She could do 2-3 brand deals per month (fashion, beauty, lifestyle)
# Conservative: 1 deal/month at $150
ig_brand_deal_monthly = 150
ig_brand_missed = ig_brand_deal_monthly * months_inactive

# Instagram affiliate (fashion nova, SHEIN links): $50-200/mo
ig_affiliate_monthly = 75
ig_affiliate_missed = ig_affiliate_monthly * months_inactive

# ============================================================
# 5. SEXY FITNESS CONTENT — The untapped lane
# ============================================================
# She has a fit body and has NEVER done fitness content
# Sexy fitness is one of the highest-engagement niches on TikTok/IG
# If she had started 24 months ago:
# - Fitness coaching packages: $97-297/mo
# - Workout guides: $25-50 one-time
# - Brand deals with fitness brands: $200-500/deal
# Conservative: 2 workout guide sales/month + 1 fitness brand deal/quarter
fitness_guide_monthly = 2 * 35  # 2 guides at $35
fitness_brand_quarterly = 300
fitness_monthly = fitness_guide_monthly + (fitness_brand_quarterly / 3)
fitness_missed = fitness_monthly * months_inactive

# ============================================================
# 6. WHATSAPP + TELEGRAM — Paid communities
# ============================================================
# Telegram paid channel: $9.99/mo
# With her following, conservative 30 paying members
# She has NO paid community right now
telegram_price = 9.99
telegram_members = 30
telegram_monthly = telegram_price * telegram_members
telegram_missed = telegram_monthly * months_inactive

# ============================================================
# TOTALS
# ============================================================
total_missed = (
    fansly_missed_24mo +
    vaultx_missed_24mo +
    tiktok_live_missed +
    tiktok_fund_missed +
    ig_brand_missed +
    ig_affiliate_missed +
    fitness_missed +
    telegram_missed
)

monthly_potential_now = (
    vaultx_monthly_now +
    tiktok_live_monthly +
    ig_brand_deal_monthly +
    ig_affiliate_monthly +
    fitness_monthly +
    telegram_monthly
)

print("=" * 60)
print("LESLIE (PRINCESA DE AFRICA) — MISSED REVENUE REPORT")
print("=" * 60)
print(f"\nTikTok: @princesadeafrica — {tiktok_followers:,} followers, {tiktok_likes:,} likes")
print(f"Instagram: @negriitax3 — {ig_followers:,} followers, {ig_posts} posts")
print(f"Fansly: Was making ~${fansly_actual_monthly}/month (essentially nothing)")
print(f"Period analyzed: {months_inactive} months\n")

print("MISSED REVENUE BY VERTICAL:")
print(f"  Adult Content (Fansly properly marketed): ${fansly_missed_24mo:,.0f}")
print(f"  VaultX (Tinder funnel → $39.99/mo subs):  ${vaultx_missed_24mo:,.0f}")
print(f"  TikTok LIVE Gifts (not going live):        ${tiktok_live_missed:,.0f}")
print(f"  TikTok Creator Fund (not at 10K yet):      ${tiktok_fund_missed:,.0f}")
print(f"  Instagram Brand Deals (not pitching):      ${ig_brand_missed:,.0f}")
print(f"  Instagram Affiliate Links:                 ${ig_affiliate_missed:,.0f}")
print(f"  Sexy Fitness Content (never tried):        ${fitness_missed:,.0f}")
print(f"  Telegram Paid Community:                   ${telegram_missed:,.0f}")
print(f"\n{'='*60}")
print(f"  TOTAL MISSED IN 24 MONTHS:                ${total_missed:,.0f}")
print(f"  MONTHLY AVERAGE MISSED:                   ${total_missed/months_inactive:,.0f}")
print(f"  DAILY AVERAGE MISSED:                     ${total_missed/(months_inactive*30):,.0f}")
print(f"\n  WHAT SHE CAN MAKE STARTING NOW/MONTH:    ${monthly_potential_now:,.0f}")
print(f"  WHAT SHE CAN MAKE STARTING NOW/YEAR:     ${monthly_potential_now*12:,.0f}")
print("=" * 60)

# Per-vertical breakdown for the dashboard
print("\nDASHBOARD DATA:")
verticals = [
    ("Adult Content / Fansly", fansly_missed_24mo, "Get on VaultX with Tinder funnel. $39.99/mo subs from gringos."),
    ("VaultX Subscriptions", vaultx_missed_24mo, "Tinder → WhatsApp → Telegram → VaultX. 20 subs = $800/mo."),
    ("TikTok LIVE Gifts", tiktok_live_missed, "Go LIVE 3x/week. 1K followers can earn $75-200/mo in gifts."),
    ("TikTok Creator Fund", tiktok_fund_missed, "Post 5x/day to hit 10K followers. Creator Fund pays at 10K."),
    ("Instagram Brand Deals", ig_brand_missed, "4,945 followers qualifies for micro-influencer deals. Pitch SHEIN, Fashion Nova."),
    ("Instagram Affiliate", ig_affiliate_missed, "Add affiliate links to every post. Fashion Nova pays 10-20% commission."),
    ("Sexy Fitness Content", fitness_missed, "Fit body + fitness content = one of the highest-paying TikTok niches. Never tried it."),
    ("Telegram Paid Community", telegram_missed, "$9.99/mo. 30 members = $300/mo. She has 0 paid community."),
]
for name, amount, fix in verticals:
    pct = (amount / total_missed) * 100
    print(f"  {name}: ${amount:,.0f} ({pct:.1f}%) — {fix}")
