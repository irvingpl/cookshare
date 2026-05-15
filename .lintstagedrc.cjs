module.exports = {
  // Prettier — 스테이징된 파일에만 포맷 적용
  '**/*.{ts,tsx,js,mjs,cjs,json,md,yml,yaml,css}': ['prettier --write'],

  // ESLint — frontend TS 파일이 스테이징 되면 전체 frontend lint 실행
  // (Next.js ESLint 플러그인이 frontend/ 루트 기준으로 동작하므로 함수로 감쌈)
  'frontend/src/**/*.{ts,tsx}': [() => 'pnpm --filter frontend lint'],

  // Prettier — backend TypeScript (ESLint 설정 없으므로 포맷만)
  'backend/src/**/*.ts': ['prettier --write'],

  // Prettier — shared 패키지
  'packages/**/*.ts': ['prettier --write'],
};
