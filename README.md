# Take-Note

A personal note-taking app — **React SPA** frontend + **Express + MongoDB** REST API backend.

> Refactor of the original EJS/SSR app. See [`CHANGES.md`](./CHANGES.md) for the full
> code review, architecture decisions, and a per-step change log.

## Architecture

```
take-note/
├── server/   Express REST API (JWT auth, Mongoose, helmet, cors, validation)
└── client/   React SPA (Vite, react-router, axios, mobile-first responsive)
```

In **production** the Express server also serves the built SPA from `client/dist`,
so the API and the UI live on a single origin. In **development** the Vite dev
server proxies `/api/*` to the Express server, so cookies and CORS Just Work.

## REST API

| Method | Path                  | Auth | Description |
|--------|-----------------------|------|-------------|
| POST   | `/api/auth/register`  | —    | Create account, returns user, sets cookie |
| POST   | `/api/auth/login`     | —    | Sign in, returns user, sets cookie |
| POST   | `/api/auth/logout`    | —    | Clears cookie |
| GET    | `/api/auth/me`        | ✓    | Current user |
| GET    | `/api/notes`          | ✓    | List your notes |
| POST   | `/api/notes`          | ✓    | Create a note `{title, content?}` |
| GET    | `/api/notes/:id`      | ✓    | Get a note |
| PATCH  | `/api/notes/:id`      | ✓    | Update title and/or content |
| DELETE | `/api/notes/:id`      | ✓    | Delete a note |

## Local development

```bash
# 1. Install everything
npm run install:all     # or: npm install (root devDep), then npm run build

# 2. Configure the server env
cp server/.env.example server/.env
# edit server/.env — set MONGO_URI and JWT_SECRET to real values

# 3. Run client + server together
npm run dev
# → server on http://localhost:3000
# → client on http://localhost:5173   (proxies /api to :3000)
```

## Environment variables (server)

| Var             | Required | Default | Notes |
|-----------------|----------|---------|-------|
| `MONGO_URI`     | ✓        | —       | MongoDB connection string |
| `JWT_SECRET`    | ✓        | —       | Long random string |
| `PORT`          |          | `3000`  | API port |
| `NODE_ENV`      |          | `development` | `production` enables SPA serving + secure cookies |
| `CLIENT_ORIGIN` |          | `http://localhost:5173` | CORS origin in dev |
| `JWT_EXPIRES_IN`|          | `7d`    | Token lifetime |

## Production build

```bash
NODE_ENV=production npm run build
NODE_ENV=production npm start
```

The build step installs both workspaces and outputs the SPA into
`client/dist`, which the Express server then serves directly. Render uses
exactly this flow — see `render.yaml`.

## Live application

Deployed at https://mynote-vv6z.onrender.com/.

## Author

[Aakarsh Arora](https://www.linkedin.com/in/aakarsh-arora-b3965822b/)
