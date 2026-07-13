# TopSeed

A full-stack tournament management platform. Create and manage sports tournaments with real-time bracket draws, live score updates, and online payments.

**Live:** [topseed-lilac.vercel.app](https://topseed-lilac.vercel.app)

---

## Features

- **Multi-format brackets** — Single elimination, double elimination, and round robin
- **Multiple event types** — Singles, doubles, and team events under one tournament
- **Real-time updates** — Live score and match status via Socket.io
- **Online payments** — Razorpay integration for paid entry fees
- **Sport-specific scoring** — Configurable rules per event (sets/games for racket sports, match duration for football, etc.)
- **Seedings** — Assign seeds before fixture generation; top seeds get BYEs first
- **Notifications** — Per-user per-tournament toggles for score updates, match start, and status changes
- **Role system** — Super Admin → Admin → User; admins request access through the app
- **Auth** — Google sign-in, email/password (with verification), and phone OTP via Firebase

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
| Hosting | Vercel (frontend) + Render (backend) |

---

## Local Setup

### Prerequisites
- Node.js 18+
- A PostgreSQL database (local or [Neon](https://neon.tech))
- A [Firebase](https://console.firebase.google.com) project with Google and Phone sign-in enabled
- A [Razorpay](https://razorpay.com) test account (optional, only needed for paid events)

### 1. Clone and install

```bash
git clone https://github.com/adityagargdev/topseed.git
cd topseed
npm install
```

### 2. Configure environment variables

**Server** — copy `server/.env.example` to `server/.env` and fill in:

```env
DATABASE_URL=postgresql://...
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
CLIENT_URL=http://localhost:5173
```

**Client** — copy `client/.env.example` to `client/.env` and fill in:

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
├── client/          # React + Vite frontend
│   └── src/
│       ├── api/         # Axios wrappers per resource
│       ├── components/  # Shared UI components and bracket renderers
│       ├── hooks/       # useAuth, useSocket, useEventId
│       ├── pages/       # Route-level page components
│       ├── store/       # Zustand stores (auth, notifications)
│       └── types/       # Shared TypeScript interfaces
└── server/          # Express backend
    ├── prisma/
    │   ├── schema.prisma   # Single source of truth for all models
    │   ├── migrations/     # Prisma migration history
    │   └── seed.ts         # Sports seed data
    └── src/
        ├── controllers/    # Request handlers (Zod validation + Prisma)
        ├── middleware/     # Auth, role guards, error handler
        ├── routes/         # Express routers
        ├── services/       # Bracket generation, round robin, notifications
        └── socket/         # Socket.io setup and emit helpers
```

---

## First-time Admin Setup

There is no self-serve way to create the first Super Admin (chicken-and-egg). Run this once on a fresh database to promote your account:

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

| Service | Platform | Config |
|---|---|---|
| Frontend | Vercel | Root dir: `client`, output: `dist` |
| Backend | Render | Root dir: `server`, see below |

**Render build command:**
```
npm install --include=dev && npx prisma generate && npm run build
```

**Render start command:**
```
npx prisma migrate deploy && node dist/index.js
```

**Render environment variables:** `DATABASE_URL`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `CLIENT_URL`, `NODE_ENV=production`

**Vercel environment variables:** `VITE_SERVER_URL` (your Render URL), plus all `VITE_FIREBASE_*` and `VITE_RAZORPAY_KEY_ID`

After deploying:
1. Add your Vercel domain to Firebase Console → Authentication → Authorized domains
2. Set `CLIENT_URL` on Render to your Vercel URL (fixes CORS)
3. Run the seed script once: `cd server && npx ts-node prisma/seed.ts`

---

## Test Payments (Razorpay test mode)

| Field | Value |
|---|---|
| Card Number | `5267 3181 8797 5449` |
| Expiry | Any future date |
| CVV | Any 3 digits |
| OTP | `123456` |
