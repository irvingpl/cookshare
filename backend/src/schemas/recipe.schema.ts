import { z } from 'zod';

const ingredientList = z
  .union([
    z.string().min(1, '재료를 입력하세요.'),
    z.array(z.string()),
  ])
  .transform((val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val) as string[]; } catch { return [val]; }
    }
    return val;
  })
  .pipe(z.array(z.string()).min(1, '재료를 최소 1개 이상 입력하세요.'));

const stepList = z
  .union([
    z.string().min(1, '조리 순서를 입력하세요.'),
    z.array(z.string()),
  ])
  .transform((val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val) as string[]; } catch { return [val]; }
    }
    return val;
  })
  .pipe(z.array(z.string()).min(1, '조리 순서를 최소 1단계 이상 입력하세요.'));

export const createRecipeSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요.').max(100, '제목은 최대 100자까지 가능합니다.'),
  description: z.string().max(500).optional(),
  ingredients: ingredientList,
  steps: stepList,
  cook_time_minutes: z.coerce.number().int().positive().optional(),
  servings: z.coerce.number().int().positive().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  category: z.string().max(20).optional(),
});

export const updateRecipeSchema = createRecipeSchema.partial();

export const commentSchema = z.object({
  content: z.string().min(1, '댓글 내용을 입력하세요.').max(500, '댓글은 최대 500자까지 가능합니다.'),
});

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[a-zA-Z0-9_가-힣]+$/)
    .optional(),
  bio: z.string().max(200).optional(),
});
