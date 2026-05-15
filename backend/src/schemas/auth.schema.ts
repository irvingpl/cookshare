import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('유효한 이메일을 입력하세요.'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다.'),
  username: z
    .string()
    .min(2, '사용자명은 최소 2자 이상이어야 합니다.')
    .max(20, '사용자명은 최대 20자까지 가능합니다.')
    .regex(/^[a-zA-Z0-9_가-힣]+$/, '사용자명에 허용되지 않는 문자가 포함되어 있습니다.'),
});

export const loginSchema = z.object({
  email: z.string().email('유효한 이메일을 입력하세요.'),
  password: z.string().min(1, '비밀번호를 입력하세요.'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token이 필요합니다.'),
});
