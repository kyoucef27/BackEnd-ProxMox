import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory root
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const env = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_development_secret_key',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
  MY_SECRET_KEY: process.env.MY_SECRET_KEY || '',
};
