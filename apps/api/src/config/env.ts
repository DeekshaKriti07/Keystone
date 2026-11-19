import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnv(key: string, minLength?: number): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  if (minLength && value.length < minLength) {
    throw new Error(
      `Environment variable ${key} must be at least ${minLength} characters (got ${value.length})`,
    );
  }
  return value;
}

export const env = {
  JWT_SECRET: requireEnv('JWT_SECRET', 32),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  PORT: parseInt(process.env.PORT ?? '5000', 10),
} as const;
