/**
 * Display-time servings scaler.
 * Stored quantities are canonical at recipe.baseServings.
 * scaleQuantity(qty, base, target) returns the display value.
 */

export function scaleQuantity(qty: number | null, base: number, target: number): number | null {
  if (qty === null || base <= 0) return qty;
  return (qty * target) / base;
}

const FRACTION_MAP: Array<[number, string]> = [
  [1 / 8, '⅛'],
  [1 / 4, '¼'],
  [1 / 3, '⅓'],
  [3 / 8, '⅜'],
  [1 / 2, '½'],
  [5 / 8, '⅝'],
  [2 / 3, '⅔'],
  [3 / 4, '¾'],
  [7 / 8, '⅞'],
];

export function formatQuantity(q: number | null): string {
  if (q === null || Number.isNaN(q)) return '';
  if (q === 0) return '0';

  const whole = Math.floor(q);
  const frac = q - whole;
  if (frac < 0.02) return String(whole);

  let bestStr = frac.toFixed(2);
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const [val, str] of FRACTION_MAP) {
    const d = Math.abs(frac - val);
    if (d < bestDiff && d < 0.06) {
      bestDiff = d;
      bestStr = str;
    }
  }
  if (bestStr === frac.toFixed(2)) {
    // No close fraction match — render as decimal trimmed
    return q < 10 ? q.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') : Math.round(q).toString();
  }
  return whole > 0 ? `${whole} ${bestStr}` : bestStr;
}
