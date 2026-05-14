# Controlled Trailer Validation Report

**Overall result:** PASS

**Proof directory:** `/root/creatorvault/testing/controlled-trailer-proof/20260508T043042Z`
**Final MP4:** `/root/creatorvault/testing/controlled-trailer-proof/20260508T043042Z/creatorvault-controlled-grounded-trailer.mp4`
**SHA-256:** `e8246e39fa330b16a4febf0a08c3e5228291e664000e3d95f45e8b3a0255d31c`

| Check | Result | Detail |
|---|---:|---|
| proof directory exists | PASS | /root/creatorvault/testing/controlled-trailer-proof/20260508T043042Z |
| final MP4 exists | PASS | /root/creatorvault/testing/controlled-trailer-proof/20260508T043042Z/creatorvault-controlled-grounded-trailer.mp4 |
| final MP4 non-empty | PASS | 7998980 bytes |
| MP4 ffprobe readable | PASS | {<br>    "streams": [<br>        {<br>            "index": 0,<br>            "codec_name": "h264",<br>            "codec_long_name": "H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10",<br>            "profile": "High",<br>            "codec_type": "video",<br>            "codec_tag_string": "avc1",<br>            "codec_tag": "0x31637661",<br>            "width": 1080,<br>            "height": 1920,<br>            "coded_width": 1080,<br>            "coded_height": 1920,<br>            "closed_captions": 0,<br>            "film_grain": 0,<br>        |
| vertical 1080x1920 video | PASS | 1080x1920 |
| H.264 video codec | PASS | h264 |
| AAC audio stream present | PASS | aac |
| runtime approximately 30 seconds | PASS | 30.023s |
| contact sheet generated from actual MP4 frames | PASS | /root/creatorvault/testing/controlled-trailer-proof/20260508T043042Z/creatorvault-controlled-grounded-trailer-contact-sheet.jpg (44166 bytes) |
| asset-manifest.json exists | PASS | /root/creatorvault/testing/controlled-trailer-proof/20260508T043042Z/reports/asset-manifest.json |
| asset-manifest.json valid JSON | PASS | parsed |
| source-manifest.json exists | PASS | /root/creatorvault/testing/controlled-trailer-proof/20260508T043042Z/reports/source-manifest.json |
| source-manifest.json valid JSON | PASS | parsed |
| scene-manifest.json exists | PASS | /root/creatorvault/testing/controlled-trailer-proof/20260508T043042Z/reports/scene-manifest.json |
| scene-manifest.json valid JSON | PASS | parsed |
| timeline.json exists | PASS | /root/creatorvault/testing/controlled-trailer-proof/20260508T043042Z/reports/timeline.json |
| timeline.json valid JSON | PASS | parsed |
| render-summary.json exists | PASS | /root/creatorvault/testing/controlled-trailer-proof/20260508T043042Z/reports/render-summary.json |
| render-summary.json valid JSON | PASS | parsed |
| no disallowed-content tokens in manifests | PASS | none |
| approved CreatorVault/KingCam terminology present | PASS | {"CreatorVault": true, "KingCam": true, "creatorvault.live": true} |
| six deterministic scenes present | PASS | 6 |
| each scene has manifest content | PASS | missing=[] |
| scene durations sum near 30 seconds | PASS | durations=[5.0, 5.0, 5.0, 5.0, 5.0, 5.0], sum=30.0 |
| referenced real local assets resolve | PASS | resolved=20, missing=[] |
| logo/brand asset referenced in manifests | PASS | /root/creatorvault/client/public/images/clone-ambassador.webp; /root/creatorvault/client/public/images/reel/reel-creator-promo.png; /root/creatorvault/client/public/images/reel/reel-product-drop.png; /root/creatorvault/client/public/videos/hero-cam.mp4; /root/creatorvault/client/public/videos/kingcam-clone-2.mp4; /root/creatorvault/client/public/videos/kingcam-hero-cam.mp4; /root/creatorvault/testing/controlled-trailer-proof/20260508T043042Z/segments/scene_01.mp4; /root/creatorvault/testing/controlled-trailer-proof/20260508T043042Z/segments/scene_02.mp4; /root/creatorvault/testing/controlled-trailer-proof/20260508T043042Z/segments/scene_03.mp4; /root/creatorvault/testing/controlled-trailer-proof/20260508T043042Z/segments/scene_04.mp4 |
| thumbnail exists | PASS | /root/creatorvault/testing/controlled-trailer-proof/20260508T043042Z/creatorvault-controlled-grounded-trailer-thumb.jpg |
| live homepage HTTP 200 after render test | PASS | 200 0.032801 |
| PM2 app remains online after render test | PASS | at least one PM2 process online |
