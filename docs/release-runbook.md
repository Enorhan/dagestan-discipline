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
- Confirm privacy policy and terms links open from Settings
- Verify support email routes to an actively monitored inbox
- Test sign up, login, onboarding, session start, session completion, premium upgrade, and subscription management on a real device
- Confirm App Store metadata, screenshots, and subscription descriptions match the live product

## Payment operations checklist

- Confirm the Supabase `stripe-webhook` edge function is deployed in the target environment
- Confirm Stripe points to the correct webhook URL and signing secret
- Verify `processed_stripe_events` is receiving idempotency markers
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

## Mobile release notes

- iOS simulator validation is useful, but do not ship from simulator-only confidence
- Validate cold launch, resume-from-background, purchase return flow, offline/online transitions, and settings/legal links on real devices
- After `npx cap sync ios`, archive/sign from Xcode using the release signing profile

## Incident response quick notes

- Billing issue: route user to support email and inspect Stripe + Supabase subscription state
- Auth issue spike: inspect buffered client error reports, Vercel analytics events, and Supabase auth status
- Crash or fatal UI issue: use buffered error reports, release version tags, and reproduce on the current mobile build