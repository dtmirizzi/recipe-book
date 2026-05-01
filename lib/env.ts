import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(16),
  NEXTAUTH_URL: z.string().url().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
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
  hasAnthropicKey: Boolean(env.ANTHROPIC_API_KEY),
  hasResendKey: Boolean(env.RESEND_API_KEY),
  hasBlobToken: Boolean(env.BLOB_READ_WRITE_TOKEN),
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
};
