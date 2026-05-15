import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';

export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 10,
  message: { message: '요청이 너무 많습니다. 15분 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 100,
  message: { message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});
