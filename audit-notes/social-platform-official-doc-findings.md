# Official Social-Platform Developer Findings for CreatorVault/VaultX

## TikTok official developer capabilities

TikTok Login Kit for Web requires a registered TikTok developer app, a client key and secret, and static HTTPS redirect URIs registered in the app configuration. The server must protect client secrets and refresh tokens, prevent CSRF using state, handle token refresh, and manage access token exchange per user. Authorization begins at `https://www.tiktok.com/v2/auth/authorize/` with `client_key`, `response_type=code`, comma-separated `scope`, `redirect_uri`, and `state`.

TikTok Content Posting API supports creator posting flows for web/cloud/desktop apps. Its two relevant modes are Direct Post API, which posts directly to a creator's TikTok profile with caption/hashtag/privacy settings, and Upload to TikTok, which uploads content as a draft for the creator to finish in TikTok.

TikTok Research Tools are not a general commercial growth API. TikTok states that qualifying researchers in eligible regions can apply to study public data. Eligibility includes academic or not-for-profit/independent research affiliations, non-commercial/public-interest research, ethical review, data security commitments, disclosure of funding, and a clearly defined proposal. This should be treated as a separate research-program application, not as the default CreatorVault commercial integration path.

TikTok scope highlights: `user.info.basic`, `user.info.profile`, `user.info.stats`, `video.list`, `video.publish`, `video.upload`, `research.data.basic`, `research.adlib.basic`, and related research/vetted-research scopes.

Sources:
1. https://developers.tiktok.com/doc/login-kit-web/
2. https://developers.tiktok.com/products/content-posting-api/
3. https://developers.tiktok.com/products/research-api/
4. https://developers.tiktok.com/doc/tiktok-api-scopes

## Meta / Instagram / Facebook official developer capabilities

Meta Instagram Platform supports Instagram APIs for Business and Creator accounts. Instagram API with Instagram Login can manage Instagram professional presence; Instagram API with Facebook Login for Business applies to Instagram Business or Creator accounts linked to a Facebook Page. The platform supports media publishing, comment management, mentions, hashtag discovery, insights, messaging, sharing to Stories, sharing to Feed, and embedding depending on product and permissions.

Instagram API with Facebook Login common uses include getting/managing published photos, videos, and stories; publishing content; measuring profile/media interaction; moderating comments; hashtag discovery; and mention discovery. It cannot access consumer Instagram accounts. Content publishing is available to Instagram Professional accounts, with Stories publishing only available to business accounts.

Instagram content publishing requires public media URLs because Meta fetches the media during publishing. Relevant endpoints include `/<IG_ID>/media` to create a media container, `/<IG_ID>/media_publish` to publish, `/<IG_CONTAINER_ID>?fields=status_code` to check status, and `/<IG_ID>/content_publishing_limit` to check rate-limit usage. Permissions differ by login type. Facebook Login path needs `instagram_basic`, `instagram_content_publish`, and `pages_read_engagement`; some Page-role cases also require `ads_management` and `ads_read`. Instagram accounts are limited to 100 API-published posts within a 24-hour moving period for the documented publish endpoint, and the app should enforce scheduling limits.

Facebook Pages API posting requires Facebook Login, a Page access token, and permissions including `pages_manage_engagement`, `pages_manage_posts`, `pages_read_engagement`, `pages_read_user_engagement`, and `publish_video` for video. The app user must have Page tasks such as `CREATE_CONTENT`, `MANAGE`, and `MODERATE`. Page posts are created through `/page_id/feed`; scheduled posts require `published=false` and `scheduled_publish_time`, which must be between 10 minutes and 30 days from the request time. Photos post through `/page_id/photos`; videos use the Video API.

Sources:
5. https://developers.facebook.com/docs/instagram-platform/
6. https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/
7. https://developers.facebook.com/docs/instagram-platform/content-publishing/
8. https://developers.facebook.com/docs/pages-api/posts/

## Initial implication for CreatorVault/VaultX

The safe integration foundation should not scrape user accounts or bypass platform review. It should create a real internal platform registry, OAuth callback surfaces, encrypted token storage plan, webhook-ready callback URLs on `creatorvault.live`, platform permission matrix, post-intent job model, asset-hosting requirements, rate-limit guards, and creator-facing setup/checklist UI. Actual direct publishing must remain disabled until the official TikTok and Meta apps are approved and credentials are installed securely.

TikTok Research Tools should be tracked as a separate application lane for eligible public-interest research, while the commercial CreatorVault/VaultX product should prioritize Login Kit, Content Posting API, Share/Upload workflows, Instagram professional publishing, Facebook Pages publishing, comments/insights, and scheduled post orchestration.


## Meta app review, token, and webhook operating requirements

Meta App Review is required when anyone outside the app role list or claimed business role will use the app. Approved permissions can be requested from any app user; unapproved permissions only work for role users. Meta tests the app during review, so CreatorVault must expose a reviewable onboarding, OAuth, publishing, and webhook flow with test credentials or test assets before requesting advanced permissions.

Meta token handling separates app, user, Page, system-user, and client access tokens. Page access tokens are obtained after user login by querying the user's Pages, and they allow reading/writing Page-owned data. Short-lived web login tokens can be exchanged server-side for long-lived tokens, and token lengths can vary; storage must not impose a brittle fixed length. App secrets and app access tokens must remain server-side only.

Instagram webhooks require a public HTTPS callback with a valid TLS certificate, a dashboard verify token, verification handling that echoes `hub.challenge` when `hub.verify_token` matches, JSON event handling, optional-but-recommended `X-Hub-Signature-256` validation using the app secret, deduplication, persistent event capture, and fast `200 OK` responses. Apps must be live to receive webhook notifications, and business verification plus advanced access may be required for several webhook fields.

Instagram API with Facebook Login setup requires an Instagram Business or Creator account, a Facebook Page connected to it, a Facebook Developer account with Page tasks, and a registered Facebook app. The setup flow is: configure Facebook Login for Business, request `instagram_basic` and `pages_show_list`, obtain a user token, call `/me/accounts` to get Pages, query `/{page-id}?fields=instagram_business_account`, and then call IG endpoints with the resulting Instagram professional account ID.

Sources:
9. https://developers.facebook.com/docs/app-review/
10. https://developers.facebook.com/docs/facebook-login/guides/access-tokens/
11. https://developers.facebook.com/docs/instagram-platform/webhooks/
12. https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/get-started
