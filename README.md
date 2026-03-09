# Dagestani Disciple

A fitness tracking application built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui.

## Production Readiness Highlights

- Node.js runtime standardized on **22** (`.nvmrc`)
- CI now runs lint, typecheck, targeted critical-flow scripts, and build verification
- iOS simulator packaging validated through Capacitor
- in-app support/legal entry points available from Settings
- runtime billing kill switches can be driven by an optional remote runtime-flags document
- static legal docs shipped from `public/legal/*`
- release and environment runbooks documented in `docs/`

## Features

- **Workout Tracking**: Track your daily workout sessions
- **Week Progress**: Visual representation of your weekly training schedule
- **Multiple Screens**: 
  - Home screen with session overview
  - Onboarding for schedule and equipment setup
  - Week view for planning
  - Workout session tracker
  - Rest timer
  - Session completion screen

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Fonts**: Geist Sans & Geist Mono

## Getting Started

### Prerequisites

- Node.js 22 installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
nvm use
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript in no-emit mode
- `npm run test:critical-flows` - Run targeted script coverage for navigation, hydration, session runtime, settings, premium gates, recovery, and support config
- `npm run test:runtime-flags` - Validate billing/upsell runtime flag parsing and kill-switch behavior
- `npm run verify:ci` - Run lint + typecheck + critical-flow scripts + production build checks
- `npm run test:payments:smoke` - Run live checkout/webhook smoke tests
- `npm run admin:import:dagestan -- /absolute/path/to/Dagestan discipline.xlsx` - Admin-only workbook import for Supabase content seeding
- `npm run pipeline:sources` - Seed default external collection sources
- `npm run pipeline:run` - Run athlete/exercise data expansion pipeline end-to-end

## Admin-only Dagestan import

The remaining `xlsx` dependency is retained only for the manual Dagestan workbook import script. It is **not** used by the shipped app runtime or by `npm run verify:ci`.

Use one of these admin-only commands:

- `npm run admin:import:dagestan -- /absolute/path/to/Dagestan discipline.xlsx`
- `DAGESTAN_DISCIPLINE_XLSX_PATH=/absolute/path/to/Dagestan discipline.xlsx npm run admin:import:dagestan`

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## CI Setup

The repository now includes [`.github/workflows/ci.yml`](.github/workflows/ci.yml) with two jobs:

- `quality`: installs dependencies, runs `npm run verify:ci`
- `payment-smoke`: runs `npm run test:payments:smoke` (only when required secrets are configured and the event is not `pull_request`)

Set these GitHub repository secrets for payment smoke tests:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PAYMENT_SMOKE_SUCCESS_URL` (optional)
- `PAYMENT_SMOKE_CANCEL_URL` (optional)

If the payment smoke URLs are omitted, the script derives them from `NEXT_PUBLIC_CHECKOUT_REDIRECT_URL` or `NEXT_PUBLIC_APP_URL`, then falls back to the GitHub Pages redirect page.

## Environment & Release Docs

- [`docs/environment.md`](docs/environment.md) - required runtime env vars, optional client monitoring config, and secret ownership notes
- runtime flag payloads can optionally be hosted remotely and loaded through `NEXT_PUBLIC_RUNTIME_FLAGS_URL`
- [`docs/release-runbook.md`](docs/release-runbook.md) - pre-release verification, payment operations, and mobile release checklist

Local env files are already ignored by Git via `.gitignore` (`.env.local`, `.env.production.local`, etc.).

## Project Structure

```
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/       # React components
│   │   ├── screens/      # Screen components
│   │   └── ui/           # shadcn/ui components
│   └── lib/              # Utilities and data
│       ├── analytics.ts  # Product events and local buffering
│       ├── monitoring.ts # Error buffering + optional monitoring webhook
│       └── app-support.ts# Support/legal URLs and helper utilities
├── docs/                 # Environment and release runbooks
└── public/               # Static assets
```

## Adding Components

To add new shadcn/ui components:

```bash
npx shadcn@latest add [component-name]
```

## Theme

The app uses a dark theme with a brutal minimalist design featuring blood red accents, inspired by Dagestani discipline and strength training culture.

## License

Private project
