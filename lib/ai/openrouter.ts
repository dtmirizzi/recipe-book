import 'server-only';
import OpenAI from 'openai';
import { env } from '@/lib/env';

/**
 * OpenRouter is an OpenAI-compatible gateway. We use the OpenAI SDK with a
 * custom baseURL. This keeps the call sites tiny and lets us route to any
 * provider (Anthropic, OpenAI, Google, etc.) by swapping the model name.
 *
 * Lazy-construct on first use so importing this module doesn't fail when
 * OPENROUTER_API_KEY is not set (we fall back to the local mock extractor).
 */

let client: OpenAI | null = null;

export function getOpenRouter(): OpenAI {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set; call site should check flags.hasOpenrouterKey first.');
  }
  if (client) return client;
  client = new OpenAI({
    apiKey: env.OPENROUTER_API_KEY,
    baseURL: env.OPENROUTER_BASE_URL,
    defaultHeaders: {
      // Recommended by OpenRouter for analytics/leaderboard attribution.
      ...(env.OPENROUTER_APP_URL ? { 'HTTP-Referer': env.OPENROUTER_APP_URL } : {}),
      'X-Title': env.OPENROUTER_APP_NAME,
    },
  });
  return client;
}

export const models = {
  text: () => env.OPENROUTER_MODEL_TEXT,
  vision: () => env.OPENROUTER_MODEL_VISION,
};
