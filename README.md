# Hearthway Frontend

Hearthway lets groups track shared expenses with flexible splits, receipts, and payments. This package is the Next.js App Router frontend that talks to the Hearthway backend via session cookies.

## Feature set (implemented)

- Authentication and session handling via Better Auth (`/signup`, `/login`).
- Groups index with creation modal; group members inherit the logged-in user identity.
- Group detail with:
  - Net balance summary, cost per person, paid per person.
  - Recent expenses list and full expenses table.
  - Add member flow (by email) and member roster display.
- Expense flows:
  - Create/update expenses with even/percent/share splits, line items, participant selection.
  - Record payments against an expense and view payment totals.
  - Expense detail pages with participant costs and line items.
- Receipt uploads:
  - Single upload with presigned URLs and auto-payment for the current user.
  - Batch scan flow that polls parsing status and auto-pays for the current user when possible.
- Dashboard scaffolding with mocked analytics/chat when `NEXT_PUBLIC_API_BASE_URL` is unset.

## Tech stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Better Auth client for cookie-based auth
- React Query for data fetching and cache
- Mocked data fallback if `NEXT_PUBLIC_API_BASE_URL` is missing

## Getting started

```bash
pnpm install
cp .env.example .env.local
# Update env values to point at the backend (default http://localhost:4000 with /auth)
pnpm dev
```

Visit `http://localhost:3000` for the marketing page, `/signup` or `/login` for auth, and `/dashboard` as the default hub for group/expense features.

## Environment

Create `.env.local` with:

| Variable                     | Description                                                                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`        | Public URL for the frontend (used in links and fallbacks).                                                                                                 |
| `NEXT_PUBLIC_AUTH_BASE_URL`  | Backend origin that hosts Better Auth (e.g., `http://localhost:4000`).                                                                                     |
| `NEXT_PUBLIC_AUTH_BASE_PATH` | Better Auth path on the backend (defaults to `/auth`).                                                                                                     |
| `NEXT_PUBLIC_API_BASE_URL`   | Backend API origin for expense data. When unset, UI surfaces use mock data. Requests include cookies, so enable CORS with credentials on the backend. |

## Architecture notes

- `src/lib/auth/client.ts` provides auth hooks/actions bound to Better Auth.
- `src/lib/api-client.ts` centralizes backend calls and forwards session cookies; falls back to mocks when no API base URL is set.
- Group/expense UI lives under `src/app/dashboard` (list) and `src/app/groups/*` for detail, with shared components in `src/components/groups`.
- React Query provider is in `src/components/providers.tsx` for shared caching.

## Scripts

| Script       | Description                  |
| ------------ | ---------------------------- |
| `pnpm dev`   | Start the Next.js dev server |
| `pnpm build` | Create a production build    |
| `pnpm start` | Run the built app            |
| `pnpm lint`  | Run ESLint                   |
