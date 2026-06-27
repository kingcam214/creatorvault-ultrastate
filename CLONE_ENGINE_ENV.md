# Clone Engine — Required Environment Variables

Add these to your VPS `.env` file and Railway/deployment dashboard.

## Already Configured (from existing VaultX wiring)
```
REPLICATE_API_TOKEN=         # Replicate API token — used for FluxDevCam image gen + LoRA training
REPLICATE_CLONE_MODEL_ID=kingcam214/fluxdevcam
REPLICATE_CLONE_VERSION=e8074c4eeec195ad8ab617bf1502cd0c297db7f2c1cf5d9a665fad4710468727
REPLICATE_CLONE_TRIGGER_WORD=fluxdevCam
POLLO_API_KEY=               # Pollo.ai API key — used for image-to-video
ELEVENLABS_API_KEY=          # ElevenLabs API key — used for voice clone synthesis
KINGCAM_ELEVEN_VOICE_ID=rwc11bXCBw5KydM4avHE
KINGCAM_CLONE_IMAGE_URL=     # Default clone source image URL for talking head generation
OPENAI_API_KEY=              # OpenAI — used for expansion plan + AI persona
```

## New Providers (add to unlock full multi-provider routing)
```
# Runway Gen-3 Alpha Turbo — cinematic image-to-video
RUNWAY_API_KEY=              # Get from: https://app.runwayml.com/settings/api

# Luma Dream Machine — photorealistic image-to-video
LUMA_API_KEY=                # Get from: https://lumalabs.ai/dream-machine/api

# MiniMax Video-01 — subject-consistent image-to-video
MINIMAX_API_KEY=             # Get from: https://platform.minimaxi.com/
```

## How Provider Status Works
The `cloneEngine.getProviders` endpoint checks each env var at runtime:
- If the key is set → provider shows as `active` (green badge in UI)
- If the key is missing → provider shows as `unconfigured` (red badge, disabled in UI)

You can add providers incrementally — the platform degrades gracefully.

## Priority Order (automatic fallback)
1. Pollo v1.6 (lowest cost, fastest)
2. Runway Gen-3 (highest quality cinematic)
3. Luma Dream Machine (photorealistic)
4. MiniMax Video-01 (best identity consistency)
