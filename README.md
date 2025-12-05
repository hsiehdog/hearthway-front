# Hearthway Frontend

Hearthway makes it effortless for groups to log shared expenses, attach receipts, apply flexible splits, and settle up cleanly. Two modes support different workflows:

- **Project Mode:** Neighbors, families, clubs, or small teams can track repairs or group purchases and get transparent, even/percentage/share-based splits plus settlement suggestions.
- **Trip Mode:** Travel-friendly expense capture with participation-based splits, multi-currency handling, light itinerary sharing, and an end-of-trip settlement plan.

This package is the Next.js App Router frontend that pairs with the Hearthway backend for auth, expense data, and settlement flows.

## Tech stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui
- Better Auth client wired to the backend for session-cookie auth
- React Query for data fetching/cache; chat + dashboard scaffolding ready to bind to expense endpoints
- Mocked data fallback when API URLs are not configured, so the UI can run without live services

## Getting started

```bash
pnpm install
cp .env.example .env.local
# Update the env values to point at the backend (default http://localhost:4000 with /auth)
pnpm dev
```

Visit `http://localhost:3000` for the marketing page, `/signup` or `/login` for auth, and `/dashboard` for the protected dashboard (currently seeded with mocked analytics/chat until you plug in real APIs).

## Environment

Create `.env.local` with the following:

| Variable                     | Description                                                                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`        | Public URL for the frontend (used in links and fallbacks).                                                                                                 |
| `NEXT_PUBLIC_AUTH_BASE_URL`  | Backend origin that hosts Better Auth (e.g., `http://localhost:4000`).                                                                                     |
| `NEXT_PUBLIC_AUTH_BASE_PATH` | Better Auth path on the backend (defaults to `/auth`).                                                                                                     |
| `NEXT_PUBLIC_API_BASE_URL`   | Backend API origin for expense data. When unset, dashboard + chat use mock data. Requests include cookies, so enable CORS with credentials on the backend. |

## Architecture notes

- `src/lib/auth/client.ts` points to the backend Better Auth instance and exposes hooks/actions (`authClient.useSession`, `authClient.signIn.email`, etc.).
- `src/lib/api-client.ts` centralizes backend calls and forwards the session cookie (`credentials: "include"`). If `NEXT_PUBLIC_API_BASE_URL` is missing, it returns mocked dashboard/chat data for local UI work.
- `src/components` contains shadcn UI primitives plus dashboard, auth, layout, and chat building blocks that can be retargeted to Hearthway’s expense entities.
- React Query is provided in `src/components/providers.tsx` to share caches across the dashboard and chat surfaces.

## Scripts

| Script       | Description                  |
| ------------ | ---------------------------- |
| `pnpm dev`   | Start the Next.js dev server |
| `pnpm build` | Create a production build    |
| `pnpm start` | Run the built app            |
| `pnpm lint`  | Run ESLint                   |

## Next steps for Hearthway

- Replace mock dashboard/chat data with expense, receipt, and settlement endpoints from the backend.
- Map Project Mode and Trip Mode surfaces onto the dashboard layout (e.g., separate tabs for home repairs vs. trips, itinerary panels, settlement suggestions).
- Wire receipts upload and multi-currency handling to real services once those APIs land in the backend.
