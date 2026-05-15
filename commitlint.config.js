/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],

  rules: {
    // 허용 타입 목록
    'type-enum': [
      2,
      'always',
      [
        'feat', // 새 기능
        'fix', // 버그 수정
        'docs', // 문서 변경
        'style', // 포맷팅 (기능 변경 없음)
        'refactor', // 리팩터링
        'test', // 테스트 추가/수정
        'chore', // 빌드, 도구, 의존성
        'perf', // 성능 개선
        'ci', // CI/CD 설정
        'build', // 빌드 시스템
        'revert', // 이전 커밋 되돌리기
      ],
    ],

    // 제목 최대 길이 (영문 72자, 한글 포함 시 100자까지 허용)
    'header-max-length': [2, 'always', 100],

    // 제목이 대문자로 시작하는 것 허용 (한글 문장 때문)
    'subject-case': [0],

    // 본문/푸터 줄 길이 제한 없음
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },

  // 커밋 메시지 파싱: 한글이 포함된 scope 허용
  parserPreset: {
    parserOpts: {
      headerPattern: /^(\w+)(?:\((.+)\))?!?: (.+)$/,
      headerCorrespondence: ['type', 'scope', 'subject'],
    },
  },
};
