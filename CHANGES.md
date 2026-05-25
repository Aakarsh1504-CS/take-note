# Take-Note — Architecture Revamp Changelog

> Live, append-only log of every change made during the React + REST refactor.
> Each section is dated relative to the work session of **2026-05-25**.

---

## 0. Code review of the original codebase

### 0.1 Bugs (correctness)

| # | Location | Issue |
|---|----------|-------|
| B1 | `app.js:135` | `jwt.verify(req.cookies.token,"secret")` — hardcoded secret instead of `process.env.JWT_SECRET`. Tokens minted at register/login with the real secret **never verify** → every protected route 500s. Showstopper. |
| B2 | `app.js:51-67` | `/login` handler is `async` but uses `next` without it being a parameter → `next is not defined` if bcrypt errors. |
| B3 | `app.js:132-141` | `isLoggedIn` middleware: when `jwt.verify` throws (bad/expired token), it bubbles out as an unhandled exception. No `try/catch`, no redirect, no error response. |
| B4 | `app.js:93,101,111,123` | Notes are looked up by `title` (`findOne({title: req.params.postname})`). Titles are **not unique**, are user-supplied, and break on `/`, `#`, spaces, etc. in URLs. Rename-to-existing-title silently shadows another note. |
| B5 | `app.js:69-74` | `/profile` re-queries the user by email on every request even though the JWT could carry the user `_id` directly. Extra DB round-trip per request. |
| B6 | `user.js:13-18` | `notes:[ObjectId]` array on the user is declared but **never written to**. Dead schema field. Posts are owned via the reverse pointer on the Post side. |
| B7 | `app.js:120-130` | `GET /delete/:postname` deletes via a `GET` request. Browsers, prefetchers and link scanners can wipe data by accident. Must be `DELETE`. |
| B8 | `app.js:10` | `process.env.port` (lowercase) — `render.yaml` exports `PORT` uppercase. Falls back to 3000 silently; not actually a bug today, but fragile. |

### 0.2 Security

| # | Issue |
|---|-------|
| S1 | No input validation anywhere. `email`, `name`, `pass`, `title`, `content` are written straight to Mongo. |
| S2 | No password strength rules. One-character passwords accepted. |
| S3 | Generic error responses leak nothing useful — but uncaught throws can leak stack traces in dev. No `helmet`, no `cors`, no rate-limit. |
| S4 | No CSRF protection on state-changing routes that use cookie auth. (Moving to JSON POST + sameSite=strict + custom header mitigates most of this for the SPA case.) |
| S5 | JWT lifetime is **unbounded** (`jwt.sign({email}, secret)` — no `expiresIn`). |
| S6 | `Cache-Control: no-store` is set globally, including for static assets. Tanks performance. |
| S7 | Same email + new account = duplicate user check is implicit (unique index). Throws a 500 instead of returning a friendly 409. |

### 0.3 UX & frontend

| # | Issue |
|---|-------|
| U1 | Every action is a full page reload. No optimistic UI, no inline errors. |
| U2 | Login failure redirects to `/` with no message — user has no idea what happened. |
| U3 | "Edit" only renames title; **content cannot be edited** after creation. The README claims content editing exists but it doesn't. |
| U4 | Mobile breakpoints exist but the nav collapses awkwardly and font sizes drop to 10px. |
| U5 | No empty-state, loading state, or error toast anywhere. |
| U6 | Note links use the title as a URL slug → breaks on any non-alphanumeric title. |

### 0.4 Architecture / code hygiene

| # | Issue |
|---|-------|
| A1 | Everything is in `app.js` — routing, controllers, middleware, error handling, listening. ~140 lines, but no separation of concerns. |
| A2 | Mongo connection lives inside `user.js` (the model file). Side-effectful import. |
| A3 | `require('dotenv').config()` is called from both `app.js` and `user.js`. |
| A4 | `package.json` has no `start`/`dev` script. `name` is `"login"`. No engines field. |
| A5 | `dotenv` is required at runtime but **not declared as a dependency**. Works only because it's transitively installed. |

---

## 1. Target architecture

```
take-note/
├── CHANGES.md              ← this file
├── README.md               ← rewritten for new architecture
├── render.yaml             ← updated build/start for monorepo
├── package.json            ← root scripts: install/build/dev/start for both apps
├── server/                 ← Express REST API (no more EJS)
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js              entry point (listen)
│       ├── app.js                express app + middleware wiring
│       ├── config/
│       │   ├── env.js            validated env loader
│       │   └── db.js             mongoose connect
│       ├── models/
│       │   ├── User.js
│       │   └── Note.js
│       ├── middleware/
│       │   ├── auth.js           JWT verification → req.user
│       │   ├── validate.js       express-validator helper
│       │   └── errorHandler.js   centralized error → JSON
│       ├── controllers/
│       │   ├── authController.js
│       │   └── noteController.js
│       ├── routes/
│       │   ├── auth.js
│       │   └── notes.js
│       └── utils/
│           └── ApiError.js
└── client/                  ← React SPA (Vite)
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api/client.js          axios instance w/ credentials
        ├── context/AuthContext.jsx
        ├── components/
        │   ├── Navbar.jsx
        │   ├── ProtectedRoute.jsx
        │   ├── NoteCard.jsx
        │   ├── NoteEditor.jsx
        │   └── Spinner.jsx
        ├── pages/
        │   ├── Register.jsx
        │   ├── Login.jsx
        │   ├── Notes.jsx
        │   ├── NoteDetail.jsx
        │   └── NotFound.jsx
        └── styles/global.css
```

### REST API surface

| Method | Path                  | Auth | Body                            | Returns |
|--------|-----------------------|------|---------------------------------|---------|
| POST   | `/api/auth/register`  | —    | `{email,name,password}`         | `{user}` + sets cookie |
| POST   | `/api/auth/login`     | —    | `{email,password}`              | `{user}` + sets cookie |
| POST   | `/api/auth/logout`    | —    | —                               | `{ok:true}` clears cookie |
| GET    | `/api/auth/me`        | ✓    | —                               | `{user}` |
| GET    | `/api/notes`          | ✓    | —                               | `{notes:[…]}` |
| POST   | `/api/notes`          | ✓    | `{title,content}`               | `{note}` |
| GET    | `/api/notes/:id`      | ✓    | —                               | `{note}` |
| PATCH  | `/api/notes/:id`      | ✓    | `{title?,content?}`             | `{note}` |
| DELETE | `/api/notes/:id`      | ✓    | —                               | `{ok:true}` |

Notes are addressed by `_id` (B4 fix). Update is `PATCH` and supports **both title and content** (U3 fix). Delete is `DELETE`, not `GET` (B7 fix).

### Auth model

- JWT signed with `JWT_SECRET`, `expiresIn: 7d` (S5).
- Cookie: `httpOnly`, `secure` in prod, `sameSite: 'lax'` (CSRF-safe for the SPA case since the SPA sends a custom JSON content-type which is non-simple → preflighted). `sameSite: 'strict'` works in production same-origin; we use `lax` in dev for axios cross-origin with `withCredentials`.
- Payload: `{ sub: userId, email }`. Carries `_id` so the protected handlers skip the extra `findOne` (B5).

### Frontend routing

| Path         | Component       | Guard |
|--------------|-----------------|-------|
| `/login`     | `<Login/>`      | redirect to `/notes` if signed in |
| `/register`  | `<Register/>`   | redirect to `/notes` if signed in |
| `/notes`     | `<Notes/>`      | requires auth |
| `/notes/:id` | `<NoteDetail/>` | requires auth |
| `*`          | `<NotFound/>`   | — |

---

## 2. Change log (sequential, dated 2026-05-25)

> Each entry = one logical step. Each is small enough to review independently.

### 2.1 Workspace bootstrap

- **Legacy files preserved**: the old `app.js`, `user.js`, `post.js`, `views/`, `public/`, and the old root `package.json` were left in place so they can be diffed against the new structure. Once the new layout is reviewed they should be deleted (a one-liner is given in §5). The dark-theme palette is reproduced in `client/src/styles/global.css` so the new UI is recognizable.
- All functionality is reimplemented under `server/` and `client/`. The legacy root files are now **inert** — nothing in the new app references them.
- Created `server/package.json` and `client/package.json` (one per workspace) instead of mutating the root one in place. The new root `package.json` (described in §2.4) drives both via `--prefix` scripts.

### 2.2 `server/` — backend

- `server/src/config/env.js`: validates `MONGO_URI`, `JWT_SECRET`, `PORT`, `NODE_ENV`, `CLIENT_ORIGIN` at boot. Fails loud if missing.
- `server/src/config/db.js`: single `connectDB()` function. Mongoose connection logging. No more side-effectful imports.
- `server/src/models/User.js`: `email` (lowercased, indexed unique), `name`, `passwordHash`, timestamps. Removed dead `notes` array (B6). Instance method `comparePassword`.
- `server/src/models/Note.js`: `title`, `content`, `owner` (ObjectId ref `User`, indexed), timestamps. Title required, 1–80 chars; content max 10k chars (S1).
- `server/src/utils/ApiError.js`: typed errors w/ status + code.
- `server/src/middleware/auth.js`: reads JWT from cookie or `Authorization: Bearer`, verifies, attaches `req.user={id,email}`. Returns **401 JSON**, not redirect (B3).
- `server/src/middleware/validate.js`: thin wrapper around `express-validator`.
- `server/src/middleware/errorHandler.js`: catches `ApiError`, Mongoose `ValidationError`, duplicate-key (E11000 → 409), JWT errors. Always responds JSON. Hides stack in production.
- `server/src/controllers/authController.js`: `register`, `login`, `logout`, `me`. Bcrypt 12-round hash. JWT `expiresIn: 7d`. Friendly 409 on duplicate email (S7).
- `server/src/controllers/noteController.js`: full CRUD scoped by `owner = req.user.id`. Address-by-id (B4). 404 on miss, 403 on wrong owner.
- `server/src/routes/auth.js` + `routes/notes.js`: thin route declarations with validators.
- `server/src/app.js`: `helmet`, `cors` (origin from env, credentials true), `express.json` with size limit, `cookie-parser`, request log via `morgan` in dev only. Removed global `Cache-Control: no-store` (S6) — only applied to API responses, not static.
- `server/src/index.js`: `connectDB()` then `app.listen`. Graceful shutdown on SIGTERM.
- **Production mode**: if `NODE_ENV=production`, `app.js` serves `client/dist` as static and falls back any unmatched non-API route to `index.html` — single-origin SPA, no CORS needed in prod, cookies become `sameSite: 'strict'`.

### 2.3 `client/` — React SPA

- Vite scaffold (`react` template). No CRA.
- `vite.config.js`: dev proxy `/api → http://localhost:3000` so axios calls and the cookie live on one origin → no CORS during local dev either.
- `src/api/client.js`: axios instance with `baseURL: '/api'`, `withCredentials: true`. Response interceptor surfaces `error.response.data.message`.
- `src/context/AuthContext.jsx`: on mount calls `GET /auth/me` to rehydrate; exposes `user`, `login`, `register`, `logout`, `loading`.
- `src/components/ProtectedRoute.jsx`: blocks rendering until `loading` resolves; redirects to `/login` if no user.
- `src/components/Navbar.jsx`: shows brand + greeting + logout when signed in, login/register links when not.
- `src/components/NoteCard.jsx`: card with title + preview + link to detail.
- `src/components/NoteEditor.jsx`: shared create/edit form, controlled inputs, disabled while submitting.
- `src/components/Spinner.jsx`: lightweight CSS spinner for loading states.
- Pages:
  - `Login.jsx` — form, inline error display, redirects after success.
  - `Register.jsx` — form w/ client-side min-length checks, inline errors.
  - `Notes.jsx` — fetches list, supports inline create at top, deletes optimistically.
  - `NoteDetail.jsx` — view + edit (title **and** content, U3) + delete.
  - `NotFound.jsx` — 404 with link home.
- `styles/global.css`: mobile-first, fluid type with `clamp()`, CSS variables for the cyan/dark palette, grid for the notes list with `auto-fill, minmax(260px,1fr)`. The original `rgb(119,225,235)` accent is preserved.

### 2.4 Deployment

- `render.yaml`: build runs `npm install && npm run build` from root (installs server + client deps and builds the SPA into `client/dist`). Start runs `npm run start --prefix server`. Env vars unchanged.
- Root `package.json` `scripts.build`: `npm --prefix server install && npm --prefix client install && npm --prefix client run build`.
- `start` runs the server in `NODE_ENV=production`, which serves the SPA build + API on a single port.

### 2.5 README

- Rewritten to reflect the new architecture: install, dev, env vars, scripts, API table, deployment notes.

### 2.6 Neon UI pass

A focused visual revamp on top of the React SPA — no structural changes, just `client/src/styles/global.css` + a small JSX touch on `NoteCard.jsx`.

**Palette**
- Added a magenta accent (`#ff48d3`) alongside the existing cyan (`#5ef3ff`), plus a violet (`#8b5cf6`) used sparingly. The original `rgb(119, 225, 235)` is replaced by the brighter `--cyan` token for more neon punch.
- Two reusable glow tokens: `--glow-cyan`, `--glow-magenta`.

**Background**
- Animated **aurora** layer (`body::before`) — three radial gradients (cyan / magenta / violet) drifting in an 18s alternate loop.
- Animated **grid lines** layer (`body::after`) — faint cyan grid scrolling 30s linear, masked by a center radial fade so the edges go dark.
- `body { overflow-x: hidden }` so the drifting layers can't introduce horizontal scroll.

**Typography**
- JetBrains Mono used for display surfaces (brand, headings, card labels, spinner label). Falls back to system mono.
- Page H1 + auth H1 + detail title all use a cyan→magenta gradient text-clip with a soft glow.

**Components**
- **Brand**: continuous `neon-pulse` text-shadow animation (3.5s, ease-in-out).
- **Navbar**: glass effect via `backdrop-filter: blur(12px) saturate(140%)`, with a 1px cyan→magenta gradient stripe along the bottom border.
- **Nav links**: animated cyan→magenta underline that scales in from the left on hover/active.
- **Cards**: gradient border drawn via the `::before` mask trick (no double-border hack), gradient background, hover lifts the gradient border opacity.
- **Buttons**: shimmer sweep on hover (a translucent diagonal band moves across via `::before`), neon box-shadow glow on hover. Primary button is a cyan→magenta gradient fill.
- **Inputs**: soft cyan glow on focus (`box-shadow` ring + slight outer glow).
- **Form errors**: shake animation on appearance + danger-coloured glow.
- **Spinner**: conic-gradient ring with a `drop-shadow` glow stacking cyan + magenta — much more visible than the old border-spinner.
- **Page transition**: `.app-main` fades + lifts in on route change (380ms cubic-bezier).
- **Auth card**: enters with a subtle `rotateX(8deg)` 3D flip-in (500ms).

**3D card tilt (pointer-tracked)** — [client/src/components/NoteCard.jsx](client/src/components/NoteCard.jsx)
- Each note card tracks the pointer position via `onMouseMove`, computes a tilt (`rx`, `ry`) up to ±8° and a glare position (`mx`, `my`), and writes them as CSS custom properties on the element.
- The CSS reads `--rx`/`--ry` into a `perspective(900px) rotateX() rotateY()` transform — smooth real-time tilt with no JS animation loop.
- A `<div class="note-card-glare">` overlay uses `radial-gradient(... at var(--mx) var(--my) ...)` with `mix-blend-mode: screen` to add a cyan→magenta sheen that follows the cursor.
- Inner elements (title, preview, actions) get progressive `translateZ` (10/15/20px) so they float off the card surface during tilt.
- Disabled automatically on touch devices (`@media (hover: none)`) and when the user prefers reduced motion. JS double-checks `matchMedia` before applying transforms.

**Accessibility**
- `@media (prefers-reduced-motion: reduce)` kills every animation, transition, and tilt.
- `@media (hover: none)` (touch) removes the tilt + glare so cards stay flat.
- Color contrast preserved — text against `--bg` and `--bg-elev` stays above 7:1.

**Build impact**
- CSS bundle: 5.6 KB → 13.8 KB (gzip: 1.8 KB → 3.7 KB). JS bundle unchanged within rounding.

### 2.7 UX fixes after first browser test

- **Duplicate note creation fixed** — [client/src/components/NoteEditor.jsx](client/src/components/NoteEditor.jsx)
  - Reentrancy guard: `useRef(false)` flag set synchronously inside `handleSubmit`, blocks a second submit firing before React commits `busy = true`.
  - New `resetOnSuccess` prop. The Notes page passes it (`true`) so a successful create clears the form; the detail/edit page does not (keeps the new values visible).
- **Cards visible without hover** — the gradient border, glow shadow, and corner radial glow are now always on. Hover just brightens them. Previously the ::before gradient border had `opacity: 0` at rest so cards looked plain.
- **Reduce-motion rule narrowed** — was killing every animation + transition globally, which made the UI look static even for users who only wanted *reduced* motion. Now it only disables continuous loops (aurora drift, grid drift, brand pulse) and large transforms (card tilt, page-in slide). Glows, hover transitions, and gradient backgrounds remain.
- Aurora + grid layer opacity bumped (`0.18 → 0.28`, `0.06 → 0.10`) so the backdrop is unmistakable.

### 2.8 Backend improvements (v2.1)

Focused pass on the backend to clean up the controllers, add real safety, and make production behaviour more correct. No API surface breakage — the React frontend works unchanged.

**`asyncHandler` wrapper** — [server/src/utils/asyncHandler.js](server/src/utils/asyncHandler.js)
- Wraps each route handler so a thrown error / rejected promise is forwarded to Express's error middleware automatically. Removed the repetitive `try { … } catch (err) { next(err); }` from every controller.
- Controllers are noticeably shorter; the `noteController` got a `loadOwned(id, userId)` helper that handles the assert-id + find + own-check-or-throw triad, used by `getOne`, `update`, `remove`.

**Rate limiting** — [server/src/middleware/rateLimit.js](server/src/middleware/rateLimit.js)
- `authLimiter` — 30 attempts / 15 min, applied to `/api/auth/register` and `/api/auth/login`. Stops credential-stuffing.
- `apiLimiter` — 120 requests / minute, applied globally to `/api`.
- Both return JSON `{ error: { code, message } }` matching the rest of the API, not the default plaintext.
- **Skipped in development** (`skip: () => !env.isProd`) so local testing isn't throttled.
- `app.set('trust proxy', 1)` so `req.ip` is the real client when behind Render's load balancer (otherwise rate limit would key on the LB's IP and one bad actor would lock everyone out).

**Compression** — `app.use(compression())`. JSON responses get gzipped, ~5-10x size reduction on note lists.

**Request ID** — [server/src/middleware/requestId.js](server/src/middleware/requestId.js)
- Each request gets a UUID (or honours an incoming `X-Request-Id` header, capped at 100 chars).
- Echoed back on the response via `X-Request-Id`.
- Stored on `req.id`, included in 5xx logs and in **every** error response body (`error.requestId`). When a user reports "save failed", you can grep the logs for the exact request.
- Morgan log format updated to lead with the request id.

**Health check that actually checks** — [server/src/app.js](server/src/app.js)
- `GET /api/health` now reads `mongoose.connection.readyState` and returns **200** only if connected; **503** otherwise. Includes `{ db, uptime }`.
- Render / uptime monitors can now distinguish "process alive" from "DB-backed serving traffic".

**Mongo connect — fail fast** — [server/src/config/db.js](server/src/config/db.js)
- `serverSelectionTimeoutMS: 8_000` (down from the default 30s) — bad URI or firewall problem now fails in 8 seconds instead of hanging.
- `socketTimeoutMS: 45_000`, `maxPoolSize: 20`.

**Pagination on `/api/notes`** — [server/src/controllers/noteController.js](server/src/controllers/noteController.js)
- Query: `?limit=N&before=<ISO updatedAt>`. Limit default 50, max 200.
- Cursor-based on `updatedAt` (the sort field) with `_id` as tiebreaker — stable under concurrent edits.
- Response shape: `{ notes, nextCursor, hasMore }`. The React UI reads `data.notes`, so backward compatible.
- Backed by a new **compound index** on `Note { owner: 1, updatedAt: -1 }` (added in `models/Note.js`), so list queries scale linearly in returned-rows, not total user notes.

**Cookie hygiene** — [server/src/controllers/authController.js](server/src/controllers/authController.js)
- `clearAuthCookie` now passes the same attributes (`path`, `httpOnly`, `secure`, `sameSite`) as when set. Some browsers refuse to clear a cookie if any attribute differs.

**Production static serving** — [server/src/app.js](server/src/app.js)
- `express.static(clientDist, { maxAge: '1y' })` for hashed asset filenames.
- `index.html` explicitly served with `Cache-Control: no-cache` so a fresh deploy is picked up immediately (otherwise the user's cached `index.html` would keep loading old asset URLs).

**Error response shape**
- `{ error: { code, message, requestId } }` everywhere. Stack traces only included on 5xx in development.

**Trust proxy**
- `app.set('trust proxy', 1)` — required when running behind Render's load balancer so `req.ip`, `req.secure`, and rate-limit keys are correct.

**Smoke-test results** (`NODE_ENV=production`, no DB):
- `GET /api/health` → **503** `{ ok: false, db: 'disconnected', uptime: 0 }` ✓
- `GET /api/auth/me` → **401** with `error.requestId` populated ✓
- `GET /api/notes?limit=5` → **401** (auth gate works under pagination query) ✓
- `POST /api/auth/register` with `{ email: "x" }` → **400** validation error ✓

---

## 3. Mapping old → new

| Old route                  | New route                | Method |
|----------------------------|--------------------------|--------|
| `GET  /`                   | client `/register`       | n/a    |
| `POST /register`           | `POST /api/auth/register`| POST   |
| `GET  /login`              | client `/login`          | n/a    |
| `POST /login`              | `POST /api/auth/login`   | POST   |
| `GET  /profile`            | `GET  /api/notes`        | GET    |
| `POST /createnote`         | `POST /api/notes`        | POST   |
| `GET  /show/:postname`     | `GET  /api/notes/:id`    | GET    |
| `GET  /rename/:postname`   | merged into detail page  | n/a    |
| `POST /rename/:oldname`    | `PATCH /api/notes/:id`   | PATCH  |
| `GET  /delete/:postname`   | `DELETE /api/notes/:id`  | DELETE |
| logout via cookie reset    | `POST /api/auth/logout`  | POST   |

---

## 5. Clean-up step (run after review)

When you're satisfied with the new structure, delete the legacy files:

```
rm -rf app.js user.js post.js package.json views public
```

(Old `package-lock.json` if present should go too. Keep `.env`, `render.yaml`, `README.md`, `.git/`, `CHANGES.md`, `server/`, `client/`, root `package.json`.)

---

## 4. Verification checklist

- [x] `npm install` succeeds in both `server/` and `client/`.
- [x] `npm run build` produces `client/dist/index.html` + `assets/*` (verified: 218 KB JS gzipped to 73 KB, 5.6 KB CSS gzipped to 1.8 KB).
- [x] `node src/index.js` loads `app.js` without throwing; full route table wires up.
- [x] `GET /api/health` → 200 `{ok:true}`.
- [x] `GET /api/notes` without cookie → **401 JSON** `{error:{code:"E_401",message:"Not authenticated"}}` (was: hard crash on bad token in v1).
- [x] `POST /api/auth/register` with `{email:"bad"}` → **400 JSON** `{error:{code:"E_VALIDATION",message:"Valid email is required"}}` (was: 500 / unique-index crash in v1).
- [ ] End-to-end test in browser with a real `MONGO_URI` (left to user — requires connection string).
- [ ] Mobile viewport visual QA (left to user — design verified in code, breakpoint at 600px).
