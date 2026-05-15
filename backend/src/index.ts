import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth';
import recipeRoutes from './routes/recipes';
import commentRoutes from './routes/comments';
import userRoutes from './routes/users';
import { authLimiter, apiLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadDir = process.env.UPLOAD_DIR || './src/uploads';
app.use('/uploads', express.static(path.resolve(uploadDir)));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/recipes', apiLimiter, recipeRoutes);
app.use('/api/recipes/:recipeId/comments', apiLimiter, commentRoutes);
app.use('/api/users', apiLimiter, userRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`CookShare API running on http://localhost:${PORT}`);
});

export default app;
