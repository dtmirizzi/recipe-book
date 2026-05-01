/**
 * Lightweight ingredient line parser.
 * Best-effort — splits raw lines like "1 1/2 cups whole milk, divided"
 * into { quantity, unit, name, note }. Used as a fallback when the LLM
 * returns the rawText only.
 */

const UNITS = new Set([
  'cup', 'cups', 'c',
  'tbsp', 'tablespoon', 'tablespoons',
  'tsp', 'teaspoon', 'teaspoons',
  'oz', 'ounce', 'ounces',
  'lb', 'lbs', 'pound', 'pounds',
  'g', 'gram', 'grams',
  'kg', 'kilogram', 'kilograms',
  'ml', 'milliliter', 'milliliters',
  'l', 'liter', 'liters', 'litre', 'litres',
  'pinch', 'pinches', 'dash', 'dashes',
  'clove', 'cloves',
  'can', 'cans', 'jar', 'jars',
  'slice', 'slices', 'piece', 'pieces',
  'sprig', 'sprigs',
  'bunch', 'bunches',
  'large', 'medium', 'small',
]);

const FRACTIONS: Record<string, number> = {
  '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3,
  '¼': 0.25, '¾': 0.75, '⅕': 0.2, '⅖': 0.4,
  '⅗': 0.6, '⅘': 0.8, '⅙': 1 / 6, '⅚': 5 / 6,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

function parseNumber(s: string): number | null {
  s = s.trim();
  if (FRACTIONS[s]) return FRACTIONS[s];
  if (/^\d+\s+\d+\/\d+$/.test(s)) {
    const [whole, frac] = s.split(/\s+/);
    const [num, den] = frac.split('/').map(Number);
    return Number(whole) + num / den;
  }
  if (/^\d+\/\d+$/.test(s)) {
    const [num, den] = s.split('/').map(Number);
    return num / den;
  }
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  return null;
}

export function parseIngredient(raw: string): {
  rawText: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
} {
  const text = raw.trim();
  if (!text) return { rawText: raw, name: raw.trim(), quantity: null, unit: null, note: null };

  // Split off trailing note after comma
  const commaIdx = text.indexOf(',');
  const head = commaIdx >= 0 ? text.slice(0, commaIdx).trim() : text;
  const note = commaIdx >= 0 ? text.slice(commaIdx + 1).trim() : null;

  const parts = head.split(/\s+/);
  let quantity: number | null = null;
  let unit: string | null = null;
  let i = 0;

  // Read 1–2 tokens for quantity
  if (i < parts.length) {
    const two = parts[i + 1] ? `${parts[i]} ${parts[i + 1]}` : '';
    const q1 = parseNumber(parts[i]);
    const q2 = two ? parseNumber(two) : null;
    if (q2 !== null) {
      quantity = q2;
      i += 2;
    } else if (q1 !== null) {
      quantity = q1;
      i += 1;
    }
  }

  if (i < parts.length && UNITS.has(parts[i].toLowerCase().replace(/\.$/, ''))) {
    unit = parts[i].toLowerCase().replace(/\.$/, '');
    i += 1;
  }

  const name = parts.slice(i).join(' ').trim() || head;
  return { rawText: raw, name, quantity, unit, note };
}
