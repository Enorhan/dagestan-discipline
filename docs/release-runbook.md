# Release Runbook

## Pre-release verification

Run this baseline before every public release:

1. `nvm use`
2. `npm ci`
3. `npm run verify:ci`
4. `npm run test:payments:smoke` (when live payment secrets are available)
5. `npm run build`
6. `npx cap sync ios`

## Manual release checklist

- Confirm `NEXT_PUBLIC_RELEASE_VERSION` matches the release/build you are shipping
- Verify checkout + portal redirects use the correct environment URLs
- Verify Supabase Google auth redirects match the live web domains
- Confirm privacy policy and terms links open from Settings
- Verify support email routes to an actively monitored inbox
- Test email sign up, Google login, onboarding, session start, session completion, premium upgrade, and subscription management on a real device
- Confirm App Store metadata, screenshots, and subscription descriptions match the live product
- Verify no authenticated surface is showing demo seed data or placeholder upsell copy
- When reporting simulator UI bugs, capture stable files into `screenshots/runtime/` with `npm run sim:screenshot -- --udid <device-udid|booted> --flow <flow> --step <step>`; do not use macOS temp paths

## Payment operations checklist

- Confirm the Supabase `stripe-webhook` edge function is deployed in the target environment
- Confirm the Supabase `appstore-transaction` and `appstore-notifications` edge functions are deployed in the target environment
- Confirm Stripe points to the correct webhook URL and signing secret
- Confirm `APPSTORE_BUNDLE_ID` and `APPSTORE_ALLOWED_PRODUCT_IDS` match App Store Connect
- For App Store Server Notifications, run `npm run appstore:test-notification`
  against sandbox after configuring the App Store Connect notification URL
- Verify `processed_stripe_events` is receiving idempotency markers (canonical dedupe table for webhook retries)
- Verify premium state updates on checkout return and after webhook processing
- If `NEXT_PUBLIC_RUNTIME_FLAGS_URL` is configured, verify the runtime flag payload matches the intended release posture before launch
- Keep a manual recovery path for stuck premium state:
  - inspect Stripe customer + subscription state
  - inspect `profiles` and `subscriptions` rows in Supabase
  - re-run or replay the Stripe webhook event if required

## Billing kill-switch guidance

- Use the runtime flag payload to disable checkout and/or portal entry points during incidents without changing app code
- Keep the disabled-state copy actionable so users are routed toward Billing Help in Settings
- Re-enable checkout only after Stripe, webhook delivery, and Supabase premium sync are confirmed healthy

## Social video launch checks

- Confirm `social-video-upload-intent`, `social-video-webhook`, and `social-scheduled-publisher` are deployed in the target Supabase project.
- Verify `SOCIAL_VIDEO_WEBHOOK_TOKEN` and `SOCIAL_SCHEDULER_TOKEN` are set and rotated for production.
- Run at least one end-to-end upload test (`pending` -> `processing` -> `ready`) and one failure-path test (`failed_reason` visible).
- If `NEXT_PUBLIC_RUNTIME_FLAGS_URL` is configured, verify social runtime toggles before enabling risky surfaces:
  - `socialVideoUploadsEnabled`
  - `socialFeedRankingV2Enabled`
  - `socialTrustSafetyStrictModeEnabled`
  - `socialExpandedNotificationsEnabled`
- Validate moderation queue auto-enqueue by creating a report and confirming a queue item appears with priority and open status.
- Validate scheduled post publish idempotency by running scheduler twice and confirming no duplicate owner notifications.

## Mobile release notes

- iOS simulator validation is useful, but do not ship from simulator-only confidence
- Keep simulator QA captures in `screenshots/runtime/` only; temp files under `/var/folders/.../T/...` are not acceptable release evidence
- Validate cold launch, resume-from-background, Google auth return, purchase return flow, offline/online transitions, and settings/legal links on real devices
- After `npx cap sync ios`, archive/sign with `npm run ios:ipa`
- Confirm `ios/App/App/capacitor.config.json` includes `MatFlowIAPPlugin` and `MatFlowSIWAPlugin` after sync
- Upload TestFlight builds with `npm run ios:upload`; this uses the configured Xcode account and `xcodebuild -exportArchive` with `destination=upload`

## Incident response quick notes

- Billing issue: route user to support email and inspect Stripe + Supabase subscription state
- Auth issue spike: inspect buffered client error reports, Vercel analytics events, and Supabase auth status
- Crash or fatal UI issue: use buffered error reports, release version tags, and reproduce on the current mobile build
