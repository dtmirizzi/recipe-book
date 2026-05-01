import 'server-only';
import { flags } from '@/lib/env';

export type ParsedQuery = {
  mood?: string;
  timeMaxMinutes?: number;
  dietaryRequired: string[];
  dietaryAvoid: string[];
  mustUseIngredients: string[];
  prioritizeExpiring: boolean;
  rawQuery: string;
};

/**
 * Parse a free-form query like "quick weeknight vegetarian dinner using chicken
 * and the lemons that are about to go bad" into structured constraints.
 *
 * Local heuristic version (no LLM); the production code path would call Claude
 * Haiku with structured output. The local version handles the common patterns
 * the design transcripts called out.
 */
export async function parseQuery(query: string, opts?: { knownIngredients?: string[] }): Promise<ParsedQuery> {
  if (flags.hasAnthropicKey) {
    try {
      return await parseWithClaude(query, opts);
    } catch (err) {
      console.warn('Claude query parse failed, falling back to heuristic', err);
    }
  }
  return heuristicParse(query, opts);
}

function heuristicParse(query: string, opts?: { knownIngredients?: string[] }): ParsedQuery {
  const q = query.toLowerCase();
  const out: ParsedQuery = {
    dietaryRequired: [],
    dietaryAvoid: [],
    mustUseIngredients: [],
    prioritizeExpiring: false,
    rawQuery: query,
  };

  // Time
  const timeMatch =
    /(?:under|within|less than|in)\s+(\d{1,3})\s*(?:min|minutes)/.exec(q) ||
    /(\d{1,3})\s*(?:min|minutes)\b/.exec(q);
  if (timeMatch) out.timeMaxMinutes = Math.max(5, Math.min(180, Number(timeMatch[1])));
  if (/\b(quick|fast|weeknight|speedy)\b/.test(q) && !out.timeMaxMinutes) out.timeMaxMinutes = 30;
  if (/\b(slow|braise|all afternoon|sunday)\b/.test(q)) out.timeMaxMinutes = undefined;

  // Mood
  const moods: Record<string, RegExp> = {
    weeknight: /weeknight/,
    comforting: /comfort(ing)?|cozy|warm|hearty/,
    fresh: /fresh|light|bright|summer/,
    filling: /filling|hearty|substantial/,
    one_pan: /one pan|one pot|sheet pan/,
  };
  for (const [name, re] of Object.entries(moods)) {
    if (re.test(q)) {
      out.mood = name;
      break;
    }
  }

  // Diet
  const required: Array<[string, RegExp]> = [
    ['vegan', /\bvegan\b/],
    ['vegetarian', /\bvegetarian\b|\bveggie\b/],
    ['gluten-free', /\bgluten[- ]free\b|\bgf\b/],
    ['dairy-free', /\bdairy[- ]free\b/],
    ['nut-free', /\bnut[- ]free\b/],
  ];
  for (const [tag, re] of required) {
    if (re.test(q)) out.dietaryRequired.push(tag);
  }
  if (/\bno (peanut|nut)/.test(q) && !out.dietaryAvoid.includes('nuts')) out.dietaryAvoid.push('nuts');
  if (/\bno dairy\b/.test(q)) out.dietaryAvoid.push('dairy');

  // "Use what's about to go bad / expiring"
  if (/\b(about to (?:go bad|turn|expire))|\bexpiring\b|\buse up\b/.test(q)) {
    out.prioritizeExpiring = true;
  }

  // Must-use ingredients — match against known catalog if provided
  const known = (opts?.knownIngredients ?? []).map((s) => s.toLowerCase());
  for (const name of known) {
    if (q.includes(name)) out.mustUseIngredients.push(name);
  }

  // Also try simple "with X, Y, and Z" pattern
  const withMatch = /\b(?:with|using)\s+([a-zA-Z, ]+?)(?:\.|$|\?)/.exec(q);
  if (withMatch) {
    const parts = withMatch[1]
      .split(/,| and /)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const p of parts) {
      if (p && !out.mustUseIngredients.includes(p) && p.length < 30) {
        out.mustUseIngredients.push(p);
      }
    }
  }

  return out;
}

async function parseWithClaude(query: string, _opts?: { knownIngredients?: string[] }): Promise<ParsedQuery> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk').catch(() => ({ default: null as never }));
  if (!Anthropic) throw new Error('SDK not installed');
  const client = new Anthropic();
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: `Convert a home-cooking query into JSON with these fields (no commentary):
{ "mood"?, "timeMaxMinutes"?, "dietaryRequired": string[], "dietaryAvoid": string[],
  "mustUseIngredients": string[], "prioritizeExpiring": boolean }
Use lowercase, simple words. timeMaxMinutes only if implied.`,
    messages: [{ role: 'user', content: query }],
  });
  const block = msg.content.find((c) => c.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No text');
  const json = JSON.parse(block.text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
  return {
    mood: json.mood,
    timeMaxMinutes: json.timeMaxMinutes,
    dietaryRequired: json.dietaryRequired ?? [],
    dietaryAvoid: json.dietaryAvoid ?? [],
    mustUseIngredients: (json.mustUseIngredients ?? []).map((s: string) => s.toLowerCase()),
    prioritizeExpiring: Boolean(json.prioritizeExpiring),
    rawQuery: query,
  };
}
