import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/db';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema, refreshSchema } from '../schemas/auth.schema';

const router = Router();

const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7일

function signAccessToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET!, {
    expiresIn: ACCESS_TOKEN_EXPIRES as any,
  });
}

function generateRefreshToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(64).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

function saveRefreshToken(userId: string, hash: string): void {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS).toISOString();
  db.prepare(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
  ).run(uuidv4(), userId, hash, expiresAt);
}

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req: Request, res: Response): Promise<void> => {
  const { email, password, username } = req.body;

  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
  if (existing) {
    res.status(409).json({ message: '이미 사용 중인 이메일 또는 사용자명입니다.' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = uuidv4();
  db.prepare('INSERT INTO users (id, email, password_hash, username) VALUES (?, ?, ?, ?)').run(id, email, passwordHash, username);

  const accessToken = signAccessToken(id, email);
  const { raw, hash } = generateRefreshToken();
  saveRefreshToken(id, hash);

  res.status(201).json({
    accessToken,
    refreshToken: raw,
    user: { id, email, username },
  });
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    return;
  }

  const accessToken = signAccessToken(user.id, user.email);
  const { raw, hash } = generateRefreshToken();
  saveRefreshToken(user.id, hash);

  res.json({
    accessToken,
    refreshToken: raw,
    user: { id: user.id, email: user.email, username: user.username, avatar_url: user.avatar_url },
  });
});

// POST /api/auth/refresh
router.post('/refresh', validate(refreshSchema), (req: Request, res: Response): void => {
  const { refreshToken } = req.body;
  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  const stored = db.prepare(
    "SELECT * FROM refresh_tokens WHERE token_hash = ? AND expires_at > datetime('now')"
  ).get(hash) as any;

  if (!stored) {
    res.status(401).json({ message: '유효하지 않거나 만료된 Refresh Token입니다.' });
    return;
  }

  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(stored.user_id) as any;
  if (!user) {
    res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
    return;
  }

  // 토큰 교체 (Refresh Token Rotation)
  db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(stored.id);
  const { raw, hash: newHash } = generateRefreshToken();
  saveRefreshToken(user.id, newHash);

  res.json({
    accessToken: signAccessToken(user.id, user.email),
    refreshToken: raw,
  });
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response): void => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(hash);
  }
  res.status(204).send();
});

// GET /api/auth/me
router.get('/me', (req: Request, res: Response): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: '인증이 필요합니다.' });
    return;
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET!) as any;
    const user = db.prepare('SELECT id, email, username, bio, avatar_url, created_at FROM users WHERE id = ?').get(payload.userId);
    if (!user) {
      res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
      return;
    }
    res.json({ user });
  } catch {
    res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }
});

export default router;
