# TrainTrack Pro

Training attendance management built with **Next.js 16 (App Router)**, **React 19**, **MongoDB / Mongoose** and **TypeScript**. Administrators schedule sessions and show a rotating QR code at the venue. Staff scan it on their phones to check in. Every rule is enforced on the server.

## Features

| Area | What it does |
| --- | --- |
| Overview | Live KPIs, 30-day trend, present/absent split, department chart, upcoming sessions, recent activity |
| Training sessions | Create/edit sessions with an audience, schedule, venue and QR rotation interval. Go live, close, delete (only when no records exist) |
| QR attendance | Signed, expiring check-in tokens that rotate automatically; revoke-and-rotate; live roster with auto-refresh; manual entries with a reason |
| Public check-in | Mobile page at `/checkin/<token>`. Staff confirm with their staff ID and full name, which are validated against an active profile and the session audience |
| Staff directory | Server-side search and filters, add/edit, deactivate/reactivate, CSV import with preview, per-person attendance history |
| Attendance records | Filter, sort, paginate, correct or reset with a required reason, filtered CSV export |
| Reports | Filter by session, department, status and date range; stacked department chart; repeated absences; CSV and multi-page PDF export |
| Departments | Create, rename (cascades to staff and sessions), delete when empty |
| Audit logs | Append-only record of every administrative change, with before/after values and the reason |
| Settings | Organization name, default QR rotation, administrators, password change, demo data loader |

## Security design

- **Authentication:** bcrypt-hashed admin passwords and an HS256 JWT in an `httpOnly`, `SameSite=Lax` cookie (8-hour lifetime). `src/proxy.ts` gates routes, and every page, server action and API route checks again with `requireAdmin()`.
- **QR challenges:** each code is a signed JWT bound to one session and a `qrVersion`. It expires on rotation, and any status change or "Revoke" bumps the version, which invalidates every code already issued.
- **Check-in integrity:** the session must be `Live`, the staff ID and name must match an active profile in the session's audience, and a **unique compound index `(sessionCode, staffId)`** blocks duplicates at the database level.
- **Rate limiting:** login and check-in attempts are limited per IP. The counters live in a MongoDB TTL collection, so the limits hold across serverless instances.
- **Other:** Zod validation on every input, regex-escaped search, CSV formula-injection neutralization, security headers, and `noindex` on public pages.

> A QR code can still be forwarded during its rotation window. For high-stakes training, keep a facilitator in the room and use a short rotation interval.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in MONGODB_URI, AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run seed                 # optional: fictional demo data
npm run dev
```

To try it without installing MongoDB, run `npm run dev:memory`. It starts an in-memory MongoDB, seeds demo data and signs you in with `admin@example.com` / `change-me-now`.

The first sign-in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` creates the owner account. This only works while the database has no administrators. After that, add more administrators from **Settings**.

### Environment variables

| Name | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB connection string (Atlas recommended) |
| `AUTH_SECRET` | yes | 32+ character random string (`openssl rand -base64 48`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | first run | Bootstrap owner credentials |
| `NEXT_PUBLIC_APP_URL` | no | Public base URL embedded in QR codes (defaults to the request host) |

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run dev:memory` | Development server with an in-memory MongoDB and demo data |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run seed` | Load demo data into `MONGODB_URI` (idempotent) |

## Project structure

```
src/
  app/
    (admin)/        authenticated pages: overview, sessions, staff, qr, attendance, reports, ...
    actions/        server actions (auth, admin mutations, public check-in)
    api/            CSV/JSON export, health check
    checkin/[token] public mobile check-in
    login/
  components/       UI primitives and client components (forms, modal, charts, filters)
  lib/              db connection, auth, QR tokens, data queries, validation, rate limiting
  models/           Mongoose schemas and indexes
  proxy.ts          route protection
scripts/            seed and in-memory dev runner
```

## Deployment (Vercel)

1. Create a MongoDB Atlas cluster (or add the MongoDB Atlas integration from the Vercel Marketplace). Allow access from Vercel (`0.0.0.0/0` or Vercel's IP ranges).
2. Import the repository into Vercel and set the environment variables above.
3. Deploy, then check `GET /api/health`.
