# CreatorVault and VaultX Official Social-Platform Integration Architecture

**Author:** Manus AI  
**Date:** 2026-06-10  
**Scope:** TikTok, Instagram, and Facebook official developer integrations for CreatorVault and VaultX.

## Executive architecture position

CreatorVault and VaultX should treat TikTok, Instagram, and Facebook as an **official social distribution layer**, not as scraped or unofficial automation. The right production direction is to create a platform integration spine that supports creator identity, OAuth consent, connected account inventory, public-media hosting, publish-intent jobs, webhook receipts, analytics ingestion, and creator-facing readiness checks. Direct posting should remain feature-gated until each official developer app is approved and production credentials are installed securely.

> **Operating rule:** CreatorVault should only publish, schedule, analyze, or ingest social-platform data through official TikTok and Meta products, user-granted OAuth permissions, platform app review, and documented rate limits.

This keeps the platform powerful while protecting it from account bans, rejected app reviews, token leakage, and unstable unofficial workflows. It also creates the right foundation for VaultX’s creator monetization engine: Body Cinema packages can become platform-ready post jobs, with receipts, limits, review status, and creator account requirements visible before any content is sent.

## Platform capability map

| Platform | Official product lane | CreatorVault/VaultX use | Approval and eligibility gates | Immediate implementation status |
|---|---|---|---|---|
| TikTok | Login Kit for Web | Creator login, identity linking, profile/stat scopes, account connection receipts | Registered TikTok developer app, HTTPS redirect URI, state protection, secure client secret handling | Build OAuth-ready configuration and callback foundation, but keep live login disabled until credentials are present. |
| TikTok | Content Posting API | Upload to TikTok drafts or Direct Post for creator-approved publishing | Posting API product approval, scopes such as `video.upload` and `video.publish`, creator consent, privacy/caption controls | Build post-intent model and readiness checks; direct publish must wait for app approval. |
| TikTok | Research API | Public-data research lane for policy/market intelligence | Separate application; public-interest, ethical, non-commercial research eligibility; qualified researcher or institution requirements | Track separately from commercial CreatorVault posting; do not build it as a default growth API. |
| Instagram | Instagram API with Facebook Login for Business | Professional-account publishing, media inventory, comments, insights, mentions, hashtag discovery | Instagram Business/Creator account linked to Facebook Page; Meta app; Facebook Login; app review for broad usage | Build account connection and publishing checklist around Page-to-IG discovery. |
| Instagram | Content Publishing | Image, video, Reel, carousel, and eligible Story publishing | Publicly reachable media URLs, `instagram_content_publish`, `instagram_basic`, `pages_read_engagement`, publishing limits | Build asset-hosting requirement and rate-limit guard into VaultX distribution receipts. |
| Facebook | Pages API | Page posts, scheduled posts, photo/video publishing, engagement management | Page access token, Page tasks, app review permissions, `pages_manage_posts`, `pages_read_engagement`, `publish_video` for video | Build Page connection checklist and schedule constraints. |
| Meta | Webhooks | Comment, mention, messaging, Story-expiry, and event receipts | Public HTTPS callback, app in Live mode, verify token, signature validation, business verification for some fields | Build webhook endpoint contract and persistent event table in the social spine. |

## Permission matrix

| Capability | TikTok scopes / products | Meta permissions / products | CreatorVault behavior |
|---|---|---|---|
| Account connection | `user.info.basic`, Login Kit | Facebook Login for Business, `pages_show_list`, `instagram_basic` | Store a connection record with platform, account ID, display name, scope set, token expiry, and readiness state. |
| Profile and creator stats | `user.info.profile`, `user.info.stats` | Instagram profile/media insights, Page insights depending on approved permissions | Surface account intelligence cards only when the user granted the specific read scope. |
| Media inventory | `video.list` | IG media endpoints, Page feed endpoints | Import metadata for planning; do not copy private content without explicit user-granted permissions. |
| Direct publishing | `video.publish`, Content Posting API | `instagram_content_publish`, `pages_manage_posts`, `publish_video` for video | Convert VaultX package output into a publish-intent job, then require platform readiness and rate-limit clearance. |
| Draft/upload workflow | `video.upload`, Upload to TikTok | Instagram media container creation; Page unpublished/scheduled posts | Prefer creator-controlled drafts for early rollout and app review demonstration. |
| Scheduling | Product-specific publishing endpoints and platform terms | Page scheduled posts; Instagram requires app-side scheduler that publishes later | Use CreatorVault’s own queue for scheduled jobs and enforce minimum/maximum scheduling windows. |
| Webhooks and receipts | TikTok event support where approved | Meta Webhooks with verify token and `X-Hub-Signature-256` validation | Persist every inbound platform event as a receipt tied to the connection and publish job. |
| Research/public data | TikTok Research API | Meta public content access features where approved | Maintain a separate compliance lane for qualified research use, not a default commercial automation feature. |

## Production data model

The first safe implementation should introduce a **social integration spine**. This spine does not require live TikTok or Meta credentials, but it makes the platform ready for them.

| Entity | Purpose | Key fields |
|---|---|---|
| `social_platform_accounts` | Stores connected creator-owned platform accounts. | `user_id`, `platform`, `provider_account_id`, `display_name`, `account_type`, `scopes`, `token_status`, `connected_at`, `expires_at`, `last_verified_at`. |
| `social_publish_jobs` | Stores platform-bound publishing intent for VaultX/CreatorVault outputs. | `user_id`, `source_type`, `source_id`, `platform`, `target_account_id`, `caption`, `asset_url`, `scheduled_for`, `status`, `readiness_blockers`, `provider_post_id`. |
| `social_webhook_events` | Stores signed inbound event receipts and deduplication markers. | `platform`, `event_id`, `account_id`, `job_id`, `event_type`, `signature_status`, `payload_json`, `received_at`, `processed_at`. |
| `social_platform_audit_log` | Records sensitive integration actions. | `user_id`, `platform`, `action`, `result`, `metadata`, `created_at`. |

Token values must be encrypted at rest and never returned to the browser. Public readiness endpoints may return platform state, approved permissions, and missing setup steps, but not secrets.

## OAuth and webhook URL plan

| Endpoint | Method | Purpose | Public exposure |
|---|---|---|---|
| `/api/social/platforms` | `GET` | Returns supported platforms, connection requirements, enabled products, and app-review state. | Public-safe; no secrets. |
| `/api/social/oauth/:platform/start` | `GET` | Builds the official OAuth authorization URL with state and requested scopes. | Requires authenticated CreatorVault user. |
| `/api/social/oauth/:platform/callback` | `GET` | Exchanges OAuth code server-side, stores connection, and logs receipt. | Public HTTPS redirect URI registered in developer console. |
| `/api/social/webhooks/meta` | `GET/POST` | Handles Meta webhook verification and signed event ingestion. | Public HTTPS callback registered in Meta App Dashboard. |
| `/api/social/webhooks/tiktok` | `POST` | Handles TikTok events if enabled by approved product. | Public HTTPS callback if TikTok product requires it. |
| `/api/social/publish-intents` | `POST` | Creates a platform publish job from a VaultX artifact or CreatorVault asset. | Authenticated and permission-gated. |
| `/api/social/publish-jobs/:id` | `GET` | Returns status, readiness blockers, platform receipts, and provider IDs. | Authenticated owner/admin only. |

The canonical public domain for production callbacks should be `https://creatorvault.live` until `creatorvault.co` is routed to the same deployed VPS application. The callback URLs registered in TikTok and Meta must use the same production domain that CreatorVault actually serves.

## App setup checklist

| Step | TikTok | Instagram / Facebook |
|---|---|---|
| Developer account | Sign in to TikTok for Developers and create/claim the CreatorVault app. | Sign in to Meta for Developers and create/claim the CreatorVault app under the correct business. |
| Products | Add Login Kit and Content Posting API. Treat Research API as a separate application lane. | Add Facebook Login for Business, Instagram API, Webhooks, and Pages API capabilities. |
| Redirect URIs | Add `https://creatorvault.live/api/social/oauth/tiktok/callback`. | Add `https://creatorvault.live/api/social/oauth/meta/callback` or the exact Meta callback route implemented by the app. |
| Webhooks | Add TikTok webhook only if the approved product requires it. | Add `https://creatorvault.live/api/social/webhooks/meta` and a strong verify token. |
| Required scopes | Start with account identity and upload/draft scopes, then request direct post after review readiness. | Start with `pages_show_list`, `instagram_basic`, `pages_read_engagement`, then request `instagram_content_publish`, `pages_manage_posts`, and video permissions as needed. |
| Test assets | Provide real CreatorVault/VaultX test media hosted at a public HTTPS URL. | Provide public image/video URLs and a connected Instagram Professional account plus Facebook Page. |
| App review proof | Show onboarding, consent, account inventory, publish job preview, and user-controlled publishing. | Show Page/IG selection, publishing limits, scheduled post guard, comment/insight use, and webhook receipts. |
| Secrets | Store app secrets in server environment only. | Store app secret, verify token, and token-encryption key in server environment only. |

## Safe first implementation

The first code increment should create **production-truthful readiness surfaces** rather than fake posting. The app should expose the platform requirements, product state, configured/missing environment variables, redirect URLs, and supported future capabilities. VaultX should display social-platform readiness inside the existing provider/export command board so creators can see whether TikTok, Instagram, and Facebook are ready, blocked by app approval, blocked by credentials, or blocked by account requirements.

This implementation is valuable immediately because it turns developer-console work into a concrete operational checklist and allows future credentials to be installed without redesigning the platform. It also prevents accidental non-compliant automation by blocking direct publish jobs until all prerequisites are true.

## References

[1]: https://developers.tiktok.com/doc/login-kit-web/ "TikTok Login Kit for Web"  
[2]: https://developers.tiktok.com/products/content-posting-api/ "TikTok Content Posting API"  
[3]: https://developers.tiktok.com/products/research-api/ "TikTok Research API"  
[4]: https://developers.tiktok.com/doc/tiktok-api-scopes "TikTok API Scopes"  
[5]: https://developers.facebook.com/docs/instagram-platform/ "Meta Instagram Platform"  
[6]: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/ "Instagram API with Facebook Login"  
[7]: https://developers.facebook.com/docs/instagram-platform/content-publishing/ "Instagram Content Publishing"  
[8]: https://developers.facebook.com/docs/pages-api/posts/ "Facebook Pages API Posts"  
[9]: https://developers.facebook.com/docs/app-review/ "Meta App Review"  
[10]: https://developers.facebook.com/docs/facebook-login/guides/access-tokens/ "Access Tokens for Meta Technologies"  
[11]: https://developers.facebook.com/docs/instagram-platform/webhooks/ "Instagram Webhooks"  
[12]: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/get-started "Instagram API with Facebook Login Get Started"
