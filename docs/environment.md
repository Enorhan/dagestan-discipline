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
- `APPSTORE_BUNDLE_ID` (required by `supabase/functions/appstore-notifications` — must equal the iOS app bundle id, e.g. `com.dagestani.disciple`)
- `APPLE_ROOT_CA_PEM` (optional override for the embedded Apple Root CA - G3 trust anchor; supply a PEM block if you need to pin to a different root)
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
- For Capacitor iOS browser-based fallback flows, keep the native return scheme aligned to `matflow://auth/callback`.
- Verify the same redirect inventory is present in Supabase auth settings before every release:
  - production web origin
  - preview/staging web origin
  - native iOS deep-link callback

### `external_google_skip_nonce_check` is intentionally enabled

Supabase auth has `external_google_skip_nonce_check = true` on the DagestanDiscipline project. This is **required** for the native iOS Sign in with Google flow via `@capacitor-community/capacitor-firebase-authentication` / Capawesome plugins: the ID token Google returns to the native SDK does not always include the nonce that Supabase's JS SDK embedded in the original request, so strict verification would fail every native sign-in.

Do not revert this flag without first validating the native Google Sign-In path end-to-end on both simulator and device. If you move to a different native auth library that propagates the nonce correctly, flip it back to `false` and verify the full flow before release.

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

- `NEXT_PUBLIC_SUPPORT_EMAIL` - defaults to `support@matflow.app`
- `NEXT_PUBLIC_BILLING_SUPPORT_EMAIL` - defaults to the support email
- `NEXT_PUBLIC_PRIVACY_POLICY_URL` - defaults to `/legal/privacy-policy.html`
- `NEXT_PUBLIC_TERMS_OF_SERVICE_URL` - defaults to `/legal/terms-of-service.html`

## Optional observability variable

- `NEXT_PUBLIC_MONITORING_WEBHOOK_URL`

If set, the client monitoring helper posts buffered error reports to this public ingest endpoint in addition to Vercel Analytics event tracking.

### Production observability checklist

1. **Pick an ingest endpoint** — Sentry (`/api/{project}/store/`), Highlight, or a self-hosted POST endpoint that accepts the `BufferedErrorReport` JSON shape from `src/lib/monitoring.ts`.
2. **Set** `NEXT_PUBLIC_MONITORING_WEBHOOK_URL` in Vercel and in `.env.local` for development.
3. **Verify** one forced error post-deploy by calling `captureException('smoke-test', new Error('hello'))` from the browser console and confirming it lands in the sink.
4. **Audit trail strategy**: Postgres-level audit is disabled on the Supabase project (`audit_log_disable_postgres = true`) to keep costs predictable. Multi-user audit coverage is provided at the application layer instead:
   - Stripe payment events — `public.processed_stripe_events` (idempotency + replay log)
   - App Store notifications — `public.processed_app_store_notifications`
   - Moderation actions — `public.social_reports` (+ moderator identity on each row)
   - Account deletions — server-side `supabase/functions/delete-account` logs `[delete-account]` diagnostics via `console.error/warn`, which feed into Supabase function logs.

   Revisit enabling Postgres audit logs if compliance requirements change.

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
