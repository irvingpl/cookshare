import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const message = statusCode === 500 ? '서버 오류가 발생했습니다.' : err.message;

  if (statusCode === 500) {
    console.error('[Error]', err);
  }

  res.status(statusCode).json({ message });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ message: '요청한 리소스를 찾을 수 없습니다.' });
}
