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

### Docker (개발 환경)

```bash
# 최초 실행 또는 package.json 변경 후
docker compose up --build

# 이후 실행
docker compose up -d

# 로그 확인
docker compose logs -f backend
docker compose logs -f frontend

# 중지 (볼륨 유지)
docker compose down

# 완전 초기화 (DB·업로드·node_modules 포함 삭제)
docker compose down -v
```

**볼륨 구조**

- `backend_db` → SQLite DB (`/app/data/cookshare.db`)
- `backend_uploads` → 업로드 이미지 (`/app/backend/src/uploads`)
- `frontend_next` → Next.js 빌드 캐시 (`/app/frontend/.next`)
- `node_modules` → 익명 볼륨, 컨테이너 내부 빌드 결과 보존

**package.json 변경 시**: `docker compose down -v && docker compose up --build`

## Architecture

Monorepo (`pnpm workspace`) — `packages/shared`에 공통 타입 정의, backend/frontend 모두 `@cookshare/shared`로 참조.

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
- **Validation** (`middleware/validate.ts`): wraps Zod schemas. For `multipart/form-data` routes, `validate()` must come _after_ `upload.single()` because multer populates `req.body` first.
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

| Var                                         | Where    | Effect                                |
| ------------------------------------------- | -------- | ------------------------------------- |
| `JWT_SECRET`                                | backend  | signs access tokens                   |
| `AWS_ACCESS_KEY_ID/SECRET/REGION/S3_BUCKET` | backend  | all four required to activate S3 mode |
| `NEXT_PUBLIC_API_URL`                       | frontend | API base URL                          |
