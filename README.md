# TopSeed

A full-stack tournament management platform. Create and manage sports tournaments with real-time bracket draws, live score updates, and online payments.

**Live:** [topseed-lilac.vercel.app](https://topseed-lilac.vercel.app)  
**Backend:** [topseed.onrender.com](https://topseed.onrender.com)

---

## Features

### Tournament Management
- **Multi-format brackets** — Single elimination, double elimination, and round robin
- **Multiple event types** — Singles, doubles, and team events under one tournament
- **Seedings** — Assign seeds before fixture generation; top seeds get BYEs first
- **BYE auto-advance** — BYE matches are auto-completed as walkovers on fixture generation inside a single transaction
- **Entry cap** — Optional `maxEntries` limit per event, enforced at registration and during payment
- **Sport-specific scoring config** — Form-based UI (not raw JSON) for racket sports (games/points/deuce), tennis (sets/tiebreak), volleyball (sets/final set/deuce), timed sports (match duration), and round-robin point systems

### Live & Real-time
- **Real-time score updates** — Pushed to all viewers in a tournament room via Socket.io
- **Notifications** — Per-user per-tournament opt-in toggles: score updates, match start, status changes
- **Live badge** — IN_PROGRESS events are visually marked across all views

### Scoring & Results
- **Score modal** — Admins enter scores with auto-winner derivation, can override winner, schedule time, mark live, or award a walkover
- **Winners tab** — Final standings for elimination brackets; W/D/L standings table for round robin

### Payments
- **Online entry fees** — Razorpay integration; fee set per event in ₹
- **Secure flow** — Razorpay checkout popup → HMAC signature verification on the server → entry created atomically on success

### Auth & Roles
- **Auth** — Google sign-in and email/password via Firebase; email verification enforced on signup
- **Role system** — Super Admin → Admin → User; users submit an access request from their profile; super admin approves/rejects from the dashboard
- **Team management** — Captains create teams, add players by email lookup, and register the team in events

### UI / Design
- **Broadcast aesthetic** — Pink-white light mode (`#fdf3f6`) and near-black dark mode (`#060812`)
- **Dark / light toggle** — Class-based Tailwind dark mode, persisted to `localStorage`, FOUC-prevented via inline script in `index.html`
- **Fonts** — Sora (display/body) + JetBrains Mono (labels, metadata, mono values)
- **Design token system** — CSS custom properties (`--bg`, `--surface`, `--text-primary`, `--accent-1/2/3`, etc.) on `:root` and `.dark`
- **Glass cards** — `backdrop-filter: blur` surfaces with 1px token-colored borders throughout
- **Animated hero** — 7 SVG SMIL wave paths morphing between two states, 3 radial-gradient blobs drifting with CSS keyframes, film-grain noise overlay (SVG `feTurbulence`), animated gradient headline, horizontal scrolling ticker
- **PWA** — Installable on Android and iOS; Workbox service worker with shell + font precaching; standalone display mode with dark status bar

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (Neon), Prisma ORM |
| Auth | Firebase Authentication |
| Real-time | Socket.io |
| Payments | Razorpay |
| PWA | vite-plugin-pwa, Workbox |
| Hosting | Vercel (frontend) + Render (backend) |

---

## Local Setup

### Prerequisites
- Node.js 18+
- A PostgreSQL database (local or [Neon](https://neon.tech))
- A [Firebase](https://console.firebase.google.com) project with Google and Email/Password sign-in enabled
- A [Razorpay](https://razorpay.com) test account (optional — only needed for paid events)

### 1. Clone and install

```bash
git clone https://github.com/adityagargdev/topseed.git
cd topseed
npm install
```

### 2. Configure environment variables

**Server** — copy `server/.env.example` to `server/.env`:

```env
DATABASE_URL=postgresql://...
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
CLIENT_URL=http://localhost:5173
```

**Client** — copy `client/.env.example` to `client/.env`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_RAZORPAY_KEY_ID=rzp_test_...
```

### 3. Set up the database

```bash
cd server
npm run db:migrate   # create tables
npm run db:seed      # seed 15 default sports
```

### 4. Run

```bash
cd ..
npm run dev          # starts both client (port 5173) and server (port 4000)
```

---

## Project Structure

```
/
├── client/
│   ├── public/
│   │   ├── trophy.svg          # Favicon + PWA 512px icon
│   │   └── pwa-192.svg         # PWA 192px icon
│   └── src/
│       ├── api/                # Axios wrappers per resource
│       ├── components/
│       │   ├── brackets/       # EliminationBracket, RoundRobinTable
│       │   ├── common/         # EventForm, StatusPill, LoadingSpinner, EventSelector
│       │   ├── hero/           # WaveHero (SVG SMIL waves + blobs + ticker)
│       │   ├── layout/         # Navbar (with dark mode toggle), Layout, TournamentLayout
│       │   └── matches/        # ScoreModal
│       ├── hooks/              # useAuth, useSocket
│       ├── pages/
│       │   ├── admin/          # Dashboard, AdminRequests, Users
│       │   ├── tournaments/    # TournamentList, CreateTournament
│       │   │   └── tournament/ # Organization, Seedings, Draws, Matches, Players, Winners
│       │   ├── Home.tsx
│       │   ├── Login.tsx
│       │   └── Profile.tsx
│       ├── store/              # Zustand: authStore, notificationStore, themeStore
│       └── types/              # Shared TypeScript interfaces
└── server/
    ├── prisma/
    │   ├── schema.prisma       # Single source of truth for all models
    │   ├── migrations/         # Prisma migration history
    │   └── seed.ts             # 15 default sports
    └── src/
        ├── controllers/        # Request handlers (Zod validation + Prisma)
        ├── middleware/         # authenticate, requireAdmin, error handler
        ├── routes/             # Express routers
        ├── services/           # bracket.service, roundrobin.service, notification.service
        └── socket/             # Socket.io setup and emit helpers
```

---

## Key Architecture Notes

- **`Match.nextMatchId` / `loserNextMatchId`** — wire bracket advancement for both elimination formats. Set by `generateFixtures` after batch-inserting all matches (array-index references resolved to real DB IDs in a second pass).
- **`TournamentEntry`** — polymorphic: either `teamId` or `playerId` is non-null (enforced by Prisma unique constraints).
- **`Tournament.scoringConfig`** (JSON) — admin-defined sport rules, e.g. `{ sets: 3, gamesPerSet: 6, tiebreak: true }`. Built by `EventForm` and stored as opaque JSON on the server.
- **`Match.scores`** (JSON) — flexible per-sport shape, e.g. `{ entry1: { goals: 2 }, entry2: { goals: 1 } }`.
- **Theme system** — `themeStore` (Zustand) toggles `.dark` on `<html>` and writes to `localStorage`. An inline `<script>` in `index.html` applies the class synchronously before React hydrates to prevent FOUC.
- **Socket rooms** — `tournament:<id>` for broadcast score/status updates; `user:<id>` for personal notifications.
- **BYE handling** — `assignByesToTopSeeds` places BYEs against the highest-seeded entries. All BYE matches are immediately marked `WALKOVER` with the winner advanced to R2 inside the same DB transaction as fixture generation.
- **Double elimination** — WB losers drop into the LB at the correct round; LB has alternating "drop-in" rounds (even) and "survivor" rounds (odd). WB Final winner → GF slot 1; LB Final winner → GF slot 2.

---

## First-time Admin Setup

There is no self-serve way to create the first Super Admin. Run this once on a fresh database:

```bash
cd server
npx ts-node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.updateMany({ where: { email: 'your@email.com' }, data: { role: 'SUPER_ADMIN' } })
  .then(r => { console.log('Done:', r); p.\$disconnect(); })
"
```

After that, other users can request admin access from their Profile page and you can approve them from the Admin dashboard.

---

## Deployment

| Service | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Root dir: `client`, output: `dist` |
| Backend | Render | Free tier — spins down after inactivity |

**Render build command:**
```
npm install --include=dev && npx prisma generate && npm run build
```

**Render start command:**
```
npx prisma migrate deploy && node dist/index.js
```

**Render environment variables:** `DATABASE_URL`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `CLIENT_URL`, `NODE_ENV=production`

**Vercel environment variables:** `VITE_SERVER_URL` (your Render URL), all `VITE_FIREBASE_*`, `VITE_RAZORPAY_KEY_ID`

**Post-deploy checklist:**
1. Add your Vercel domain to Firebase Console → Authentication → Authorized domains
2. Set `CLIENT_URL` on Render to your Vercel production URL (fixes CORS)
3. Seed sports once: `cd server && npx ts-node prisma/seed.ts`

---

## Installing as an App (PWA)

TopSeed is a Progressive Web App and can be installed directly to your home screen.

- **Android (Chrome):** An install banner appears automatically, or tap the three-dot menu → *Add to Home Screen*
- **iOS (Safari):** Tap the Share icon → *Add to Home Screen*

The installed app runs full-screen (no browser chrome), caches the shell and fonts locally via a Workbox service worker, and loads instantly on repeat visits.

---

## Test Payments (Razorpay test mode)

| Field | Value |
|---|---|
| Card Number | `5267 3181 8797 5449` |
| Expiry | Any future date |
| CVV | Any 3 digits |
| OTP | `123456` |
