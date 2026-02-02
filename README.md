# Dagestani Disciple

A fitness tracking application built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui.

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

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
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
│       ├── types.ts      # TypeScript types
│       ├── data.ts       # Mock data
│       └── utils.ts      # Utility functions
├── app/
│   └── globals.css       # Global styles
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

