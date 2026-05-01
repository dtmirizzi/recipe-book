import 'server-only';
import type { ParsedQuery } from './parse-query';

export type RecipeForScoring = {
  id: string;
  title: string;
  totalMinutes: number | null;
  dietaryTags: string[];
  ingredientNames: string[];
  cuisine: string | null;
};

export type PantryEntry = {
  ingredientId: string;
  name: string; // canonical lowercased
  expiresAt: string | null; // ISO date or null
};

export type ScoredRecipe = {
  recipe: RecipeForScoring;
  score: number;
  matchPct: number;
  ownedIngredients: string[];
  missingIngredients: string[];
  expiringIngredients: string[];
  reasons: string[];
};

const W_OVERLAP = 2;
const W_MISSING = 1;
const W_EXPIRING = 3;
const W_MUST = 5;
const W_MOOD = 1.5;
const W_TIME = 0.5;

export function scoreRecipe(
  recipe: RecipeForScoring,
  pantry: PantryEntry[],
  parsed: ParsedQuery,
): ScoredRecipe | null {
  // Dietary required
  for (const tag of parsed.dietaryRequired) {
    if (!recipe.dietaryTags.includes(tag)) return null;
  }
  // Time max
  if (parsed.timeMaxMinutes != null && recipe.totalMinutes != null && recipe.totalMinutes > parsed.timeMaxMinutes) {
    return null;
  }

  const pantryByName = new Map<string, PantryEntry>();
  for (const p of pantry) pantryByName.set(p.name, p);

  const recipeIngs = recipe.ingredientNames.map((n) => n.toLowerCase());
  const owned: string[] = [];
  const missing: string[] = [];
  const expiring: string[] = [];

  for (const ing of recipeIngs) {
    const matched = matchPantry(ing, pantryByName);
    if (matched) {
      owned.push(matched.name);
      if (isSoon(matched.expiresAt)) expiring.push(matched.name);
    } else {
      missing.push(ing);
    }
  }

  let score = 0;
  const reasons: string[] = [];

  // Overlap
  score += W_OVERLAP * owned.length;
  if (owned.length > 0) reasons.push(`uses ${owned.length} pantry items`);

  // Missing penalty (less harsh when only 1–2 missing)
  score -= W_MISSING * missing.length;

  // Expiring bonus
  if (expiring.length > 0) {
    score += W_EXPIRING * expiring.length;
    reasons.push(`uses ${expiring.length} expiring`);
  }
  if (parsed.prioritizeExpiring && expiring.length === 0) score -= 1;

  // Must-use
  for (const must of parsed.mustUseIngredients) {
    if (recipeIngs.some((r) => r.includes(must) || must.includes(r))) {
      score += W_MUST;
      reasons.push(`features ${must}`);
    } else {
      score -= 1.5; // penalty for not featuring requested ingredient
    }
  }

  // Mood — soft signal via dietary tags + cuisine
  if (parsed.mood) {
    const tagBlob = `${recipe.dietaryTags.join(' ')} ${recipe.cuisine ?? ''} ${recipe.title}`.toLowerCase();
    if (parsed.mood === 'weeknight' && (recipe.dietaryTags.includes('quick') || (recipe.totalMinutes ?? 999) <= 30)) {
      score += W_MOOD;
    }
    if (parsed.mood === 'comforting' && /braise|stew|soup|pasta|cheese|roast|bake/.test(tagBlob)) {
      score += W_MOOD;
    }
    if (parsed.mood === 'fresh' && /salad|vegetarian|vegan|herb|citrus|spring/.test(tagBlob)) {
      score += W_MOOD;
    }
    if (parsed.mood === 'one_pan' && /skillet|sheet pan|one[- ]pan/.test(tagBlob)) {
      score += W_MOOD;
    }
  }

  // Time bonus — closer to user-asked time wins
  if (parsed.timeMaxMinutes != null && recipe.totalMinutes != null) {
    const slack = parsed.timeMaxMinutes - recipe.totalMinutes;
    if (slack >= 0) score += W_TIME * Math.min(1, slack / parsed.timeMaxMinutes);
  }

  const fitDenominator = Math.max(1, recipeIngs.length);
  const matchPct = Math.round((owned.length / fitDenominator) * 100);

  return {
    recipe,
    score,
    matchPct,
    ownedIngredients: owned,
    missingIngredients: missing,
    expiringIngredients: expiring,
    reasons,
  };
}

function matchPantry(recipeIngredientName: string, pantry: Map<string, PantryEntry>): PantryEntry | null {
  // Exact
  if (pantry.has(recipeIngredientName)) return pantry.get(recipeIngredientName)!;

  // Substring either way (handles "cherry tomato" ↔ "tomato")
  for (const [name, entry] of pantry) {
    if (
      name === recipeIngredientName ||
      recipeIngredientName.includes(name) ||
      name.includes(recipeIngredientName)
    ) {
      return entry;
    }
  }

  // Tokenized match — useful for "garlic, minced" vs "garlic"
  const tokens = recipeIngredientName.split(/\s+/);
  for (const t of tokens) {
    if (t.length < 3) continue;
    if (pantry.has(t)) return pantry.get(t)!;
  }
  return null;
}

function isSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const ts = new Date(expiresAt).getTime();
  if (Number.isNaN(ts)) return false;
  return ts - Date.now() <= 3 * 24 * 60 * 60 * 1000;
}
