import { Router, Response } from 'express';
import db from '../models/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload, getImageUrl } from '../services/storage';
import { validate } from '../middleware/validate';
import { updateProfileSchema } from '../schemas/recipe.schema';

const router = Router();

// GET /api/users/:id/profile
router.get('/:id/profile', (req: AuthRequest, res: Response): void => {
  const user = db.prepare(
    'SELECT id, username, bio, avatar_url, created_at FROM users WHERE id = ?'
  ).get(req.params.id) as any;

  if (!user) {
    res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    return;
  }

  const recipeCount = (db.prepare('SELECT COUNT(*) as count FROM recipes WHERE author_id = ?').get(req.params.id) as any).count;

  res.json({ ...user, recipe_count: recipeCount });
});

// GET /api/users/:id/recipes
router.get('/:id/recipes', (req: AuthRequest, res: Response): void => {
  const { page = '1', limit = '12' } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const recipes = db.prepare(`
    SELECT r.*, COUNT(DISTINCT l.user_id) as like_count, COUNT(DISTINCT c.id) as comment_count
    FROM recipes r
    LEFT JOIN likes l ON r.id = l.recipe_id
    LEFT JOIN comments c ON r.id = c.recipe_id
    WHERE r.author_id = ?
    GROUP BY r.id
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.params.id, parseInt(limit), offset);

  res.json({ recipes });
});

// PATCH /api/users/me
router.patch('/me', authenticate, upload.single('avatar'), validate(updateProfileSchema), (req: AuthRequest, res: Response): void => {
  const { username, bio } = req.body;
  const avatarUrl = req.file ? getImageUrl(req.file) : undefined;

  if (username) {
    const conflict = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.user!.userId);
    if (conflict) {
      res.status(409).json({ message: '이미 사용 중인 사용자명입니다.' });
      return;
    }
  }

  db.prepare(`
    UPDATE users SET
      username = COALESCE(?, username),
      bio = COALESCE(?, bio),
      avatar_url = COALESCE(?, avatar_url),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(username, bio, avatarUrl, req.user!.userId);

  const user = db.prepare(
    'SELECT id, email, username, bio, avatar_url, created_at FROM users WHERE id = ?'
  ).get(req.user!.userId);

  res.json({ user });
});

export default router;
