import 'server-only';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(16),
  NEXTAUTH_URL: z.string().url().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  // Defaults: Gemini 2.5 Flash for both. Multimodal, supports JSON mode,
  // ~15× cheaper than Claude Sonnet 4.5. Override per call site if you
  // need stronger handwriting / hard-photo extraction.
  OPENROUTER_MODEL_TEXT: z.string().default('google/gemini-2.5-flash'),
  OPENROUTER_MODEL_VISION: z.string().default('google/gemini-2.5-flash'),
  OPENROUTER_APP_NAME: z.string().default('Recipe Box'),
  OPENROUTER_APP_URL: z.string().url().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;

export const flags = {
  hasOpenrouterKey: Boolean(env.OPENROUTER_API_KEY),
  hasResendKey: Boolean(env.RESEND_API_KEY),
  hasBlobToken: Boolean(env.BLOB_READ_WRITE_TOKEN),
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
};
