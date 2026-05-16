#!/usr/bin/env python3
from __future__ import annotations

import json
import math
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "artifacts" / "visual-drops" / "premium-assets"
MANIFEST = ROOT / "artifacts" / "visual-drops" / "vaultx-premium-asset-manifest.json"
LOGO_WHITE = ROOT / "assets" / "logo-white.png"
W, H = 1080, 1350
SAFE_MARGIN = 70
QUALITY_RULES = {
    "canvas": "1080x1350 portrait; optimized for Telegram feed preview and Instagram-style 3:4 posts.",
    "safeMarginPx": SAFE_MARGIN,
    "dominantHeroLines": "One dominant visual claim, maximum 3 hero lines, each fitted inside the safe column.",
    "copyDensity": "No raw output blocks; captions carry detail, images carry one premium claim plus proof modules.",
    "contrast": "Dark-luxury background with high-contrast white/gold/cyan/magenta foreground modules.",
    "brandSafety": "Business-safe creator monetization language; no explicit imagery and no platform-confusing spam design.",
    "footer": "Tracked CreatorVault/VaultX footer must remain inside the safe area and never collide with chip row.",
}

OBSIDIAN = (3, 4, 12)
WHITE = (248, 249, 255)
MUTED = (176, 178, 196)
VIOLET = (105, 64, 255)
MAGENTA = (255, 42, 150)
GOLD = (247, 194, 75)
GOLD_HI = (255, 226, 144)
CYAN = (61, 224, 255)
GREEN = (69, 245, 151)
RED = (255, 69, 88)

FONT_CANDIDATES = {
    "bold": [
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf",
    ],
    "regular": [
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ],
}

def font(size: int, bold: bool = False):
    for fp in FONT_CANDIDATES["bold" if bold else "regular"]:
        p = Path(fp)
        if p.exists():
            return ImageFont.truetype(str(p), size=size)
    return ImageFont.load_default()

F_MICRO = font(24, True)
F_TINY = font(30, True)
F_SMALL = font(36, True)
F_BODY = font(42, False)
F_BODY_B = font(42, True)
F_MED = font(54, True)
F_BIG = font(82, True)
F_HERO = font(116, True)
F_HERO2 = font(100, True)
F_HERO3 = font(88, True)

@dataclass
class Drop:
    id: str
    eyebrow: str
    hero: list[str]
    subline: str
    proof: list[tuple[str, str]]
    chips: list[str]
    caption_title: str
    caption_body: str
    reply_cta: str
    accent: tuple[int, int, int]
    mode: str

DROPS = [
    Drop(
        id="onlyfans_crusher_premium",
        eyebrow="ONLYFANS IS THE OLD PLAYBOOK",
        hero=["CRUSH", "ONLYFANS"],
        subline="OWN THE FANS. ROUTE THE MONEY.",
        proof=[("ONLYFANS", "rented attention"), ("VAULTX", "owned money loop")],
        chips=["PAID VAULTS", "VIP UPSELLS", "TELEGRAM", "TRACKED CLICKS"],
        caption_title="VaultX is built to crush OnlyFans dependence.",
        caption_body="OnlyFans can be a channel. VaultX is the owned money loop: creator content, Telegram pressure, paid vault unlocks, VIP escalation, reactivation, and tracked buyer paths inside your ecosystem.",
        reply_cta="Reply CRUSH if you want the next OnlyFans-killer proof drop.",
        accent=GOLD,
        mode="versus",
    ),
    Drop(
        id="telegram_pressure_engine_premium",
        eyebrow="THE PRESSURE ENGINE",
        hero=["TELEGRAM", "SELLS"],
        subline="TURN ATTENTION INTO BUYER PATHS.",
        proof=[("HOOK", "attention"), ("CLICK", "tracked"), ("VAULT", "locked"), ("VIP", "upsell")],
        chips=["FREE DROPS", "URGENCY", "DM REACTIVATION", "CLICK DATA"],
        caption_title="Telegram is not just a chat. It is the pressure engine.",
        caption_body="Your network already watches Telegram. VaultX turns that attention into timed hooks, tracked unlocks, VIP reminders, and repeatable paid actions without giant dead message blocks.",
        reply_cta="Reply AUTO if you want the automation angle opened next.",
        accent=CYAN,
        mode="flow",
    ),
    Drop(
        id="do_not_leave_the_vault_premium",
        eyebrow="KEEP EVERY EYE INSIDE",
        hero=["DO NOT", "LEAVE", "THE VAULT"],
        subline="GEMS DROP WHERE THE MONEY LIVES.",
        proof=[("CLONE AGENT", "execution"), ("AI REELS", "output"), ("VIP", "upsell"), ("ANALYTICS", "proof")],
        chips=["CLONE AGENT", "AI REELS", "VIP", "ANALYTICS"],
        caption_title="The platform has more than one money angle.",
        caption_body="VaultX is not just posts. It is Clone Agent execution, AI reels, locked content, VIP sheets, checkout links, creator acquisition, analytics, and retention loops in one ecosystem.",
        reply_cta="Reply GEM and stay locked for the next leak.",
        accent=MAGENTA,
        mode="grid",
    ),
    Drop(
        id="money_moments_loop_premium",
        eyebrow="MONEY PRINTER LOOP",
        hero=["CONTENT IN", "MONEY OUT"],
        subline="ONE ASSET. MULTIPLE PAID MOMENTS.",
        proof=[("TEASER", "hook"), ("UNLOCK", "sale"), ("UPSELL", "VIP"), ("FOLLOW-UP", "reactivate")],
        chips=["TEASER", "UNLOCK", "UPSELL", "FOLLOW-UP"],
        caption_title="VaultX packages content into revenue moments.",
        caption_body="One creator asset can become a teaser, visual hook, Telegram drop, locked vault item, VIP upgrade, and follow-up sequence. The point is to make every drop measurable, monetizable, and impossible to ignore.",
        reply_cta="Tap the vault link before this moves into VIP.",
        accent=GOLD_HI,
        mode="loop",
    ),
    Drop(
        id="inner_circle_leak_premium",
        eyebrow="INNER CIRCLE LEVERAGE",
        hero=["NEXT LEAK", "STAYS", "INSIDE"],
        subline="NO RANDOM HYPE. PLATFORM POWER.",
        proof=[("PRIVATE DROPS", "scarcity"), ("FOUNDER-LED", "trust"), ("EXCLUSIVE", "access"), ("VIP PATH", "money")],
        chips=["PRIVATE DROPS", "FOUNDER-LED", "EXCLUSIVE", "VIP PATH"],
        caption_title="This is CreatorVault-only leverage.",
        caption_body="Not recycled AI prompts. Not random explicit spam. These are branded creator-money systems built around your platform, your audience, and your monetization loop.",
        reply_cta="Reply VAULT if you are staying locked in.",
        accent=VIOLET,
        mode="memo",
    ),
]

def text_size(draw, text, fnt):
    b = draw.textbbox((0, 0), text, font=fnt)
    return b[2] - b[0], b[3] - b[1]

def rounded(draw, box, r, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)

def centered(draw, y, text, fnt, fill, stroke=0, stroke_fill=(0,0,0)):
    tw, th = text_size(draw, text, fnt)
    draw.text(((W - tw) / 2, y), text, font=fnt, fill=fill, stroke_width=stroke, stroke_fill=stroke_fill)
    return y + th

def gradient(accent):
    img = Image.new("RGB", (W, H), OBSIDIAN)
    px = img.load()
    glows = [(0.16,0.06,VIOLET,.95),(0.92,0.12,MAGENTA,.72),(0.72,0.96,accent,.74),(0.20,0.80,CYAN,.34)]
    for y in range(H):
        ny = y / H
        for x in range(W):
            nx = x / W
            r,g,b = OBSIDIAN
            for gx, gy, c, s in glows:
                d = math.hypot(nx-gx, ny-gy)
                v = max(0, 1 - d/.78) ** 2 * s
                r = min(255, r + int(c[0] * v * .32))
                g = min(255, g + int(c[1] * v * .32))
                b = min(255, b + int(c[2] * v * .32))
            vignette = max(0, math.hypot(nx-.5, ny-.52)-.20)
            px[x,y] = (int(r*(1-.72*vignette)), int(g*(1-.72*vignette)), int(b*(1-.72*vignette)))
    return img.filter(ImageFilter.GaussianBlur(.35)).convert("RGBA")

def add_texture(img, accent):
    layer = Image.new("RGBA", img.size, (0,0,0,0))
    d = ImageDraw.Draw(layer)
    for x in range(-H, W+H, 82):
        d.line((x, 0, x+H, H), fill=(255,255,255,8), width=1)
    for y in range(160, H-80, 94):
        d.line((70, y, W-70, y), fill=(*accent, 13), width=1)
    for r,a in [(430,18),(320,24),(210,34)]:
        d.ellipse((W/2-r, 162-r, W/2+r, 162+r), outline=(*accent,a), width=2)
    img.alpha_composite(layer)

def brand(img, d, accent):
    if LOGO_WHITE.exists():
        try:
            logo = Image.open(LOGO_WHITE).convert("RGBA")
            logo.thumbnail((205, 60))
            img.alpha_composite(logo, (72, 62))
        except Exception:
            d.text((70, 64), "CreatorVault", font=F_SMALL, fill=WHITE)
    else:
        d.text((70, 64), "CreatorVault", font=F_SMALL, fill=WHITE)
    d.text((70, 123), "VAULTX CREATOR MONEY SYSTEM", font=F_TINY, fill=GOLD_HI)
    rounded(d, (724, 54, 1010, 118), 31, (0,0,0,190), outline=(*accent,200), width=2)
    tw,_ = text_size(d, "LIVE MONEY SPRINT", F_MICRO)
    d.text((724 + (286-tw)/2, 73), "LIVE MONEY SPRINT", font=F_MICRO, fill=GOLD_HI)

def hero(img, d, drop):
    rounded(d, (172, 210, 908, 268), 29, (*drop.accent, 230), outline=(255,255,255,70), width=1)
    tw,_ = text_size(d, drop.eyebrow, F_TINY)
    d.text(((W-tw)/2, 225), drop.eyebrow, font=F_TINY, fill=WHITE)
    y = 322
    fnt = F_HERO if max(map(len, drop.hero)) <= 10 and len(drop.hero) <= 2 else (F_HERO2 if len(drop.hero) <= 2 else F_HERO3)
    for line in drop.hero:
        glow = Image.new("RGBA", img.size, (0,0,0,0))
        gd = ImageDraw.Draw(glow)
        tw,_ = text_size(gd, line, fnt)
        gd.text(((W-tw)/2, y), line, font=fnt, fill=(*drop.accent,130), stroke_width=4, stroke_fill=(*drop.accent,100))
        img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(10)))
        centered(d, y, line, fnt, WHITE, stroke=2, stroke_fill=(0,0,0))
        y += text_size(d, line, fnt)[1] + 16
    rounded(d, (142, y+18, 938, y+86), 34, (0,0,0,172), outline=(*drop.accent,150), width=2)
    tw,_ = text_size(d, drop.subline, F_SMALL)
    d.text(((W-tw)/2, y+36), drop.subline, font=F_SMALL, fill=GOLD_HI)
    return y + 122

def proof_cards(d, drop, top):
    items = drop.proof
    if drop.mode == "versus":
        boxes = [(90, top+22, 510, top+282, RED), (570, top+22, 990, top+282, GREEN)]
        for (title, sub), (x1,y1,x2,y2,c) in zip(items, boxes):
            rounded(d, (x1,y1,x2,y2), 42, (12,12,24,225), outline=(*c,210), width=4)
            d.text((x1+48, y1+62), title, font=F_MED, fill=c)
            d.text((x1+48, y1+132), sub.upper(), font=F_SMALL, fill=WHITE)
            d.line((x1+48, y2-54, x2-48, y2-54), fill=(*c,155), width=5)
        rounded(d, (468, top+114, 612, top+190), 38, (0,0,0,235), outline=GOLD_HI, width=3)
        centered(d, top+136, "VS", F_SMALL, GOLD_HI)
    else:
        cols = 2
        card_w, card_h = 410, 132
        gap_x, gap_y = 40, 32
        start_x = (W - (cols*card_w + gap_x)) // 2
        for i, (title, sub) in enumerate(items):
            x = start_x + (i % cols) * (card_w + gap_x)
            y = top + 18 + (i // cols) * (card_h + gap_y)
            rounded(d, (x,y,x+card_w,y+card_h), 34, (9,10,24,224), outline=(*drop.accent,170), width=3)
            d.text((x+34, y+26), title, font=F_SMALL, fill=WHITE)
            d.text((x+34, y+76), sub.upper(), font=F_MICRO, fill=GOLD_HI)

def fitted_font(draw, text, base_font, max_width, min_size=17):
    """Return a font sized down only when a label would overflow its pill."""
    font_path = next((fp for fp in FONT_CANDIDATES["bold"] if Path(fp).exists()), None)
    size = getattr(base_font, "size", 24)
    while font_path and size >= min_size:
        candidate = ImageFont.truetype(font_path, size)
        tw, _ = text_size(draw, text, candidate)
        if tw <= max_width:
            return candidate
        size -= 1
    return font(min_size, True)


def chips(d, drop):
    x1, x2 = 70, 1010
    y = 1110
    rounded(d, (x1, y-2, x2, y+118), 38, (0,0,0,118), outline=(*drop.accent,100), width=1)
    gap = 18
    left_pad = 28
    right_pad = 28
    chip_count = min(4, len(drop.chips))
    usable = (x2 - x1) - left_pad - right_pad - gap * (chip_count - 1)
    w = usable // chip_count
    for i, chip in enumerate(drop.chips[:chip_count]):
        cx = x1 + left_pad + i * (w + gap)
        pill = (cx, y+28, cx+w, y+76)
        rounded(d, pill, 24, (6,7,18,230), outline=(*drop.accent,190), width=2)
        font = fitted_font(d, chip, F_MICRO, w - 30, min_size=16)
        tw, th = text_size(d, chip, font)
        d.text((cx + (w-tw)/2, y + 28 + (48-th)/2 - 1), chip, font=font, fill=GOLD_HI)

def footer(d, accent):
    rounded(d, (70, 1240, 1010, 1294), 27, (0,0,0,190), outline=(*accent,120), width=2)
    d.text((104, 1257), "STAY LOCKED INSIDE CREATORVAULT / VAULTX", font=F_TINY, fill=WHITE)
    tw,_ = text_size(d, "TRACKED", F_TINY)
    d.text((976-tw, 1257), "TRACKED", font=F_TINY, fill=GOLD_HI)


def validate_drop_layout(drop):
    """Fail before rendering if any copy cannot fit the premium safe-area rules."""
    scratch = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(scratch)
    issues = []
    if not (1 <= len(drop.hero) <= 3):
        issues.append("hero must contain one to three dominant lines")
    hero_font = F_HERO if max(map(len, drop.hero)) <= 10 and len(drop.hero) <= 2 else (F_HERO2 if len(drop.hero) <= 2 else F_HERO3)
    for line in drop.hero:
        tw, _ = text_size(d, line, hero_font)
        if tw > W - SAFE_MARGIN * 2:
            issues.append(f"hero line overflows safe column: {line}")
    sub_w, _ = text_size(d, drop.subline, F_SMALL)
    if sub_w > 760:
        issues.append(f"subline too wide for central glass bar: {drop.subline}")
    for chip in drop.chips[:4]:
        chip_font = fitted_font(d, chip, F_MICRO, 190, min_size=16)
        chip_w, _ = text_size(d, chip, chip_font)
        if chip_w > 190:
            issues.append(f"chip label cannot fit even after fitting: {chip}")
    if any(token in (drop.caption_title + drop.caption_body + drop.reply_cta) for token in ("[object Object]", "undefined", "TODO", "Lorem ipsum")):
        issues.append("caption metadata contains raw-output or placeholder text")
    if issues:
        raise ValueError(f"Premium layout validation failed for {drop.id}: " + "; ".join(issues))
    return {
        "heroLineCount": len(drop.hero),
        "chipCount": min(4, len(drop.chips)),
        "safeMarginPx": SAFE_MARGIN,
        "mode": drop.mode,
    }


def validate_rendered_asset(path: Path, drop, layout_meta):
    """Verify generated PNGs meet hard size, contrast, and brand-readiness gates."""
    if not path.exists():
        raise FileNotFoundError(f"missing rendered premium asset: {path}")
    img = Image.open(path).convert("RGB")
    issues = []
    if img.size != (W, H):
        issues.append(f"expected {W}x{H}, got {img.size[0]}x{img.size[1]}")
    size_kb = path.stat().st_size / 1024
    if size_kb < 120:
        issues.append(f"asset file too small for premium rendered detail: {size_kb:.1f} KB")
    # Deterministic brightness spread check: premium images need both dark field and bright text/modules.
    sample = img.resize((54, 68))
    luminance = [0.2126*r + 0.7152*g + 0.0722*b for r, g, b in sample.getdata()]
    if max(luminance) - min(luminance) < 90:
        issues.append("insufficient luminance spread for Telegram-preview readability")
    if issues:
        raise ValueError(f"Rendered premium asset validation failed for {drop.id}: " + "; ".join(issues))
    return {
        **layout_meta,
        "width": W,
        "height": H,
        "fileSizeKb": round(size_kb, 1),
        "luminanceSpread": round(max(luminance) - min(luminance), 1),
        "verified": True,
    }


def render(drop, idx):
    layout_meta = validate_drop_layout(drop)
    img = gradient(drop.accent)
    add_texture(img, drop.accent)
    d = ImageDraw.Draw(img)
    brand(img, d, drop.accent)
    top = hero(img, d, drop)
    proof_cards(d, drop, top)
    chips(d, drop)
    footer(d, drop.accent)
    out = OUT_DIR / f"{drop.id}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(out, quality=97, optimize=True)
    return out, validate_rendered_asset(out, drop, layout_meta)

def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "generator": "scripts/build-vaultx-premium-assets.py",
        "productionMode": "deterministic_code_design_no_ai_image_generation",
        "audience": "Creators and founder network interested in business-safe monetization infrastructure, paid vaults, VIP upsells, Telegram automation, and OnlyFans alternative positioning.",
        "qualityStandard": "Premium dark-luxury creator monetization campaign, high-contrast Telegram-readable typography, explicit OnlyFans positioning where relevant, no explicit imagery.",
        "layoutQualityGate": QUALITY_RULES,
        "drops": [],
    }
    for i, drop in enumerate(DROPS):
        path, asset_quality = render(drop, i)
        manifest["drops"].append({
            "id": drop.id,
            "headline": drop.caption_title,
            "body": drop.caption_body,
            "replyCta": drop.reply_cta,
            "assetPath": str(path.relative_to(ROOT)),
            "audienceAngle": "business_safe_creator_monetization",
            "competitivePositioning": "OnlyFans" if "OnlyFans" in (drop.caption_title + drop.caption_body + " ".join(drop.hero)) else "CreatorVault/VaultX retention",
            "layoutQuality": asset_quality,
        })
    MANIFEST.write_text(json.dumps(manifest, indent=2))
    print(json.dumps({"manifest": str(MANIFEST), "assetCount": len(manifest["drops"]), "assets": [d["assetPath"] for d in manifest["drops"]]}, indent=2))

if __name__ == "__main__":
    main()
