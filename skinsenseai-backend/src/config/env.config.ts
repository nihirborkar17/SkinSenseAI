// src/config/env.config.ts
import dotenv from 'dotenv';

// Load environment variables IMMEDIATELY
dotenv.config();

// Export a simple function to verify it loaded
export const getEnv = (key: string, defaultValue?: string): string => {
  return process.env[key] || defaultValue || '';
};
