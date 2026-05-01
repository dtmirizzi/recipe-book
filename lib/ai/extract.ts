import 'server-only';
import { flags } from '@/lib/env';
import { recipeDraftSchema, type RecipeDraft } from '@/lib/validation/schemas';
import { parseIngredient } from '@/lib/parsing/ingredients';
import { extractFromSchemaLD } from '@/lib/parsing/schema-ld';

/**
 * Single entry point for capture extraction.
 * Routes URL/text/photo inputs to the right backend, falling back to a
 * deterministic mock when ANTHROPIC_API_KEY is not set so local dev works
 * without network credentials.
 */

export type ExtractInput =
  | { kind: 'url'; url: string }
  | { kind: 'text'; text: string }
  | { kind: 'photo'; blobUrl: string };

export async function extractRecipe(input: ExtractInput): Promise<RecipeDraft> {
  if (input.kind === 'url') return extractFromUrl(input.url);
  if (input.kind === 'text') return extractFromText(input.text);
  return extractFromPhoto(input.blobUrl);
}

async function extractFromUrl(url: string): Promise<RecipeDraft> {
  let html = '';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'RecipeBox/1.0 (+https://github.com/dtmirizzi/recipe-book)',
      },
      // 10-sec timeout via AbortController in real use; Node 25's fetch supports it.
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    html = await res.text();
  } catch (err) {
    // Fall through to mock if we can't fetch (e.g., test runner is offline).
    console.warn('URL fetch failed, returning mock draft', err);
    return mockDraft({ title: deriveTitleFromUrl(url), sourceUrl: url });
  }

  const fromSchema = extractFromSchemaLD(html, url);
  if (fromSchema) return recipeDraftSchema.parse(fromSchema);

  // No schema-LD; in production this would call Claude with the cleaned text.
  if (!flags.hasAnthropicKey) {
    return mockDraft({ title: deriveTitleFromHtml(html) ?? deriveTitleFromUrl(url), sourceUrl: url });
  }

  return await callAnthropicForText(stripHtml(html), { sourceUrl: url });
}

async function extractFromText(text: string): Promise<RecipeDraft> {
  if (!flags.hasAnthropicKey) {
    return mockDraftFromText(text);
  }
  return await callAnthropicForText(text, { sourceText: text });
}

async function extractFromPhoto(blobUrl: string): Promise<RecipeDraft> {
  if (!flags.hasAnthropicKey) {
    return mockDraft({
      title: 'Photo of a recipe',
      sourcePhotoUrl: blobUrl,
      lowConfidence: ['title', 'ingredients'],
    });
  }
  return await callAnthropicForPhoto(blobUrl);
}

// ─── Real Anthropic calls (active when ANTHROPIC_API_KEY is set) ──────────

async function callAnthropicForText(
  text: string,
  source: { sourceUrl?: string; sourceText?: string },
): Promise<RecipeDraft> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk').catch(() => ({ default: null as never }));
  if (!Anthropic) {
    console.warn('@anthropic-ai/sdk not installed; using mock');
    return mockDraftFromText(text);
  }
  const client = new Anthropic();
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Extract a recipe from the following content. Return ONLY JSON matching the schema.\n\n${text.slice(0, 12_000)}`,
      },
    ],
  });
  const block = msg.content.find((c) => c.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No text response');
  const json = JSON.parse(stripCodeFence(block.text));
  return recipeDraftSchema.parse({ ...json, ...source });
}

async function callAnthropicForPhoto(blobUrl: string): Promise<RecipeDraft> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk').catch(() => ({ default: null as never }));
  if (!Anthropic) {
    return mockDraft({ title: 'Photo of a recipe', sourcePhotoUrl: blobUrl });
  }
  const client = new Anthropic();
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: blobUrl } },
          { type: 'text', text: 'Extract a recipe from this image. Return ONLY JSON matching the schema. Mark uncertain fields with confidence < 0.6.' },
        ],
      },
    ],
  });
  const block = msg.content.find((c) => c.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No text response');
  const json = JSON.parse(stripCodeFence(block.text));
  return recipeDraftSchema.parse({ ...json, sourcePhotoUrl: blobUrl });
}

const SYSTEM_PROMPT = `You are a recipe-extraction service. Given content (text or image) that contains a recipe, return a single JSON object with this shape:
{
  "title": string,
  "description": string | null,
  "baseServings": number,            // default 4 if unknown
  "prepMinutes": number | null,
  "cookMinutes": number | null,
  "cuisine": string | null,
  "mealType": "breakfast"|"lunch"|"dinner"|"snack"|"dessert"|"side"|"sauce"|null,
  "dietaryTags": string[],            // e.g. ["vegetarian","gluten-free"]
  "ingredients": [{
    "rawText": string, "name": string,
    "quantity": number | null, "unit": string | null, "note": string | null,
    "confidence": number              // 0..1, 1 if highly confident
  }],
  "steps": [{ "body": string }]
}
Return ONLY JSON, no commentary.`;

function stripCodeFence(s: string) {
  return s.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8_000);
}

function deriveTitleFromHtml(html: string): string | null {
  const m = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  if (m) return m[1].split('|')[0].split(' - ')[0].trim().slice(0, 80);
  const og = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i.exec(html);
  return og ? og[1].slice(0, 80) : null;
}

function deriveTitleFromUrl(url: string) {
  try {
    const u = new URL(url);
    const slug = u.pathname.split('/').filter(Boolean).pop() ?? u.hostname;
    return slug
      .replace(/[-_]/g, ' ')
      .replace(/\.\w+$/, '')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .slice(0, 80);
  } catch {
    return 'Untitled recipe';
  }
}

// ─── Mock extractors (deterministic; used when ANTHROPIC_API_KEY is unset) ──

function mockDraft(opts: {
  title: string;
  sourceUrl?: string;
  sourcePhotoUrl?: string;
  lowConfidence?: string[];
}): RecipeDraft {
  const lowConf = new Set(opts.lowConfidence ?? []);
  return recipeDraftSchema.parse({
    title: opts.title,
    description: 'A warm, comforting weeknight dish. (Generated locally — set ANTHROPIC_API_KEY for real extraction.)',
    baseServings: 4,
    prepMinutes: 10,
    cookMinutes: 20,
    cuisine: 'American',
    mealType: 'dinner',
    dietaryTags: ['quick'],
    ingredients: [
      { rawText: '2 tbsp olive oil', name: 'olive oil', quantity: 2, unit: 'tbsp', note: null, confidence: lowConf.has('ingredients') ? 0.4 : 1 },
      { rawText: '1 onion, diced', name: 'onion', quantity: 1, unit: null, note: 'diced', confidence: 1 },
      { rawText: '2 cloves garlic, minced', name: 'garlic', quantity: 2, unit: 'clove', note: 'minced', confidence: 1 },
      { rawText: '1 lb chicken thighs', name: 'chicken thighs', quantity: 1, unit: 'lb', note: null, confidence: 1 },
      { rawText: '1 lemon, juiced', name: 'lemon', quantity: 1, unit: null, note: 'juiced', confidence: 1 },
      { rawText: 'salt and pepper, to taste', name: 'salt and pepper', quantity: null, unit: null, note: 'to taste', confidence: 1 },
    ],
    steps: [
      { body: 'Heat the olive oil in a large skillet over medium heat.' },
      { body: 'Add the onion and cook until soft, about 5 minutes. Stir in the garlic.' },
      { body: 'Push the vegetables to the side and add the chicken. Brown on both sides.' },
      { body: 'Squeeze the lemon over the pan, season with salt and pepper, and cook through.' },
      { body: 'Serve warm with a fresh side salad or rice.' },
    ],
    sourceUrl: opts.sourceUrl ?? null,
    sourcePhotoUrl: opts.sourcePhotoUrl ?? null,
    sourceText: null,
  });
}

function mockDraftFromText(text: string): RecipeDraft {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const title = lines[0]?.slice(0, 80) ?? 'Pasted recipe';
  const ingLines: string[] = [];
  const stepLines: string[] = [];
  // Start in 'preamble' — only accumulate after we hit a section marker.
  let mode: 'preamble' | 'ing' | 'step' = 'preamble';
  for (const line of lines.slice(1)) {
    if (/^(steps?|directions?|instructions?|method)\b/i.test(line)) {
      mode = 'step';
      continue;
    }
    if (/^(ingredients?)\b/i.test(line)) {
      mode = 'ing';
      continue;
    }
    if (mode === 'preamble') continue;
    // Strip a single leading bullet or numbered-list marker, NOT all digits.
    const stripped = line.replace(/^([-•*]|\d+[.)])\s+/, '').trim();
    if (mode === 'ing') ingLines.push(stripped);
    else stepLines.push(stripped);
  }
  // Fallbacks
  if (ingLines.length === 0) ingLines.push('1 onion, diced', 'salt and pepper, to taste');
  if (stepLines.length === 0) stepLines.push('Combine and cook until done.');

  return recipeDraftSchema.parse({
    title,
    description: 'Imported from pasted text. (Generated locally — set ANTHROPIC_API_KEY for real extraction.)',
    baseServings: 4,
    prepMinutes: null,
    cookMinutes: null,
    cuisine: null,
    mealType: null,
    dietaryTags: [],
    ingredients: ingLines.map((l) => ({ ...parseIngredient(l), confidence: 0.7 })),
    steps: stepLines.map((body) => ({ body })),
    sourceUrl: null,
    sourcePhotoUrl: null,
    sourceText: text,
  });
}
