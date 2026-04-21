# Environment Configuration

## Runtime baseline

- Use **Node 22** locally (`nvm use`)
- Keep local secrets in `.env.local`
- `.env.local` and the other local env files are already ignored by Git

## Required client/runtime variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` (Google Web Client ID used for native iOS initialization and web fallback)
- `SUPABASE_SERVICE_ROLE_KEY` (server / scripts / payment smoke only)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `APPSTORE_NOTIFICATION_BEARER_TOKEN` (required by `supabase/functions/appstore-notifications`)
- `NEXT_PUBLIC_APP_URL`

## Recommended app metadata variables

- `NEXT_PUBLIC_RELEASE_VERSION` - release tag shown in buffered monitoring payloads
- `NEXT_PUBLIC_CHECKOUT_REDIRECT_URL` - explicit redirect page URL for checkout/portal flows when `NEXT_PUBLIC_APP_URL` is not enough

## OAuth provider setup

- Configure Supabase Google auth for both web OAuth fallback and native token exchange.
- Add iOS Google Sign-In values in Xcode build settings:
  - `GOOGLE_IOS_CLIENT_ID` (iOS OAuth client ID from Google Cloud)
  - `GOOGLE_IOS_REVERSED_CLIENT_ID` (reversed iOS client ID, e.g. `com.googleusercontent.apps.123...`)
- `ios/App/App/Info.plist` and `ios/App/App/Info-Debug.plist` read these keys via `GIDClientID` and URL scheme entries.
- For Capacitor iOS browser-based fallback flows, keep the native return scheme aligned to `dagestanidiscipline://auth/callback`.
- Verify the same redirect inventory is present in Supabase auth settings before every release:
  - production web origin
  - preview/staging web origin
  - native iOS deep-link callback

## Optional runtime flag variables

- `NEXT_PUBLIC_RUNTIME_FLAGS_URL` - remote JSON document for kill switches that should update without a rebuild
- `NEXT_PUBLIC_BILLING_CHECKOUT_ENABLED` - fallback/default checkout flag when no remote document is available
- `NEXT_PUBLIC_BILLING_PORTAL_ENABLED` - fallback/default customer portal flag when no remote document is available
- `NEXT_PUBLIC_PREMIUM_UPSELL_ENABLED` - fallback/default upsell visibility flag when no remote document is available
- `NEXT_PUBLIC_SOCIAL_VIDEO_UPLOADS_ENABLED` - enable/disable video upload and intent UX without rebuild
- `NEXT_PUBLIC_SOCIAL_FEED_RANKING_V2_ENABLED` - enable/disable v2 feed ranking behavior
- `NEXT_PUBLIC_SOCIAL_TRUST_SAFETY_STRICT_MODE_ENABLED` - enable stricter anti-abuse and moderation safeguards
- `NEXT_PUBLIC_SOCIAL_EXPANDED_NOTIFICATIONS_ENABLED` - enable deeper mention/reply/follow notification fanout

The optional remote JSON payload currently supports:

- `billingCheckoutEnabled`
- `billingPortalEnabled`
- `premiumUpsellEnabled`
- `billingCheckoutDisabledMessage`
- `billingPortalDisabledMessage`
- `socialFeedEnabled`
- `socialStoriesEnabled`
- `socialReelsEnabled`
- `socialExploreEnabled`
- `socialCreatorDraftsEnabled`
- `socialSchedulingEnabled`
- `socialModerationEnabled`
- `socialVideoUploadsEnabled`
- `socialFeedRankingV2Enabled`
- `socialTrustSafetyStrictModeEnabled`
- `socialExpandedNotificationsEnabled`

## Social video backend variables

- `SOCIAL_VIDEO_PROVIDER` (`mux` or `cloudflare_stream`)
- `SOCIAL_VIDEO_WEBHOOK_TOKEN` (shared secret for `supabase/functions/social-video-webhook`)
- `SOCIAL_SCHEDULER_TOKEN` (shared secret for `supabase/functions/social-scheduled-publisher`)
- `MUX_TOKEN_ID`
- `MUX_TOKEN_SECRET`
- `CLOUDFLARE_STREAM_ACCOUNT_ID`
- `CLOUDFLARE_STREAM_API_TOKEN`

## Support and legal variables

- `NEXT_PUBLIC_SUPPORT_EMAIL` - defaults to `support@dagestanidisciple.com`
- `NEXT_PUBLIC_BILLING_SUPPORT_EMAIL` - defaults to the support email
- `NEXT_PUBLIC_PRIVACY_POLICY_URL` - defaults to `/legal/privacy-policy.html`
- `NEXT_PUBLIC_TERMS_OF_SERVICE_URL` - defaults to `/legal/terms-of-service.html`

## Optional observability variable

- `NEXT_PUBLIC_MONITORING_WEBHOOK_URL`

If set, the client monitoring helper posts buffered error reports to this public ingest endpoint in addition to Vercel Analytics event tracking.

## CI / GitHub secrets

Set these repository secrets for `payment-smoke`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PAYMENT_SMOKE_SUCCESS_URL` (optional)
- `PAYMENT_SMOKE_CANCEL_URL` (optional)

## Secret ownership guidance

- Rotate Stripe and Supabase keys on a documented schedule
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code
- Keep staging and production Stripe/Supabase projects isolated
- Treat payment smoke secrets as production-adjacent operational credentials
