import 'server-only';
import { flags } from '@/lib/env';
import { recipeDraftSchema, type RecipeDraft } from '@/lib/validation/schemas';
import { parseIngredient } from '@/lib/parsing/ingredients';
import { extractFromSchemaLD } from '@/lib/parsing/schema-ld';
import { getOpenRouter, models } from './openrouter';

/**
 * Single entry point for capture extraction.
 * Routes URL/text/photo inputs to the right backend, falling back to a
 * deterministic mock when OPENROUTER_API_KEY is not set so local dev works
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
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    html = await res.text();
  } catch (err) {
    console.warn('URL fetch failed, returning mock draft', err);
    return mockDraft({ title: deriveTitleFromUrl(url), sourceUrl: url });
  }

  const fromSchema = extractFromSchemaLD(html, url);
  if (fromSchema) return recipeDraftSchema.parse(fromSchema);

  if (!flags.hasOpenrouterKey) {
    return mockDraft({ title: deriveTitleFromHtml(html) ?? deriveTitleFromUrl(url), sourceUrl: url });
  }
  return await callLLMText(stripHtml(html), { sourceUrl: url });
}

async function extractFromText(text: string): Promise<RecipeDraft> {
  if (!flags.hasOpenrouterKey) return mockDraftFromText(text);
  return await callLLMText(text, { sourceText: text });
}

async function extractFromPhoto(blobUrl: string): Promise<RecipeDraft> {
  if (!flags.hasOpenrouterKey) {
    return mockDraft({
      title: 'Photo of a recipe',
      sourcePhotoUrl: blobUrl,
      lowConfidence: ['title', 'ingredients'],
    });
  }
  return await callLLMVision(blobUrl);
}

// ─── Real LLM calls via OpenRouter (active when OPENROUTER_API_KEY is set) ──

async function callLLMText(
  text: string,
  source: { sourceUrl?: string; sourceText?: string },
): Promise<RecipeDraft> {
  const client = getOpenRouter();
  const completion = await client.chat.completions.create({
    model: models.text(),
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Extract a recipe from the following content. Return ONLY JSON matching the schema.\n\n${text.slice(0, 12_000)}`,
      },
    ],
  });
  const body = completion.choices[0]?.message?.content;
  if (!body) throw new Error('Empty LLM response');
  const json = JSON.parse(stripCodeFence(body));
  return recipeDraftSchema.parse({ ...json, ...source });
}

async function callLLMVision(blobUrl: string): Promise<RecipeDraft> {
  const client = getOpenRouter();
  const completion = await client.chat.completions.create({
    model: models.vision(),
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract a recipe from this image. Return ONLY JSON matching the schema. Mark uncertain fields with confidence < 0.6.',
          },
          { type: 'image_url', image_url: { url: blobUrl } },
        ],
      },
    ],
  });
  const body = completion.choices[0]?.message?.content;
  if (!body) throw new Error('Empty LLM response');
  const json = JSON.parse(stripCodeFence(body));
  return recipeDraftSchema.parse({ ...json, sourcePhotoUrl: blobUrl });
}

const SYSTEM_PROMPT = `You are a culinary recipe-extraction service. The input is ALWAYS a cooking recipe (text, web page, or photo of a recipe card / cookbook page / handwritten note). Your job is to parse it into structured form so a home cook can scale, shop, and follow the steps.

Treat every input as a recipe. If text looks ambiguous, lean toward recipe interpretation: lines with quantities + food words are ingredients; numbered or imperative-verb sentences ("Heat", "Add", "Stir") are steps; the most prominent line at the top is usually the title.

Return a single JSON object with this shape:
{
  "title": string,                     // the recipe's name
  "description": string | null,        // 1-2 sentence summary if present (or null)
  "baseServings": number,              // servings/yield. Default 4 if unknown.
  "prepMinutes": number | null,        // active prep time
  "cookMinutes": number | null,        // cooking/baking time
  "cuisine": string | null,            // e.g. "Italian", "Mexican", "Thai"
  "mealType": "breakfast"|"lunch"|"dinner"|"snack"|"dessert"|"side"|"sauce"|null,
  "dietaryTags": string[],             // e.g. ["vegetarian","gluten-free","dairy-free","vegan"]
  "ingredients": [{
    "rawText": string,                 // the original line, verbatim — e.g. "2 tbsp extra-virgin olive oil"
    "name": string,                    // the food item only — e.g. "extra-virgin olive oil"
    "quantity": number | null,         // numeric amount. Convert fractions: "1/2"→0.5, "1 1/4"→1.25, "a pinch"→null
    "unit": string | null,             // standardized unit: tsp, tbsp, cup, oz, lb, g, kg, ml, l, clove, can, pinch, etc. Null for whole-item counts ("2 eggs" → quantity:2, unit:null).
    "note": string | null,             // preparation/qualifier — e.g. "diced", "to taste", "room temperature", "optional"
    "confidence": number               // 0..1. Use < 0.6 when handwriting is unclear, quantity is ambiguous, or you guessed.
  }],
  "steps": [{ "body": string }]        // each step as a separate object, in order. Strip leading numbering ("1. ", "Step 2:").
}

Critical parsing rules for ingredients:
- Keep quantity, unit, and name in their correct fields. NEVER put the number in "name".
- Common abbreviations: t/tsp = teaspoon, T/Tbsp = tablespoon, c = cup, oz = ounce, lb = pound, g = gram, kg = kilogram, ml = milliliter, l = liter.
- Ranges ("2-3 cloves") → use the lower bound for quantity and put the range in note.
- "Salt and pepper to taste" → quantity:null, unit:null, note:"to taste".
- "1 (14 oz) can diced tomatoes" → quantity:1, unit:"can", note:"14 oz, diced", name:"tomatoes".
- Don't merge sub-ingredients across sections. If the recipe has "For the sauce:" and "For the topping:" headers, you may prepend the section to the note (e.g. note:"for the sauce") but keep each item separate.

Return ONLY the JSON object, no commentary, no markdown fences.`;

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

// ─── Mock extractors (deterministic; used when OPENROUTER_API_KEY is unset) ──

function mockDraft(opts: {
  title: string;
  sourceUrl?: string;
  sourcePhotoUrl?: string;
  lowConfidence?: string[];
}): RecipeDraft {
  const lowConf = new Set(opts.lowConfidence ?? []);
  return recipeDraftSchema.parse({
    title: opts.title,
    description:
      'A warm, comforting weeknight dish. (Generated locally — set OPENROUTER_API_KEY for real extraction.)',
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
    const stripped = line.replace(/^([-•*]|\d+[.)])\s+/, '').trim();
    if (mode === 'ing') ingLines.push(stripped);
    else stepLines.push(stripped);
  }
  if (ingLines.length === 0) ingLines.push('1 onion, diced', 'salt and pepper, to taste');
  if (stepLines.length === 0) stepLines.push('Combine and cook until done.');

  return recipeDraftSchema.parse({
    title,
    description:
      'Imported from pasted text. (Generated locally — set OPENROUTER_API_KEY for real extraction.)',
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
