# InterPredict

**InterPredict** is a community-governed prediction marketplace built on the Interlink Network. It supports binary and categorical prediction markets, real-time trading via a central limit order book, committee-based curation, and a long-term vision for fully decentralized governance.

## What This Repo Contains

- `app/` - Next.js App Router pages and layouts
- `components/` - reusable UI components and page sections
- `lib/` - application utilities and shared helper code
- `public/` - static assets such as images and icons
- `styles/` / `app/globals.css` - global styling and Tailwind configuration entry points

## Tech Stack

- Next.js 16.2.6 (App Router)
- React 19
- TypeScript 5.7.3
- Tailwind CSS 4
- shadcn/ui components
- lucide-react icons

## Local Setup

Recommended package manager: `npm`, `pnpm`, or `yarn`

```bash
npm install
npm run dev
```

or with pnpm:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - start the development server
- `npm run build` - build the app for production
- `npm run start` - start the production server after build
- `npm run lint` - run ESLint across the project

## Project Notes for Developers

- The entry layout is `app/layout.tsx`
- Main homepage content is in `app/page.tsx`
- Whitepaper content lives in `app/whitepaper/page.tsx`
- Shared UI sections are in `components/`
- Global styles are loaded from `app/globals.css`
- The project currently uses `@vercel/analytics` in production builds for analytics tracking

## Recommended Workflow

1. Pull the latest branch
2. Install dependencies
3. Start the dev server
4. Make edits in `app/`, `components/`, or `lib/`
5. Verify changes at `http://localhost:3000`

## Contact & Social

If you want to reach the InterPredict team or discuss the project, connect with us on:

- Telegram: [https://t.me/InterPredict](https://t.me/InterPredict)
- X: [https://x.com/InterPredict](https://x.com/InterPredict)

## Contribution

Feel free to open issues, submit PRs, or extend the whitepaper and frontend content. Keep updates consistent with the existing Next.js + Tailwind structure.

## Useful Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [shadcn/ui](https://ui.shadcn.com/)
