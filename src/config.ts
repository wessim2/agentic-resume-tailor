import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  geminiApiKey: string;
  geminiModel: string;
}

export function getConfig(overrideApiKey?: string): Config {
  const geminiApiKey = overrideApiKey || process.env.GEMINI_API_KEY || '';
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  return {
    geminiApiKey,
    geminiModel,
  };
}
