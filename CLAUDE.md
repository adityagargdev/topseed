# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Change Log

Track every meaningful change here when a session ends. Read this first in any new session to get fully caught up.

### Session 8 — 2026-07-17

**Admin guest entry and custom draw — organizers can now add players by name and define matchups manually.**

#### Schema changes
- Added `guestName String?` and `guestPartnerName String?` to `TournamentEntry`
- Added `@@unique([eventId, guestName])` constraint
- Migration: `20260717000000_add_guest_entry` (applied to Neon via `db push`; migration file committed for Render's `prisma migrate deploy`)

#### Server changes (`server/src/controllers/tournament.controller.ts`)
- `addGuestEntry` — new admin-only handler: `POST /api/tournaments/:id/entries`. Takes `{ eventId, name, partnerName? }`, creates a `TournamentEntry` with `guestName` set (no Firebase account needed). Respects `maxEntries` cap.
- `removeEntry` — new admin-only handler: `DELETE /api/tournaments/:id/entries/:entryId`. Deletes any entry by ID (guest or registered).
- Both wired in `server/src/routes/tournament.routes.ts`

#### Client changes
- `client/src/types/index.ts`: added `guestName?: string | null` and `guestPartnerName?: string | null` to `TournamentEntry`
- `client/src/lib/utils.ts`: `getEntryName()` now handles `guestName` — returns `"Name"` for singles guests, `"Name / PartnerName"` for doubles guests. Falls back to `'TBD'` if none of team/player/guestName is set.
- `client/src/api/tournaments.ts`: added `addGuestEntry(tournamentId, eventId, name, partnerName?)` and `removeEntry(tournamentId, entryId)`
- `client/src/pages/tournaments/tournament/Players.tsx`:
  - `AdminAddPanel` component — shown to admins above the entry list regardless of event status. Single name input for SINGLES/TEAM; two inputs for DOUBLES. Calls `addGuestEntry` on submit.
  - `EntryCard` now accepts `isAdmin` + `onRemove` props — renders an ✕ button (top-right) for admins to delete any entry.
  - Guest entries show a "Guest" label.
- `client/src/pages/tournaments/tournament/Draws.tsx`:
  - "Auto Generate" button renamed (was "Generate Fixtures") to distinguish from new option
  - New "Custom Draw" toggle button in the admin fixture panel (visible when ≥2 entries exist)
  - `CustomDrawPanel` component: click-to-pair UX — admin clicks an entry chip to select it, clicks a second to pair them as a match. Pairs listed as `R1 M1`, `R1 M2`, etc. with ✕ to unpair. "Create Draw" submits pairs via `generateFixtures(mode='manual')`. Warns if one entry is left unpaired (BYE).

#### Committed & pushed
- Commit: `bb9e4c8` — pushed to `https://github.com/adityagargdev/topseed`
- Render will auto-apply the migration on next deploy

---

#### ▶ WHERE TO RESUME NEXT SESSION

1. **Fix double-elimination round labels** — `EliminationBracket.tsx` uses `max - round` heuristic which mislabels LB rounds (known issue, low priority)
2. **Any bugs found in production** — app is live, real-world testing may surface issues

---

### Session 7 — 2026-07-13

**Mobile responsiveness, UI polish, and full deployment to GitHub + Render + Vercel.**

#### Mobile fixes
- `client/src/components/layout/Navbar.tsx`: Added hamburger menu (`Menu`/`X` icons) for mobile — previously nav links were `hidden md:flex` with no fallback, making Tournaments unreachable on mobile. Mobile dropdown shows Tournaments, Admin (if applicable), Profile, Sign Out / Sign In. All links close the menu on tap.
- `client/src/pages/Home.tsx`: Hero padding `py-20` → `py-12 sm:py-20`, title `text-5xl` → `text-4xl sm:text-5xl` to prevent overflow on small screens.
- `client/src/components/layout/TournamentLayout.tsx`: Tab padding `px-4` → `px-3 sm:px-4`. Bell button extracted outside the scrollable `<nav>` as a fixed `shrink-0` sibling so it doesn't push tabs off-screen.

#### UI improvements (from previous session, applied this session)
- `Navbar.tsx`: Dark `bg-slate-900` background, white/primary-400 logo, gray-400 icon buttons
- `Home.tsx`: Gradient hero (slate-900 → blue-950 → slate-900) with subtle grid overlay, live badge, colored top strip on cards, hover lift effect
- `TournamentList.tsx`: Same card design as Home
- `client/src/index.css`: Smooth scroll + thin custom scrollbar

#### Scoring Config UI rewrite (`client/src/components/common/EventForm.tsx`)
- Added `sportName?: string` prop (passed from `Organization.tsx`)
- `getSportCategory()` maps sport name → `'racket' | 'tennis' | 'volleyball' | 'timed' | 'other'`
- Sport-specific fields replace raw JSON textarea: racket (games/points/deuce), tennis (sets/games/tiebreak), volleyball (sets/points/final set/deuce), timed (match duration), other (raw JSON fallback)
- Round Robin events get Win/Draw/Loss points fields below sport fields
- `configToFields()` / `fieldsToConfig()` handle bidirectional JSON ↔ form conversion for edit mode

#### Other features (from previous session summary)
- BYE assignment: higher seeds always get BYEs first (`assignByesToTopSeeds` in `bracket.service.ts`)
- `maxEntries` cap enforced in `registerEntry` and `createOrder`; falls back to `registrationDeadline` when no cap set
- Email verification enforced: signup sends verification email + signs out immediately; signin checks `emailVerified` flag

#### Deployment
- Initialized git repo, created GitHub repo: `https://github.com/adityagargdev/topseed`
- Backend deployed to **Render** (free tier, separate account): `https://topseed.onrender.com`
  - Build: `npm install --include=dev && npx prisma generate && npm run build`
  - Start: `npx prisma migrate deploy && node dist/index.js`
- Frontend deployed to **Vercel**: `https://topseed-lilac.vercel.app`
  - Root dir: `client`, output: `dist`
- `client/src/lib/axios.ts`: baseURL uses `VITE_SERVER_URL` env var (falls back to `/api` for local dev)
- `client/src/hooks/useSocket.ts`: Socket.io connects to `VITE_SERVER_URL` (falls back to `/` for local dev)
- `vercel.json`: SPA catch-all rewrite added
- `render.yaml`: service config committed
- Fixed TS build errors on Vercel: added `"types": ["vite/client"]` to `client/tsconfig.json`; fixed `t._count?.entries` → `t._count?.events` in `Home.tsx`
- Sports seeded to production DB by running `npx ts-node prisma/seed.ts` locally (Render shell not available on free plan)
- Firebase authorized domain: `topseed-lilac.vercel.app` added
- Render `CLIENT_URL` env var set to `https://topseed-lilac.vercel.app`

#### Razorpay test card (works in test mode)
- Card: `5267 3181 8797 5449`, any future expiry, any CVV, OTP `123456`

---

#### ▶ WHERE TO RESUME NEXT SESSION

1. **Fix double-elimination round labels** — `EliminationBracket.tsx` uses `max - round` heuristic which mislabels LB rounds (known issue, low priority)
2. **Any bugs found in production** — app is live, real-world testing may surface issues

---

### Session 6 — 2026-07-13

**Razorpay payment integration — entry fees for paid events.**

#### Schema changes
- Added `entryFee Int?` (in paise, null = free) to `TournamentEvent`
- Added `PaymentStatus` enum (`PENDING | COMPLETED | FAILED`)
- Added `Payment` model — tracks Razorpay order ID, payment ID, amount, status, and links to User, TournamentEvent, and TournamentEntry
- Migration: `20260713045748_add_payment`

#### New server files
- `server/src/controllers/payment.controller.ts` — `createOrder` (creates Razorpay order + pending Payment record) and `verifyPayment` (HMAC signature check → marks COMPLETED → creates TournamentEntry in a transaction)
- `server/src/routes/payment.routes.ts` — `POST /api/payments/create-order` and `POST /api/payments/verify`, both authenticated

#### Server edits
- `server/src/routes/index.ts`: mounted `/payments` routes
- `server/src/controllers/event.controller.ts`: added `entryFee` to Zod schema
- `server/src/controllers/tournament.controller.ts`: `registerEntry` now throws 400 if event has `entryFee > 0` (must go through payment flow)

#### New client files
- `client/src/api/payments.ts` — `createOrder(eventId, partnerId?)` and `verify(data)` wrappers

#### Client edits
- `client/src/types/index.ts`: added `entryFee?: number | null` to `TournamentEvent`
- `client/src/components/common/EventForm.tsx`: added Entry Fee ₹ number input (stored in rupees in form state, converted to paise on submit). Edit mode correctly converts paise→rupees for display.
- `client/src/pages/tournaments/tournament/Players.tsx`: `RegistrationPanel` now shows fee badge (₹X or Free), button says "Pay ₹X & Register" for paid events. Loads Razorpay script dynamically, opens checkout popup, calls verify on success.

#### Env vars added
- `server/.env`: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- `client/.env`: `VITE_RAZORPAY_KEY_ID` (public key only)

#### Tested
- ✅ Admin sets entry fee on event (e.g. ₹200)
- ✅ Player sees "Pay ₹200 & Register" button
- ✅ Razorpay popup opens, payment goes through with Mastercard test card (`5267 3181 8797 5449`, OTP `123456`)
- ✅ Player appears in entries list after payment

#### Notes
- Phone OTP sign-in requires Firebase Blaze plan (pay-as-you-go) for real SMS — free tier blocks it. 10,000 SMS/month free after upgrade.
- Razorpay test UPI (`success@razorpay`) wasn't available on new account — domestic Mastercard test card worked instead.

---

#### ▶ WHERE TO RESUME NEXT SESSION

**Priority order:**

1. **Fix Scoring Config UI** — replace raw JSON textarea in event form with proper sport-specific fields. File: `client/src/components/common/EventForm.tsx`

2. **Enforce `maxEntries` cap** — `registerEntry` in `server/src/controllers/tournament.controller.ts` never checks `event.maxEntries`

3. **Test remaining pages** — Seedings, Notifications bell, Admin pages

4. **Fix double-elimination round labels** — `EliminationBracket.tsx` uses `max - round` heuristic that breaks for LB rounds

5. **GitHub + Deployment** — Vercel (frontend) + Render (backend)

---

### Session 5 — 2026-07-13

**First real run-through: fixed env, database, and several runtime bugs found during smoke testing.**

#### Infrastructure
- Moved database from Railway (trial ended) to **Neon** (free PostgreSQL cloud). `DATABASE_URL` in `server/.env` now points to Neon.
- Fixed `server/.env` formatting: all keys had leading spaces, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` both had trailing commas included in values — this broke Firebase Admin SDK initialization silently.
- Fixed `client/.env` formatting: same leading-space issue on all keys.
- Added startup logging to `server/src/config/firebase-admin.ts` — now prints `[Firebase Admin] Initialized successfully ✓` or a clear error with which env var is missing/wrong.
- Switched Google sign-in to surface server errors directly (was silently swallowing them via store's `syncUser`). `Login.tsx` now calls `POST /api/auth/sync` directly so any failure shows as a visible red error message.

#### Bug fixes
- **`server/src/controllers/tournament.controller.ts`**: `locationUrl`, `startDate`, `endDate`, `registrationDeadline` all used Zod validators that rejected empty strings (`""`) sent from blank form inputs. Fixed with `z.preprocess(v => v === '' ? undefined : v, ...)` on all four fields.
- **`server/src/services/bracket.service.ts`**: For exactly 2 players (1 round), the only match got `bracketSlot: 'R1 M1'` instead of `'F M1'`. The `getWinners` endpoint looks for slots starting with `'F'` and found nothing — Winners tab always showed "event has not concluded yet". Fixed by using `r1SlotPrefix = numRounds === 1 ? 'F' : 'R1'` in Round 1 loop.
- **`client/src/pages/tournaments/tournament/Players.tsx`**: Page was display-only — no way for a user to register. Added `RegistrationPanel` component that shows when event status is `REGISTRATION_OPEN` and user is logged in. Handles Singles (one-click), Doubles (partner ID input), and Team (info message pointing to Profile). Also shows "✓ You are registered" + Withdraw button for already-registered users.

#### Manual role promotion
- No UI exists to promote the first user to SUPER_ADMIN (chicken-and-egg). Run this once on a fresh DB:
  ```
  cd server && npx ts-node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.user.updateMany({where:{}, data:{role:'SUPER_ADMIN'}}).then(r => { console.log('Done:', r); p.\$disconnect(); })"
  ```

#### Smoke test results
- ✅ Google sign-in
- ✅ Create tournament
- ✅ Add event + set status to Registration Open
- ✅ Register players (two accounts via incognito window)
- ✅ Generate fixtures (Draws tab)
- ✅ Enter score via ScoreModal (Matches tab)
- ✅ Winners tab shows correct winner

#### NOT yet tested
- Seedings tab (assign seeds, view read-only)
- Notification bell (per-tournament per-user toggles)
- Team event registration flow
- Admin dashboard / Admin requests page / Admin users page
- Double-elimination and Round Robin formats

---

#### ▶ WHERE TO RESUME NEXT SESSION

**Priority order:**

1. **Fix Scoring Config UI** — currently a raw JSON textarea, bad for real users. Replace with sport-specific form fields (number inputs, checkboxes) that build the JSON internally. File: `client/src/components/common/EventForm.tsx` (or wherever the event create/edit form lives).

2. **Enforce `maxEntries` cap** — `registerEntry` in `server/src/controllers/tournament.controller.ts` never checks `event.maxEntries`. Add: count current entries, throw 400 if at cap.

3. **Test remaining pages** — Seedings, Notifications bell, Admin pages. Likely more bugs.

4. **Fix double-elimination round labels** — `EliminationBracket.tsx` uses `max - round` heuristic for labels (Final/SF/QF) which breaks for LB rounds with higher round numbers.

5. **GitHub + Deployment** — Push to GitHub, deploy frontend to Vercel, backend to Render. Needs:
   - Add a `render.yaml` or document Render build/start commands (`npm run build`, `node dist/index.js`)
   - Vercel: set `client/` as root dir, `npm run build`, `dist/` as output
   - All env vars (Firebase, Neon DB URL) need to be set in both Render and Vercel dashboards
   - CORS: server `CLIENT_URL` env var must be set to the Vercel production URL

---

### Session 4 — 2026-07-13

**Filled all UI gaps. App is now fully usable end-to-end from the browser.**

#### Server additions
- `auth.controller.ts` + `auth.routes.ts`: Added `GET /auth/lookup?email=` — looks up a user by email, used by team management to add players
- `team.controller.ts` + `team.routes.ts`: Added `GET /teams/mine` — returns all teams where the logged-in user is captain
- `GET /teams/mine` route placed before `GET /:id` to avoid Express treating "mine" as an id param

#### New client files
- `components/matches/ScoreModal.tsx` — Admin modal for match management: score entry with auto-winner derivation, winner override buttons, schedule time picker, Mark Live / Walkover / Save Score actions. Auto-detects existing score key (goals/points/runs/gamesWon/setsWon) and pre-fills.
- `pages/admin/Users.tsx` — Super admin user table with inline role selector dropdown

#### Client edits
- `Navbar.tsx`: "SMS" → "TopSeed" branding
- `api/teams.ts`: Added `mine()` and `lookupByEmail(email)` methods
- `types/index.ts`: Added `RRStanding` interface (used by Winners page)
- `Matches.tsx`: Admin users see a pencil icon on each match row and can click to open ScoreModal. Tournament ownership is checked via a tournament query.
- `Draws.tsx`: Admin panel above the bracket — "Generate Fixtures" button when no matches exist; "Regenerate" (with confirmation warning) when matches already exist. Shows entry count and event format.
- `Seedings.tsx`: Full rewrite — admins see all entries with editable seed number inputs and a batch Save button; non-admins see read-only sorted seedings list.
- `Winners.tsx`: Fixed RR standings showing partial IDs — now fetches entries in parallel and cross-references to show real names with W/D/L detail line.
- `TournamentLayout.tsx`: Added notification settings bell button in the tab bar. Opens an inline panel with toggle switches for scoreUpdates, matchStart, statusChange — fetches and saves per-tournament per-user settings.
- `Profile.tsx`: Added User ID display with copy button (needed to be added to teams). Added full Team Management section — create teams, view players, add player by email (uses `/auth/lookup`), remove players.
- `App.tsx`: Added `/admin/users` route (Super Admin only) wired to the new Users page.

#### Remaining known gaps
- `maxEntries` field on TournamentEvent is not enforced during registration — no cap check.
- EliminationBracket round labels may be incorrect in double-elimination context (LB rounds have higher numbers than WB rounds, confusing the `remaining = max - round` label logic).
- Standings logic duplicated between server (`roundrobin.service.ts`) and client (`RoundRobinTable.tsx`).

---

### Session 3 — 2026-07-13

**Project renamed from "Sports Management System" to "TopSeed". No logic changes.**

- `package.json` (root): `"name"` → `"topseed"`
- `client/package.json`: `"name"` → `"topseed-client"`
- `server/package.json`: `"name"` → `"topseed-server"`
- `client/index.html`: `<title>` and `<meta name="description">` updated to TopSeed
- `client/src/pages/Home.tsx`: hero `<h1>` updated to TopSeed
- `CLAUDE.md`: project overview updated to TopSeed
- **Not changed**: `.env` Firebase project IDs (`sports-management-system-99eb5`) — these are tied to the live Firebase project and can only be changed by renaming/recreating the Firebase project itself.

---

### Session 2 — 2026-07-13

**Bug fixes across 4 server files. No schema changes. No new features.**

#### `server/src/middleware/auth.middleware.ts`
- Replaced `findUnique` + `create` with `upsert` for first-login user creation to eliminate a race condition where two concurrent requests would both create the same Firebase user and crash with a unique constraint error.

#### `server/src/controllers/match.controller.ts`
- **Critical**: Fixed bracket advancement in `updateScore` — was incorrectly writing `match.id` (the match's own DB id) into the next match's entry slot instead of `winnerId` (the winning TournamentEntry id). This meant no winner ever advanced in any bracket.
- `scheduleMatch`: Added tournament ownership check (any authenticated user could previously reschedule any match in any tournament).
- `updateMatchStatus`: When status is set to `COMPLETED` or `WALKOVER` and a `winnerId` is already set on the match, the bracket is now advanced (winner to next match, loser to loser-match). Previously only `updateScore` advanced the bracket; this created a second broken code path.

#### `server/src/services/bracket.service.ts`
- **Complete rewrite of `generateDoubleElimination`**. The old version created LB + GF match stubs but never wired any of them (no `nextMatchId`, no `loserNextMatchId` links at all). Now correctly wires:
  - WB R1 losers → LB R1 (paired 2-per-match)
  - LB R1 winners → LB R2 slot 1
  - WB Rk losers (k≥2) → LB R(2k−2) slot 2
  - LB even rounds → LB odd rounds (pairs halve into one match)
  - LB odd rounds (k≥2) → next even LB round slot 1
  - LB Final winner → Grand Final slot 2 / WB Final winner → Grand Final slot 1
- LB match count formula fixed: even LB rounds keep same count as previous (receive WB drop-ins), odd LB rounds (≥3) halve (pure survivor matches).

#### `server/src/controllers/tournament.controller.ts`
- **BYE auto-advance**: After fixture generation for elimination brackets, any R1 match where exactly one entry is null is now immediately marked `WALKOVER` (with `winnerId` + `completedAt`) and the advancing entry is placed into the next round's match — all inside the same transaction.
- **Transaction safety**: All three `generateFixtures` paths (manual, round-robin, elimination) now delete existing matches **inside** their transaction. Previously the delete was committed before the create began, so a creation failure would leave the event with no matches.
- `registerEntry`: Added duplicate-registration check (returns 409 if player already has an entry for this event). Added self-partner check for doubles (returns 400 if `partnerId === player.id`).
- `withdrawEntry`: Now correctly handles `TEAM` events by finding the captain's team entry; previously only looked for a player entry and silently returned success without deleting anything for team events.
- `listTournaments`: Added `OR: [{ isPublic: true }, { adminId: user.id }]` so admins can see their own private tournaments in the list. Previously hardcoded `isPublic: true` hid private tournaments from their own creator.
- `updateTournament`: Added separate `updateSchema` that allows `password: null` to clear a password. Previously there was no way to remove a password from a private tournament once set.
- `updateSeedings`: Now validates that all supplied `entryId`s actually belong to an event within this tournament before updating. Previously a tournament admin could update seedings of entries belonging to other tournaments if they knew the IDs.

#### Known remaining items (not yet fixed)
- Standings logic is duplicated between `server/src/services/roundrobin.service.ts:calculateStandings` and `client/src/components/brackets/RoundRobinTable.tsx:calcStandings`. If tiebreaker logic is ever changed, both must be updated. Acceptable for now since client-side standings are used for live-updating the table without a full refetch.
- `maxEntries` field exists on `TournamentEvent` but is not enforced in `registerEntry` — no cap check is done when a player registers.
- `EliminationBracket.tsx` round labels (`Final`, `Semi-Finals`, etc.) use the max round number heuristic which may mislabel rounds in a double-elimination bracket where LB rounds have much higher round numbers than WB rounds.

---

## Project Overview

**TopSeed** — a full-stack tournament management platform.  
Stack: React (Vite) + Node.js/Express + PostgreSQL (Prisma) + Socket.io + Firebase Auth.

## Commands

### Development
```bash
# Run both client and server in parallel (from root)
npm run dev

# Run server only
cd server && npm run dev

# Run client only
cd client && npm run dev
```

### Database
```bash
cd server

npm run db:generate      # Regenerate Prisma client after schema changes
npm run db:migrate       # Create and apply a new migration
npm run db:push          # Push schema to DB without migration (dev only)
npm run db:seed          # Seed sports data
npm run db:studio        # Open Prisma Studio GUI
```

### Build
```bash
npm run build            # Build both client and server
cd server && npm run build
cd client && npm run build
```

## Environment Setup

1. Copy `server/.env.example` → `server/.env` and fill in:
   - `DATABASE_URL` — PostgreSQL connection string
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — from Firebase Console → Service Accounts

2. Copy `client/.env.example` → `client/.env` and fill in:
   - `VITE_FIREBASE_*` — from Firebase Console → Project Settings → Your Web App

3. In Firebase Console: enable **Google** and **Phone** sign-in under Authentication → Sign-in methods.

4. Run `cd server && npm run db:migrate && npm run db:seed` on first setup.

## Architecture

```
/
├── client/          # React + Vite + TypeScript frontend
└── server/          # Express + TypeScript backend
```

### Server (`server/src/`)

| Path | Purpose |
|---|---|
| `index.ts` | HTTP server entry — creates server, attaches Socket.io |
| `app.ts` | Express app — CORS, middleware, mounts `/api` router |
| `config/prisma.ts` | Singleton Prisma client |
| `config/firebase-admin.ts` | Firebase Admin SDK init |
| `middleware/auth.middleware.ts` | `authenticate` (required) / `optionalAuth` — verifies Firebase JWT, auto-creates User row on first login |
| `middleware/role.middleware.ts` | `requireAdmin` / `requireSuperAdmin` guards |
| `middleware/error.middleware.ts` | Centralized error handler + `AppError` class |
| `socket/index.ts` | Socket.io setup — rooms per tournament (`tournament:<id>`), per user (`user:<id>`). Exports `emitScoreUpdate`, `emitMatchStatus`, `emitNotification` |
| `routes/` | One file per resource, all mounted in `routes/index.ts` |
| `controllers/` | Request handlers — validate with Zod, call Prisma, return JSON |
| `services/bracket.service.ts` | Single & double elimination generator. Uses standard seed-spread algorithm (1v16, 2v15, …). Returns `GeneratedMatch[]` with array-index-based `nextMatchId` references that the tournament controller resolves to DB IDs after batch insert |
| `services/roundrobin.service.ts` | Circle-method round-robin generator + `calculateStandings()` |
| `services/notification.service.ts` | `notifyMatchUpdate()` — queries user notification settings, creates DB records, emits via Socket.io |
| `prisma/schema.prisma` | Single source of truth for all models |
| `prisma/seed.ts` | Seeds the 15 default sports |

### Client (`client/src/`)

| Path | Purpose |
|---|---|
| `main.tsx` | React entry point |
| `App.tsx` | `createBrowserRouter` router tree + `QueryClientProvider` |
| `firebase.ts` | Firebase app init — exports `auth`, `googleProvider`, sign-in helpers |
| `lib/axios.ts` | Axios instance — auto-attaches Firebase ID token as `Bearer` header |
| `lib/utils.ts` | `cn()`, `formatDate()`, `getEntryName()`, `STATUS_COLORS` |
| `store/authStore.ts` | Zustand store — `user`, `loading`, `syncUser()` |
| `store/notificationStore.ts` | Zustand store — notification list + unread count |
| `hooks/useAuth.ts` | `useAuthInit()` — subscribes to `onAuthStateChanged`, calls `syncUser` |
| `hooks/useSocket.ts` | Connects Socket.io, joins tournament room, pipes `notification` events to store |
| `api/` | One file per resource — thin wrappers over the Axios instance |
| `components/brackets/EliminationBracket.tsx` | Renders single/double elimination bracket grouped by round |
| `components/brackets/RoundRobinTable.tsx` | Standings table + fixture grid for round-robin |
| `components/layout/TournamentLayout.tsx` | Tournament sub-nav (Organization / Seedings / Draws / Matches / Players / Winners) |
| `pages/tournaments/tournament/` | One page per tournament tab |

### Data Model Key Points

- **`Tournament.scoringConfig`** (JSON) — admin-defined sport-specific rules, e.g. `{ matchDuration: 90, pointsWin: 3 }`.
- **`Match.scores`** (JSON) — flexible per-sport score shape, e.g. `{ entry1: { goals: 2 }, entry2: { goals: 1 } }`.
- **`TournamentEntry`** — polymorphic: `teamId`, `playerId`, or `guestName` is set. Guest entries (admin-added, no Firebase account) use `guestName`/`guestPartnerName`. Unique constraints cover all three cases per event.
- **`Match.nextMatchId` / `loserNextMatchId`** — wire bracket advancement. Set by `generateFixtures` controller after batch-inserting all matches.
- **`NotificationSetting`** — per-user per-tournament opt-in flags (`scoreUpdates`, `matchStart`, `statusChange`).

### Auth Flow

1. User signs in via Google popup or phone OTP in `Login.tsx`.
2. Client calls `POST /api/auth/sync` with Firebase ID token → server verifies via Firebase Admin, upserts `User` row, returns user object.
3. Subsequent requests attach the token via the Axios interceptor.
4. `authenticate` middleware validates token and attaches `req.user` on every protected route.

### Real-time Flow

1. Client connects Socket.io with the Firebase ID token on mount (`useSocket`).
2. When viewing a tournament, the client emits `join:tournament` for that room.
3. Admin updates a score → `PATCH /api/matches/:id/score` → server emits `score:update` to `tournament:<id>` room.
4. `Draws.tsx` and `Matches.tsx` listen for `score:update` and refetch match data.

### Fixture Generation

- **Auto (elimination)**: `generateSingleElimination` / `generateDoubleElimination` in `bracket.service.ts` produce `GeneratedMatch[]` with numeric string `nextMatchId` references (array indices). The `generateFixtures` controller batch-inserts all matches then runs a second pass to resolve indices to real DB IDs.
- **Auto (round-robin)**: `generateRoundRobin` uses the circle method.
- **Manual**: Admin POSTs explicit `matches[]` array.
- Calling `generateFixtures` again deletes and regenerates all matches.
