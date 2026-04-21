- Dagestani Disciple is a private Next.js 16 + TypeScript app with Tailwind CSS, shadcn/ui, and a Capacitor iOS wrapper.
- Primary app code lives in `src/`, static assets in `public/`, operational docs in `docs/`, scripts in `scripts/`, and native iOS files in `ios/`.
- Favor minimal, surgical changes that preserve current product behavior and styling.
- Use Node.js 22 (`.nvmrc`).
- Install dependencies with `npm install`.
- Main local workflows:
  - `npm run dev`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test:critical-flows`
  - `npm run verify:ci`
- TestFlight upload workflow:
  - Build/sign with `npm run ios:ipa`.
  - Upload with `npm run ios:upload`, which uses the Xcode account export/upload flow (`xcodebuild -exportArchive` with `destination=upload` and `-allowProvisioningUpdates`).
  - Do not switch back to API-key/altool upload unless explicitly requested.
- Follow existing TypeScript, React, and App Router patterns already present in `src/`.
- Prefer server/client boundaries that match surrounding files; do not add `use client` unless required.
- Reuse existing utilities, UI primitives, and domain helpers before introducing new abstractions.
- Keep components and helpers narrowly scoped; avoid broad refactors unless explicitly requested.
- Do not add dependencies unless necessary for the requested task.
- Do not expose secrets or commit local env values.
- For small UI/code changes, run the narrowest relevant check first.
- Typical validation order:
  1. `npm run lint`
  2. `npm run typecheck`
  3. targeted script tests in `scripts/`
  4. `npm run test:critical-flows`
  5. `npm run build` or `npm run verify:ci` when appropriate
- Do not fix unrelated failing tests unless the user asks.
- `.gitignore` already excludes build outputs, local env files, Next.js artifacts, scratch directories, and mobile build products.
- Treat `public/legal/*`, `docs/*`, and payment/runtime-flag flows as user-facing or operationally sensitive; update carefully.
- Many checks are implemented as `tsx` scripts under `scripts/`; prefer matching nearby script conventions when adding new coverage.
- Read files in small chunks when inspecting large files.
- Prefer `rg` and `rg --files` for search.
- Before editing, inspect adjacent files for naming and structure consistency.
- After making changes, summarize modified files, validations run, and any follow-up the user may want.
