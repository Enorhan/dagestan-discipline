# iOS TestFlight QA Checklist

Run this checklist on a physical iPhone for every TestFlight build before
promoting to App Store Review. Record pass/fail per row in the build's
release notes.

## Build identity

- [ ] `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` bumped in
  `ios/App/App.xcodeproj/project.pbxproj`
- [ ] `NEXT_PUBLIC_RELEASE_VERSION` matches the build number
- [ ] Build produced via `npm run ios:ipa` (no live-reload URL leaked)
- [ ] Uploaded via `npm run ios:upload`
- [ ] Build appears in App Store Connect → TestFlight processing

## Cold-start & offline

- [ ] Cold start from quit state lands on signed-in surface within 3 s
- [ ] Cold start with airplane mode shows cached UI or graceful empty state
- [ ] No flash of unauthenticated UI for an already-signed-in user
- [ ] No `localhost`, `enorhan.github.io`, or live-reload server in any
  navigation logs
- [ ] App icon, display name (**MatFlow**), and launch screen render correctly

## Authentication

- [ ] Email signup → email verification link → returns into the app via
  `matflow://auth/callback`
- [ ] Google Sign-In completes on first attempt; token persists across cold
  start
- [ ] Sign in with Apple completes on first attempt (once SIWA capability is
  enabled in the Apple Developer portal)
- [ ] Password reset deep link opens the reset surface; new password persists
- [ ] Logout clears session; subsequent cold start lands on the sign-in surface
- [ ] Re-install (delete + reinstall) clears credentials; prior account is not
  auto-restored
- [ ] No raw auth tokens visible in logs (deep-link redaction working)

## Onboarding

- [ ] New account routes through onboarding (discipline, name, belt, gym)
- [ ] Discipline picker shows only **BJJ** and **Grappling**
- [ ] Onboarding completion persists across cold start
- [ ] Existing user is not shown onboarding again

## Paywall & subscription (Apple IAP)

- [ ] Trial users see remaining trial days on paywall
- [ ] Tap **Subscribe** → Apple StoreKit sheet appears (no Stripe browser)
- [ ] Sandbox purchase grants access immediately; entitlement persists across
  cold start
- [ ] **Restore purchases** restores an existing sandbox subscription
- [ ] Cancelling the StoreKit sheet returns the user to the paywall, not a
  loading state
- [ ] Server-side `processed_app_store_notifications` records the transaction
- [ ] Stripe checkout is **unreachable** on iOS — confirm via inspecting the
  Subscribe handler in DevTools / monitoring (defense-in-depth guard fires
  with the iOS App Store message if invoked)

## Sessions & training

- [ ] Create session → save → appears immediately in list and calendar
- [ ] Edit session persists changes across cold start
- [ ] Delete session shows undo toast; undo restores within the 5 s window
- [ ] Backgrounding mid-session and resuming preserves the draft
- [ ] Branch-aware type selector matches the user's primary discipline

## Community & profiles

- [ ] Discover Graphs / Techniques tabs load
- [ ] Fork a public system → appears in My Library; second fork is blocked
- [ ] Open a public profile via deep link `matflow://?u=<handle>` (or `?u=`
  query param via the share fallback)
- [ ] Share profile button opens the system share sheet without TypeError
- [ ] Comment on a system / technique persists and is visible to a second
  user account

## Deep links

- [ ] `matflow://auth/callback` after email verify lands on the correct surface
- [ ] `matflow://auth/callback` after password reset lands on the reset surface
- [ ] No deep link triggers a navigation to `localhost` or external Stripe
- [ ] Deep-link logs in monitoring show redacted query/fragment (no
  `access_token=`, `refresh_token=`, `code=`, etc.)

## Account deletion

- [ ] Settings → Delete account requires typed `DELETE` confirmation
- [ ] After delete, app signs the user out and a fresh signup with the same
  email succeeds
- [ ] Storage assets under `<uid>/` are purged (verify via Supabase storage
  inspection)

## Native plumbing

- [ ] Push notification permission prompt appears once, on first signed-in
  launch
- [ ] App backgrounded for 30 min, then resumed: session intact, no duplicate
  realtime subscriptions visible in network logs
- [ ] No crash logs in TestFlight Crashes tab after a 10-minute exploratory run

## Final gates before submitting for review

- [ ] `npm run verify:ci` green on the release branch
- [ ] `npm audit --omit=dev` reports 0 vulnerabilities
- [ ] App Store Connect: subscription product status **Ready to Submit** for
  every locale that ships
- [ ] Review notes describe the payment flow (Apple IAP only on iOS, Stripe
  for web) and provide a sandbox tester account
- [ ] Privacy policy + Terms of Service URLs reachable without auth

## Known issues filed

Record any failures from the rows above as GitHub issues before submitting,
linked from the build's TestFlight release notes. A build may only be
submitted to App Review if every row above is **Pass** or has a linked issue
with a documented mitigation.

