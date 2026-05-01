import { parseHTML } from 'linkedom';
import { parseIngredient } from './ingredients';
import type { RecipeDraft } from '@/lib/validation/schemas';

/**
 * Try to extract a Recipe from a page's schema.org JSON-LD.
 * Returns null if no Recipe block is present.
 */
export function extractFromSchemaLD(html: string, sourceUrl?: string): RecipeDraft | null {
  const { document } = parseHTML(html);
  const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));

  for (const s of scripts) {
    const text = (s as Element).textContent;
    if (!text) continue;
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      continue;
    }
    const recipe = findRecipe(json);
    if (recipe) return mapToDraft(recipe, sourceUrl);
  }

  return null;
}

function findRecipe(node: unknown): Record<string, unknown> | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const r = findRecipe(item);
      if (r) return r;
    }
    return null;
  }
  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    const t = obj['@type'];
    if (t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'))) return obj;
    if (Array.isArray(obj['@graph'])) {
      const r = findRecipe(obj['@graph']);
      if (r) return r;
    }
  }
  return null;
}

function arr<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v == null) return [];
  return [v as T];
}

function durationToMinutes(s: unknown): number | null {
  if (typeof s !== 'string') return null;
  // ISO 8601 duration PTnHnM
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?/.exec(s);
  if (!m) return null;
  const h = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  const total = h * 60 + min;
  return total > 0 ? total : null;
}

function mapToDraft(r: Record<string, unknown>, sourceUrl?: string): RecipeDraft {
  const ingredientsRaw = arr<string>(r.recipeIngredient).map((s) => String(s));
  const ingredients = ingredientsRaw.map((line) => parseIngredient(line));

  const instructionsRaw = arr<unknown>(r.recipeInstructions).flatMap((it) => {
    if (typeof it === 'string') return [it];
    if (it && typeof it === 'object') {
      const obj = it as Record<string, unknown>;
      const text = obj.text ?? obj.name;
      if (typeof text === 'string') return [text];
      if (obj['@type'] === 'HowToSection' && Array.isArray(obj.itemListElement)) {
        return obj.itemListElement
          .map((sub: unknown) => {
            if (sub && typeof sub === 'object') {
              const s = sub as Record<string, unknown>;
              return typeof s.text === 'string' ? s.text : '';
            }
            return '';
          })
          .filter(Boolean);
      }
    }
    return [];
  });

  const name = String(r.name ?? r.headline ?? 'Untitled');
  const description = typeof r.description === 'string' ? r.description : null;

  const yieldVal = r.recipeYield;
  let baseServings = 4;
  if (typeof yieldVal === 'number') baseServings = Math.max(1, Math.round(yieldVal));
  else if (typeof yieldVal === 'string') {
    const m = /\d+/.exec(yieldVal);
    if (m) baseServings = Math.max(1, parseInt(m[0], 10));
  } else if (Array.isArray(yieldVal)) {
    const first = yieldVal.find((v) => typeof v === 'string') as string | undefined;
    if (first) {
      const m = /\d+/.exec(first);
      if (m) baseServings = Math.max(1, parseInt(m[0], 10));
    }
  }

  const cuisine = arr<string>(r.recipeCuisine)[0] ?? null;
  const category = arr<string>(r.recipeCategory)[0]?.toLowerCase() ?? null;
  const mealType = mapCategoryToMealType(category);

  return {
    title: name,
    description,
    baseServings,
    prepMinutes: durationToMinutes(r.prepTime),
    cookMinutes: durationToMinutes(r.cookTime),
    cuisine,
    mealType,
    dietaryTags: deriveDietaryTags(r),
    ingredients,
    steps: instructionsRaw.map((body) => ({ body: body.trim() })).filter((s) => s.body),
    sourceUrl: sourceUrl ?? (typeof r.url === 'string' ? r.url : null),
    sourcePhotoUrl: null,
    sourceText: null,
  };
}

function mapCategoryToMealType(cat: string | null): RecipeDraft['mealType'] {
  if (!cat) return null;
  if (/breakfast|brunch/.test(cat)) return 'breakfast';
  if (/lunch/.test(cat)) return 'lunch';
  if (/dinner|main/.test(cat)) return 'dinner';
  if (/snack|appet/.test(cat)) return 'snack';
  if (/dessert/.test(cat)) return 'dessert';
  if (/side/.test(cat)) return 'side';
  if (/sauce|dressing|condiment/.test(cat)) return 'sauce';
  return null;
}

function deriveDietaryTags(r: Record<string, unknown>): string[] {
  const tags = new Set<string>();
  const keywords = String(r.keywords ?? '').toLowerCase();
  const cat = arr<string>(r.recipeCategory).join(' ').toLowerCase();
  const all = `${keywords} ${cat}`;
  if (/vegan/.test(all)) tags.add('vegan');
  else if (/vegetarian/.test(all)) tags.add('vegetarian');
  if (/gluten[- ]free/.test(all)) tags.add('gluten-free');
  if (/dairy[- ]free/.test(all)) tags.add('dairy-free');
  if (/nut[- ]free/.test(all)) tags.add('nut-free');
  if (/quick|weeknight/.test(all)) tags.add('quick');
  return [...tags];
}
