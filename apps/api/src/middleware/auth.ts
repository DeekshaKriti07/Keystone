import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './error.js';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TokenPayload {
  userId: string;
  type: 'access' | 'refresh';
}

export interface AuthenticatedRequest extends Request {
  userId: string;
}

// ─── Token helpers ──────────────────────────────────────────────────────────

export function verifyAccessToken(token: string): { userId: string; expires: number } {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload & TokenPayload;
    if (decoded.type !== 'access') {
      throw new AppError('Invalid token type', 401);
    }
    return { userId: decoded.userId, expires: decoded.exp ?? 0 };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Invalid or expired token', 401);
  }
}

export function verifyRefreshToken(token: string): { userId: string } {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload & TokenPayload;
    if (decoded.type !== 'refresh') {
      throw new AppError('Invalid token type', 401);
    }
    return { userId: decoded.userId };
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }
}

export function generateTokens(userId: string): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign(
    { userId, type: 'access' } satisfies TokenPayload,
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN },
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' } satisfies TokenPayload,
    env.JWT_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN },
  );

  return { accessToken, refreshToken };
}

// ─── Express middleware ─────────────────────────────────────────────────────

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('Authentication required', 401);
  }

  const token = header.slice(7);
  const { userId } = verifyAccessToken(token);
  (req as AuthenticatedRequest).userId = userId;
  next();
}
