import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { commentSchema } from '../schemas/recipe.schema';

const router = Router({ mergeParams: true });

// GET /api/recipes/:recipeId/comments
router.get('/', (req: AuthRequest, res: Response): void => {
  const comments = db.prepare(`
    SELECT c.*, u.username, u.avatar_url
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.recipe_id = ?
    ORDER BY c.created_at ASC
  `).all(req.params.recipeId);

  res.json({ comments });
});

// POST /api/recipes/:recipeId/comments
router.post('/', authenticate, validate(commentSchema), (req: AuthRequest, res: Response): void => {
  const { content } = req.body;
  if (!content?.trim()) {
    res.status(400).json({ message: '댓글 내용을 입력하세요.' });
    return;
  }

  const recipe = db.prepare('SELECT id FROM recipes WHERE id = ?').get(req.params.recipeId);
  if (!recipe) {
    res.status(404).json({ message: '레시피를 찾을 수 없습니다.' });
    return;
  }

  const id = uuidv4();
  db.prepare(
    'INSERT INTO comments (id, content, user_id, recipe_id) VALUES (?, ?, ?, ?)'
  ).run(id, content.trim(), req.user!.userId, req.params.recipeId);

  const comment = db.prepare(`
    SELECT c.*, u.username, u.avatar_url
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(id);

  res.status(201).json(comment);
});

// DELETE /api/recipes/:recipeId/comments/:commentId
router.delete('/:commentId', authenticate, (req: AuthRequest, res: Response): void => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.commentId) as any;

  if (!comment) {
    res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    return;
  }
  if (comment.user_id !== req.user!.userId) {
    res.status(403).json({ message: '삭제 권한이 없습니다.' });
    return;
  }

  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.commentId);
  res.status(204).send();
});

export default router;
