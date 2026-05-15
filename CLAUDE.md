# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (`backend/`)
```bash
npm run dev      # ts-node + nodemon (watches src/, port 4000)
npm run build    # tsc → dist/
npm start        # node dist/index.js
```

### Frontend (`frontend/`)
```bash
npm run dev      # Next.js dev server (port 3000)
npm run build    # production build → .next/
npm run lint     # eslint
```

> **Note:** This is Next.js 16 with Turbopack. APIs and conventions differ from earlier versions. Check `node_modules/next/dist/docs/` before writing Next.js-specific code.

Both servers must run simultaneously for full-stack development. There are no tests configured yet.

## Architecture

Monorepo with two independent packages. No shared package — types are duplicated between frontend (`src/types/index.ts`) and backend.

### Backend request lifecycle

```
Request
  → rateLimiter (express-rate-limit)
  → authenticate / optionalAuth   ← verifies Access Token only (15m)
  → validate(zodSchema)           ← runs after multer for multipart
  → route handler
  → errorHandler (global fallback)
```

- **Auth** (`middleware/auth.ts`): `authenticate` — required auth; `optionalAuth` — attaches user if token present, never rejects. Route handlers receive `AuthRequest` which extends `Request` with `user?: AuthPayload`.
- **Validation** (`middleware/validate.ts`): wraps Zod schemas. For `multipart/form-data` routes, `validate()` must come *after* `upload.single()` because multer populates `req.body` first.
- **Storage** (`services/storage.ts`): selects local vs S3 at startup based on whether all four `AWS_*` env vars are set. `getImageUrl(file)` reads `file.location` for S3 or constructs a localhost URL for local. Changing storage strategy requires only env var changes — no route code changes.
- **DB** (`models/db.ts`): single SQLite connection, WAL mode, foreign keys ON. Schema is created with `IF NOT EXISTS` on every startup — no migration tool.
- **Refresh tokens**: stored as SHA-256 hashes in the `refresh_tokens` table. On `/auth/refresh`, the old token is deleted and a new one is issued (rotation). Logout deletes the token from DB.

### Frontend data flow

```
AuthContext (user state)
  ↑ reads/writes
localStorage: accessToken + refreshToken
  ↑ managed by
api.ts: request() wrapper
  → on 401: refreshAccessToken() → retry once
  → on refresh failure: clearTokens() + dispatch('auth:logout')
  ↑ AuthContext listens to 'auth:logout' event → clears user state
```

- `api.ts` is the single fetch layer. All API calls go through `request()`, which handles auth headers and silent token refresh. The refresh deduplicates concurrent 401s via a shared `refreshPromise`.
- `AuthContext` exposes `login(accessToken, refreshToken, user)` and `logout()` (async — calls server before clearing local state).
- Pages that require auth must guard inside `useEffect`, not during render, to avoid SSR `ReferenceError` on `window`/`location`.

### shadcn/ui v4

This project uses shadcn/ui v4 which is based on **Base UI** (not Radix UI). Key difference: **`asChild` prop does not exist**. Use `<Link href="..."><Button>label</Button></Link>` instead of `<Button asChild><Link>`.

### Key env vars

| Var | Where | Effect |
|---|---|---|
| `JWT_SECRET` | backend | signs access tokens |
| `AWS_ACCESS_KEY_ID/SECRET/REGION/S3_BUCKET` | backend | all four required to activate S3 mode |
| `NEXT_PUBLIC_API_URL` | frontend | API base URL |
