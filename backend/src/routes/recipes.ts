import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/db';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import { upload, getImageUrl } from '../services/storage';
import { validate } from '../middleware/validate';
import { createRecipeSchema, updateRecipeSchema } from '../schemas/recipe.schema';

const router = Router();

// GET /api/recipes - 목록 조회 (페이지네이션, 검색, 카테고리 필터)
router.get('/', optionalAuth, (req: AuthRequest, res: Response): void => {
  const { page = '1', limit = '12', q, category, difficulty } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = 'WHERE 1=1';
  const params: unknown[] = [];

  if (q) {
    where += ' AND (r.title LIKE ? OR r.description LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  if (category) {
    where += ' AND r.category = ?';
    params.push(category);
  }
  if (difficulty) {
    where += ' AND r.difficulty = ?';
    params.push(difficulty);
  }

  const total = (db.prepare(`SELECT COUNT(*) as count FROM recipes r ${where}`).get(...params) as any).count;

  const recipes = db.prepare(`
    SELECT r.*, u.username as author_name, u.avatar_url as author_avatar,
           COUNT(DISTINCT l.user_id) as like_count,
           COUNT(DISTINCT c.id) as comment_count
    FROM recipes r
    JOIN users u ON r.author_id = u.id
    LEFT JOIN likes l ON r.id = l.recipe_id
    LEFT JOIN comments c ON r.id = c.recipe_id
    ${where}
    GROUP BY r.id
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  res.json({ recipes, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/recipes/:id
router.get('/:id', optionalAuth, (req: AuthRequest, res: Response): void => {
  const recipe = db.prepare(`
    SELECT r.*, u.username as author_name, u.avatar_url as author_avatar,
           COUNT(DISTINCT l.user_id) as like_count,
           COUNT(DISTINCT c.id) as comment_count
    FROM recipes r
    JOIN users u ON r.author_id = u.id
    LEFT JOIN likes l ON r.id = l.recipe_id
    LEFT JOIN comments c ON r.id = c.recipe_id
    WHERE r.id = ?
    GROUP BY r.id
  `).get(req.params.id) as any;

  if (!recipe) {
    res.status(404).json({ message: '레시피를 찾을 수 없습니다.' });
    return;
  }

  let liked = false;
  if (req.user) {
    const likeRow = db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND recipe_id = ?').get(req.user.userId, recipe.id);
    liked = !!likeRow;
  }

  recipe.ingredients = JSON.parse(recipe.ingredients);
  recipe.steps = JSON.parse(recipe.steps);

  res.json({ ...recipe, liked });
});

// POST /api/recipes
router.post('/', authenticate, upload.single('image'), validate(createRecipeSchema), (req: AuthRequest, res: Response): void => {
  const { title, description, ingredients, steps, cook_time_minutes, servings, difficulty, category } = req.body;

  if (!title || !ingredients || !steps) {
    res.status(400).json({ message: '제목, 재료, 조리 순서는 필수입니다.' });
    return;
  }

  const id = uuidv4();
  const imageUrl = req.file ? getImageUrl(req.file) : null;

  const parsedIngredients = typeof ingredients === 'string' ? ingredients : JSON.stringify(ingredients);
  const parsedSteps = typeof steps === 'string' ? steps : JSON.stringify(steps);

  db.prepare(`
    INSERT INTO recipes (id, title, description, ingredients, steps, image_url, cook_time_minutes, servings, difficulty, category, author_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, description, parsedIngredients, parsedSteps, imageUrl, cook_time_minutes, servings, difficulty, category, req.user!.userId);

  const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id) as any;
  recipe.ingredients = JSON.parse(recipe.ingredients);
  recipe.steps = JSON.parse(recipe.steps);

  res.status(201).json(recipe);
});

// PATCH /api/recipes/:id
router.patch('/:id', authenticate, upload.single('image'), validate(updateRecipeSchema), (req: AuthRequest, res: Response): void => {
  const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id) as any;

  if (!recipe) {
    res.status(404).json({ message: '레시피를 찾을 수 없습니다.' });
    return;
  }
  if (recipe.author_id !== req.user!.userId) {
    res.status(403).json({ message: '수정 권한이 없습니다.' });
    return;
  }

  const { title, description, ingredients, steps, cook_time_minutes, servings, difficulty, category } = req.body;
  const imageUrl = req.file ? getImageUrl(req.file) : recipe.image_url;

  db.prepare(`
    UPDATE recipes SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      ingredients = COALESCE(?, ingredients),
      steps = COALESCE(?, steps),
      image_url = ?,
      cook_time_minutes = COALESCE(?, cook_time_minutes),
      servings = COALESCE(?, servings),
      difficulty = COALESCE(?, difficulty),
      category = COALESCE(?, category),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(title, description, ingredients, steps, imageUrl, cook_time_minutes, servings, difficulty, category, req.params.id);

  const updated = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id) as any;
  updated.ingredients = JSON.parse(updated.ingredients);
  updated.steps = JSON.parse(updated.steps);

  res.json(updated);
});

// DELETE /api/recipes/:id
router.delete('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id) as any;

  if (!recipe) {
    res.status(404).json({ message: '레시피를 찾을 수 없습니다.' });
    return;
  }
  if (recipe.author_id !== req.user!.userId) {
    res.status(403).json({ message: '삭제 권한이 없습니다.' });
    return;
  }

  db.prepare('DELETE FROM recipes WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// POST /api/recipes/:id/like
router.post('/:id/like', authenticate, (req: AuthRequest, res: Response): void => {
  const recipe = db.prepare('SELECT id FROM recipes WHERE id = ?').get(req.params.id);
  if (!recipe) {
    res.status(404).json({ message: '레시피를 찾을 수 없습니다.' });
    return;
  }

  const existing = db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND recipe_id = ?').get(req.user!.userId, req.params.id);

  if (existing) {
    db.prepare('DELETE FROM likes WHERE user_id = ? AND recipe_id = ?').run(req.user!.userId, req.params.id);
    res.json({ liked: false });
  } else {
    db.prepare('INSERT INTO likes (user_id, recipe_id) VALUES (?, ?)').run(req.user!.userId, req.params.id);
    res.json({ liked: true });
  }
});

export default router;
