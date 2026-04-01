# CREATORVAULT VAULTLIVE AUDIT & ACTIVATION PLAN

## 1. EXISTING STATE AUDIT
**The Reality:** VaultLive exists in the codebase as a massive, fragmented collection of 4 different backend routers and 6 different frontend pages. It is partially wired to the database but completely disconnected from the actual streaming infrastructure. It is currently a placeholder, not a functional control room.

**Backend Routers Found (1,543 lines total):**
- `vaultLive.ts` (377 lines) - Basic stream creation, tipping, viewer counting.
- `vaultLiveEnhanced.ts` (538 lines) - Affiliate programs, live shopping stubs.
- `vaultliveProRouter.ts` (578 lines) - Multi-stream, RTMP destination management, chat aggregation.
- `liveSessionScheduler.ts` (50 lines) - Scheduling stubs.

**Frontend Pages Found (1,299 lines total):**
- `VaultLiveSimple.tsx` - The currently active page. A basic form with "Go Live" button that just creates a DB record. No video preview. No RTMP generation.
- `VaultLiveDashboard.tsx`, `VaultLiveStream.tsx`, `BrowseLive.tsx`, `JoinVaultLive.tsx` - Various disconnected UI shells.
- `VaultLive.tsx` - A 12-line stub saying "Feature coming soon...".

**Database Schema:**
- `live_streams`, `live_stream_viewers`, `live_stream_tips`, `live_stream_donations` exist and are functional.
- Migration 015 (`vaultlive_destinations`, `vaultlive_chat_messages`) exists for multi-platform restreaming but is not fully integrated.

**Streaming Infrastructure:**
- **MISSING:** There is no media server (like Mux, Livepeer, Agora, or a custom NGINX-RTMP setup) configured in the `.env` to actually receive and broadcast video.
- **STUBBED:** The RTMP URLs in `vaultliveProRouter.ts` (e.g., `rtmp://a.rtmp.youtube.com/live2`) are hardcoded strings. The platform cannot currently push a stream to them without a media engine.

## 2. DESTINATION SUPPORT MODEL
Since CreatorVault does not currently have a dedicated media server to ingest a single stream and restream it to multiple destinations (like Restream.io), the V1 model must be:
- **Primary:** Custom RTMP. The creator uses OBS/Streamlabs and pastes the destination RTMP URL and Stream Key directly into their encoder. CreatorVault acts as the Control Room to manage the metadata, chat, and monetization, while the actual video pipeline runs through the creator's encoder to the destination.
- **Future (V2):** Integrate Mux or Livepeer to allow CreatorVault to ingest the stream directly from the browser (WebRTC) and restream it via RTMP to YouTube, Twitch, etc.

## 3. TECHNICAL GAP ANALYSIS
- **Gap 1: Media Ingest.** The browser cannot natively push RTMP. To have a "Go Live" button in the browser that actually broadcasts, we need WebRTC-to-RTMP infrastructure (Mux/Livepeer).
- **Gap 2: Multi-Restreaming Engine.** The `vaultliveProRouter` assumes the VPS can restream to multiple platforms, but no FFmpeg/NGINX-RTMP service is running on the VPS to handle this heavy lifting.
- **Gap 3: UI Fragmentation.** 6 different pages need to be consolidated into one `VaultLiveControlRoom.tsx`.

## 4. UX ARCHITECTURE (THE CONTROL ROOM)
The Control Room will be a 3-zone spatial layout (matching the visual-first standard):
1. **Left Rail (Setup):** Destination Manager (add YouTube, Twitch, Custom RTMP), Stream Metadata (Title, Category), Go Live button.
2. **Center Canvas (Preview/Live):** The video player. In V1, this will show a placeholder instructing the user to start their encoder (OBS), or a WebRTC preview if we integrate a basic camera feed for local recording.
3. **Right Rail (Engagement & Money):** Unified Chat, Tip/Donation feed, Pinned Marketplace Products, Pinned University Lessons.

## 5. ACTIVATION PLAN & V1 SHIP LIST
To make VaultLive **REAL** (actual money touching actual hands) without getting bogged down in building a custom restreaming media server from scratch:

**Phase 1: The Control Room UI (Visual-First)**
- Consolidate the 6 fragmented pages into `VaultLiveControlRoom.tsx`.
- Build the 3-zone layout (Setup, Canvas, Engagement).
- Implement the Destination Manager (save RTMP URLs/Keys to DB).

**Phase 2: The OBS/Encoder Bridge (V1 Reality)**
- Instead of faking browser-based broadcasting, we embrace OBS.
- The Control Room generates a unique "CreatorVault Stream Key".
- The creator streams to CreatorVault (requires setting up NGINX-RTMP on the VPS) OR the creator streams directly to YouTube/Twitch, and CreatorVault acts as the engagement/monetization dashboard.
- *Decision:* For immediate V1 reality, CreatorVault acts as the Monetization & Chat Dashboard. The creator streams to their destination (e.g., YouTube), embeds the YouTube player in the CreatorVault Canvas, and uses the Right Rail to drive tips, product sales, and course signups from their CreatorVault audience.

**Phase 3: Prominent Surfacing**
- Add VaultLive and VaultSnap prominently to the DashboardLayout navigation.
- Add "Live Now" indicators to the Social Feed and Creator Profile.

## 6. BLOCKERS & ASSUMPTIONS
- **Blocker:** Real browser-based multi-streaming requires a paid third-party service (Mux/Livepeer) or a heavy custom NGINX-RTMP/FFmpeg setup on the VPS.
- **Assumption:** The V1 goal is to have a premium control room where creators can manage their stream metadata, chat, and monetization, even if the actual video encoding is handled by OBS.
