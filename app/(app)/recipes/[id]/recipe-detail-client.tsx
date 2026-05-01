'use client';

import { useState } from 'react';
import { formatQuantity, scaleQuantity } from '@/lib/parsing/scaling';
import type { Recipe, RecipeIngredient, RecipeStep } from '@/db/schema';

type FullRecipe = Recipe & {
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
};

export function RecipeDetailClient({ recipe }: { recipe: FullRecipe }) {
  const [target, setTarget] = useState(recipe.baseServings);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,_1fr)_minmax(0,_1.4fr)] gap-8 mt-8">
      {/* Ingredients */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="t-h2">Ingredients</h2>
          <ServingsScaler value={target} base={recipe.baseServings} onChange={setTarget} />
        </div>
        <ul className="flex flex-col gap-2">
          {recipe.ingredients.map((ing) => {
            const qty = ing.quantity != null ? Number(ing.quantity) : null;
            const scaled = scaleQuantity(qty, recipe.baseServings, target);
            const displayQty = formatQuantity(scaled);
            return (
              <li
                key={ing.id}
                className="flex items-baseline gap-3 py-2 border-b"
                style={{ borderColor: 'var(--line)' }}
              >
                <div
                  className="t-mono"
                  style={{
                    minWidth: 90,
                    color: 'var(--ink)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {[displayQty, ing.unit].filter(Boolean).join(' ') || '—'}
                </div>
                <div className="flex-1">
                  <div>{ing.name}</div>
                  {ing.note ? <div className="t-meta">{ing.note}</div> : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Steps */}
      <section>
        <h2 className="t-h2 mb-4">Steps</h2>
        <ol className="flex flex-col gap-5">
          {recipe.steps.map((step, i) => (
            <li key={step.id} className="flex gap-4">
              <div
                className="flex items-center justify-center mt-1 flex-shrink-0"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  background: 'var(--tomato-50)',
                  color: 'var(--tomato-700)',
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 600,
                  fontSize: 16,
                }}
                aria-hidden
              >
                {i + 1}
              </div>
              <p className="t-body" style={{ flex: 1 }}>
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function ServingsScaler({
  value,
  base,
  onChange,
}: {
  value: number;
  base: number;
  onChange: (v: number) => void;
}) {
  return (
    <div
      className="inline-flex items-center gap-3 chip"
      style={{ padding: '6px 10px', fontSize: 13, background: 'var(--paper)' }}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        aria-label="Decrease servings"
        style={{ width: 24, height: 24 }}
      >
        −
      </button>
      <span style={{ minWidth: 90, textAlign: 'center' }}>
        {value} {value === 1 ? 'serving' : 'servings'}
        {value !== base ? <span className="t-meta"> (base {base})</span> : null}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(99, value + 1))}
        aria-label="Increase servings"
        style={{ width: 24, height: 24 }}
      >
        +
      </button>
    </div>
  );
}
