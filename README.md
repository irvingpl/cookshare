# CookShare 🍳

나만의 레시피를 공유하고 다양한 요리를 발견하는 레시피 공유 서비스입니다.

## 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | Next.js 16 (App Router), shadcn/ui v4, TypeScript, Tailwind CSS |
| Backend | Express 5, TypeScript, Node.js |
| Database | SQLite (better-sqlite3) |
| 인증 | JWT — Access Token (15분) + Refresh Token (7일) |
| 이미지 업로드 | 로컬 파일시스템 / AWS S3 (환경변수로 전환) |
| 검증 | Zod |
| 보안 | express-rate-limit, bcrypt, SHA-256 refresh token hashing |

## 주요 기능

- **레시피 CRUD** — 등록·수정·삭제·목록·상세 조회
- **검색 & 필터** — 키워드 검색, 카테고리·난이도 필터, 페이지네이션
- **좋아요** — 토글 방식, 실시간 카운트
- **댓글** — 작성·삭제
- **사용자 프로필** — 프로필 조회, 닉네임·소개·아바타 수정
- **Refresh Token Rotation** — 토큰 갱신 시 기존 토큰 즉시 무효화
- **S3 자동 전환** — AWS 환경변수 설정만으로 이미지 저장소 전환

## 프로젝트 구조

```
cookshare/
├── backend/
│   ├── src/
│   │   ├── index.ts              # 앱 진입점
│   │   ├── middleware/
│   │   │   ├── auth.ts           # JWT 인증 미들웨어
│   │   │   ├── errorHandler.ts   # 전역 에러 핸들러
│   │   │   ├── rateLimiter.ts    # Rate Limiting
│   │   │   └── validate.ts       # Zod 요청 검증
│   │   ├── models/
│   │   │   └── db.ts             # SQLite 연결 & 스키마
│   │   ├── routes/
│   │   │   ├── auth.ts           # 인증 (회원가입/로그인/갱신/로그아웃)
│   │   │   ├── recipes.ts        # 레시피 CRUD + 좋아요
│   │   │   ├── comments.ts       # 댓글
│   │   │   └── users.ts          # 사용자 프로필
│   │   ├── schemas/
│   │   │   ├── auth.schema.ts    # 인증 Zod 스키마
│   │   │   └── recipe.schema.ts  # 레시피/댓글/프로필 Zod 스키마
│   │   └── services/
│   │       └── storage.ts        # 이미지 업로드 (로컬/S3)
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    └── src/
        ├── app/
        │   ├── page.tsx              # 메인 (레시피 목록)
        │   ├── login/page.tsx
        │   ├── register/page.tsx
        │   ├── recipes/
        │   │   ├── new/page.tsx      # 레시피 등록
        │   │   └── [id]/page.tsx     # 레시피 상세
        │   └── users/[id]/page.tsx   # 사용자 프로필
        ├── components/
        │   ├── shared/
        │   │   ├── Navbar.tsx
        │   │   └── RecipeCard.tsx
        │   └── ui/                   # shadcn/ui 컴포넌트
        ├── contexts/
        │   └── AuthContext.tsx       # 전역 인증 상태
        ├── lib/
        │   └── api.ts                # API 클라이언트 (자동 토큰 갱신)
        └── types/
            └── index.ts              # 공유 타입 정의
```

## 시작하기

### 사전 요구사항

- Node.js 20+
- npm 10+

### 1. 저장소 클론

```bash
git clone https://github.com/irvingpl/cookshare.git
cd cookshare
```

### 2. 백엔드 설정

```bash
cd backend
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일의 JWT_SECRET 값을 안전한 랜덤 문자열로 변경하세요.
```

### 3. 프론트엔드 설정

```bash
cd frontend
npm install

# 환경변수 설정
echo "NEXT_PUBLIC_API_URL=http://localhost:4000/api" > .env.local
```

### 4. 개발 서버 실행

터미널을 두 개 열어 각각 실행합니다.

```bash
# 터미널 1 — 백엔드 (http://localhost:4000)
cd backend && npm run dev

# 터미널 2 — 프론트엔드 (http://localhost:3000)
cd frontend && npm run dev
```

## 환경변수

### 백엔드 (`backend/.env`)

| 변수 | 설명 | 기본값 |
|---|---|---|
| `PORT` | 서버 포트 | `4000` |
| `JWT_SECRET` | JWT 서명 키 **(필수 변경)** | — |
| `DB_PATH` | SQLite 파일 경로 | `./cookshare.db` |
| `UPLOAD_DIR` | 이미지 업로드 경로 | `./src/uploads` |
| `CLIENT_URL` | CORS 허용 origin | `http://localhost:3000` |
| `BASE_URL` | 이미지 URL 베이스 | `http://localhost:4000` |

### S3 이미지 업로드 전환

아래 4개 변수를 모두 설정하면 로컬 저장 대신 S3를 자동으로 사용합니다.

```env
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=your-bucket-name
```

## API 엔드포인트

### 인증

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/auth/register` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/refresh` | Access Token 갱신 |
| POST | `/api/auth/logout` | 로그아웃 (Refresh Token 무효화) |
| GET | `/api/auth/me` | 내 정보 조회 |

### 레시피

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| GET | `/api/recipes` | 목록 조회 (검색·필터·페이지네이션) | 선택 |
| GET | `/api/recipes/:id` | 상세 조회 | 선택 |
| POST | `/api/recipes` | 등록 (multipart/form-data) | 필수 |
| PATCH | `/api/recipes/:id` | 수정 | 필수 |
| DELETE | `/api/recipes/:id` | 삭제 | 필수 |
| POST | `/api/recipes/:id/like` | 좋아요 토글 | 필수 |

### 댓글

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| GET | `/api/recipes/:recipeId/comments` | 목록 조회 | 불필요 |
| POST | `/api/recipes/:recipeId/comments` | 작성 | 필수 |
| DELETE | `/api/recipes/:recipeId/comments/:id` | 삭제 | 필수 |

### 사용자

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| GET | `/api/users/:id/profile` | 프로필 조회 | 불필요 |
| GET | `/api/users/:id/recipes` | 작성 레시피 목록 | 불필요 |
| PATCH | `/api/users/me` | 내 프로필 수정 | 필수 |

## 인증 흐름

```
로그인/회원가입
  └─▶ accessToken (15분) + refreshToken (7일) 발급

API 요청
  └─▶ Authorization: Bearer <accessToken>

accessToken 만료 (401)
  └─▶ POST /api/auth/refresh { refreshToken }
        └─▶ 새 accessToken + 새 refreshToken 발급 (Rotation)
        └─▶ 원본 요청 자동 재시도

로그아웃
  └─▶ POST /api/auth/logout { refreshToken }
        └─▶ DB에서 refreshToken 삭제 → 재사용 불가
```

## Rate Limiting

| 대상 | 제한 |
|---|---|
| `/api/auth/*` | 15분당 10회 |
| `/api/*` | 1분당 100회 |
