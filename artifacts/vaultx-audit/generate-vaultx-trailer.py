from __future__ import annotations

import math
import shutil
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path('/home/ubuntu/creatorvault-main-deployfix')
OUT_DIR = ROOT / 'client/public/videos'
FRAME_DIR = ROOT / 'artifacts/vaultx-audit/vaultx_trailer_frames'
MP4_OUT = OUT_DIR / 'vaultx-cinematic-trailer.mp4'
POSTER_OUT = OUT_DIR / 'vaultx-cinematic-trailer-poster.png'

W, H = 1280, 720
FPS = 18
SCENE_SECONDS = 3.2
SCENES = [
    ('VAULTX', 'THE VIDEO-FIRST CREATOR OS', 'A cinematic walkthrough of the platform adult and premium creators wish already existed.', '18+ SAFE PUBLIC PREVIEW', (239, 68, 68)),
    ('01 · INGEST', 'DROP IN THE RAW ASSETS', 'Camera roll clips, premium vault media, captions, scripts, and creator context enter one operating system.', 'UPLOAD ONCE', (236, 72, 153)),
    ('02 · CINEMATIC AI', 'TURN FOOTAGE INTO DESIRE-GRADE DROPS', 'Trailer concepts, shot plans, relighting, pacing, captions, thumbnails, and safe variants move through the factory.', 'MODEL STACK READY', (147, 51, 234)),
    ('03 · ADULT CREATOR ADVANTAGE', 'SAFE TEASE. PRIVATE UNLOCK.', 'Blurred previews, PPV teasers, clip extraction, and paid sequences branch from one master asset.', 'SFW + PREMIUM BRANCHING', (245, 158, 11)),
    ('04 · ATTENTION ENGINEERING', 'HOOKS, DEAD ZONES, PACING, MONEY SIGNALS', 'VaultX scores what keeps attention and what moves fans from watching to buying.', 'RETENTION TO REVENUE', (248, 113, 113)),
    ('05 · DISTRIBUTION DOMINANCE', 'ONE MASTER CLIP BECOMES A CAMPAIGN', 'Vertical cuts, stories, captions, hashtags, Telegram drops, fan messages, and platform-native exports deploy together.', 'UPLOAD ONCE · DOMINATE EVERYWHERE', (56, 189, 248)),
    ('06 · MONETIZATION INTELLIGENCE', 'THE EDITOR BECOMES THE PROFIT ENGINE', 'Pricing, teaser-to-paywall sequencing, VIP upsells, churn recovery, and analytics connect creative decisions to income.', 'CONTENT → REVENUE LOOP', (251, 191, 36)),
    ('VAULTX TRAILER MAKER', 'BUILT TO LEAD THE AI TRAILER LANE', 'Script agents, caption agents, model orchestration, cinematic render queues, and export rails become a real video factory.', 'FACTORY MODE', (217, 70, 239)),
    ('ENTER VAULTX', 'ALIVE. AUTOMATED. VIDEO FIRST.', 'The public page is the trailer. The product is the machine. The mission is creator leverage at impossible speed.', 'BUILD MY VAULT', (239, 68, 68)),
]
TOTAL_FRAMES = int(len(SCENES) * SCENE_SECONDS * FPS)


def font(size: int, bold: bool = False):
    p = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    return ImageFont.truetype(p, size) if Path(p).exists() else ImageFont.load_default()

F_HERO, F_TITLE, F_BODY, F_SMALL, F_TINY, F_METRIC = font(66, True), font(50, True), font(27), font(20, True), font(15, True), font(22, True)


def ease(x: float) -> float:
    x = max(0, min(1, x))
    return 1 - (1 - x) ** 3


def wrap(draw, text, fnt, max_width):
    words, lines, cur = text.split(), [], ''
    for w in words:
        test = f'{cur} {w}'.strip()
        if draw.textbbox((0, 0), test, font=fnt)[2] <= max_width:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def rr(d, xy, r, fill, outline=None, width=1):
    d.rounded_rectangle(xy, radius=r, fill=fill, outline=outline, width=width)


def base_background(accent, frame_idx):
    img = Image.new('RGBA', (W, H), (3, 3, 6, 255))
    d = ImageDraw.Draw(img)
    for y in range(0, H, 3):
        t = y / H
        color = (int(5 + accent[0] * (0.16 * (1 - t))), int(5 + accent[1] * 0.09), int(9 + accent[2] * (0.12 + 0.05 * t)), 255)
        d.rectangle((0, y, W, y + 3), fill=color)
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((-120 + int(55 * math.sin(frame_idx * .03)), -110, 540, 470), fill=(*accent, 96))
    gd.ellipse((760, -120 + int(50 * math.cos(frame_idx * .025)), 1430, 430), fill=(236, 72, 153, 58))
    gd.ellipse((390, 440, 1130, 930), fill=(147, 51, 234, 48))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(72)))
    d = ImageDraw.Draw(img)
    for gx in range(-80, W + 80, 80):
        x = gx + int((frame_idx * .9) % 80)
        d.line((x, 58, x, H - 58), fill=(255, 255, 255, 11), width=1)
    for gy in range(58, H - 58, 80):
        d.line((0, gy, W, gy), fill=(255, 255, 255, 8), width=1)
    d.rectangle((0, 0, W, 58), fill=(0, 0, 0, 118))
    d.rectangle((0, H - 58, W, H), fill=(0, 0, 0, 118))
    return img


def draw_frame(frame_idx):
    scene_idx = min(len(SCENES) - 1, int(frame_idx / (SCENE_SECONDS * FPS)))
    eyebrow, title, body, metric, accent = SCENES[scene_idx]
    local = (frame_idx - scene_idx * SCENE_SECONDS * FPS) / (SCENE_SECONDS * FPS)
    vis = min(ease(local / .24), ease((1 - local) / .18))
    img = base_background(accent, frame_idx)
    d = ImageDraw.Draw(img)
    alpha = lambda n: int(n * vis)

    d.text((86, 28), 'VAULTX · CINEMATIC PRODUCT WALKTHROUGH', font=F_TINY, fill=(255, 255, 255, 155))
    d.text((1040, 28), f'{scene_idx + 1:02d}/{len(SCENES):02d}', font=F_TINY, fill=(255, 255, 255, 155))

    text_x = int(86 - 34 * (1 - vis))
    d.text((text_x, 150), eyebrow, font=F_SMALL, fill=(*accent, alpha(255)))
    title_font = F_HERO if len(title) < 28 else F_TITLE
    y = 192
    for line in wrap(d, title, title_font, 570)[:3]:
        d.text((text_x, y), line, font=title_font, fill=(255, 248, 240, alpha(255)))
        y += title_font.size + 5
    y += 18
    for line in wrap(d, body, F_BODY, 560)[:4]:
        d.text((text_x, y), line, font=F_BODY, fill=(224, 224, 232, alpha(220)))
        y += 39
    rr(d, (text_x, 568, text_x + 438, 622), 27, (*accent, alpha(64)), (*accent, alpha(150)), 2)
    d.text((text_x + 24, 583), metric, font=F_METRIC, fill=(255, 255, 255, alpha(245)))

    card_x = int(720 + 42 * (1 - vis))
    rr(d, (card_x, 118, 1180, 596), 34, (10, 10, 16, alpha(214)), (255, 255, 255, alpha(40)), 2)
    rr(d, (card_x + 26, 150, 1154, 374), 24, (255, 255, 255, alpha(18)), (255, 255, 255, alpha(42)), 1)
    d.rectangle((card_x + 26, 150, 1154, 374), fill=(0, 0, 0, alpha(55)))
    scan_x = card_x + 26 + int(400 * ((frame_idx % 72) / 72))
    d.rectangle((scan_x, 150, scan_x + 18, 374), fill=(255, 255, 255, alpha(30)))
    for i in range(7):
        x0 = card_x + 52 + i * 60
        h = 44 + int(86 * abs(math.sin(frame_idx * 0.08 + i)))
        rr(d, (x0, 322 - h, x0 + 36, 330), 8, (*accent, alpha(95 + i * 10)))
    d.ellipse((card_x + 161, 218, card_x + 249, 306), fill=(255, 255, 255, alpha(34)), outline=(255, 255, 255, alpha(80)), width=2)
    d.polygon([(card_x + 194, 238), (card_x + 194, 286), (card_x + 232, 262)], fill=(255, 255, 255, alpha(215)))
    labels = ['SCRIPT', 'SHOT PLAN', 'CAPTIONS', 'SAFE CUT', 'EXPORT', 'REVENUE']
    for i, label in enumerate(labels):
        yy = 408 + i * 28
        progress = .45 + .55 * ((math.sin(frame_idx * .06 + i * .7) + 1) / 2)
        d.text((card_x + 32, yy), label, font=F_TINY, fill=(255, 255, 255, alpha(125)))
        rr(d, (card_x + 150, yy + 4, card_x + 420, yy + 16), 6, (255, 255, 255, alpha(18)))
        rr(d, (card_x + 150, yy + 4, card_x + 150 + int(270 * progress), yy + 16), 6, (*accent, alpha(172)))

    rail_x, rail_y, rail_w = 86, 666, 1108
    rr(d, (rail_x, rail_y, rail_x + rail_w, rail_y + 8), 4, (255, 255, 255, 30))
    rr(d, (rail_x, rail_y, rail_x + int(rail_w * ((frame_idx + 1) / TOTAL_FRAMES)), rail_y + 8), 4, (*accent, 190))
    for i, s in enumerate(SCENES):
        cx = rail_x + int(rail_w * i / (len(SCENES) - 1))
        d.ellipse((cx - 5, rail_y - 5, cx + 5, rail_y + 13), fill=(*s[4], 220 if i <= scene_idx else 56))
    return img.convert('RGB')


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if FRAME_DIR.exists():
        shutil.rmtree(FRAME_DIR)
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    for i in range(TOTAL_FRAMES):
        frame = draw_frame(i)
        if i == 10:
            frame.save(POSTER_OUT, quality=94)
        frame.save(FRAME_DIR / f'frame_{i:05d}.jpg', quality=88)
        if i % 90 == 0:
            print(f'rendered {i}/{TOTAL_FRAMES}', flush=True)
    subprocess.run([
        'ffmpeg', '-y', '-framerate', str(FPS), '-i', str(FRAME_DIR / 'frame_%05d.jpg'),
        '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000', '-shortest',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart',
        '-c:a', 'aac', '-b:a', '96k', str(MP4_OUT)
    ], check=True)
    print(MP4_OUT)
    print(POSTER_OUT)

if __name__ == '__main__':
    main()
