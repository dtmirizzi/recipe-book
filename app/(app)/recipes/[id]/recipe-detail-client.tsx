'use client';

import { useState } from 'react';
import { formatQuantity, scaleQuantity } from '@/lib/parsing/scaling';
import type { Recipe, RecipeIngredient, RecipeStep, RecipeMedia } from '@/db/schema';

type FullRecipe = Recipe & {
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  media: RecipeMedia[];
};

export function RecipeDetailClient({ recipe }: { recipe: FullRecipe }) {
  const [target, setTarget] = useState(recipe.baseServings);
  const mediaByStep = new Map<string, RecipeMedia[]>();
  const orphanMedia: RecipeMedia[] = [];
  for (const m of recipe.media) {
    if (m.stepId) {
      if (!mediaByStep.has(m.stepId)) mediaByStep.set(m.stepId, []);
      mediaByStep.get(m.stepId)!.push(m);
    } else {
      orphanMedia.push(m);
    }
  }

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
          {recipe.steps.map((step, i) => {
            const stepMedia = mediaByStep.get(step.id) ?? [];
            return (
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
                <div style={{ flex: 1 }}>
                  <p className="t-body">{step.body}</p>
                  {stepMedia.length > 0 ? (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {stepMedia.map((m) => (
                        <MediaTile key={m.id} media={m} />
                      ))}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>

        {orphanMedia.length > 0 ? (
          <div className="mt-10">
            <h2 className="t-h2 mb-4">Photos & videos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {orphanMedia.map((m) => (
                <MediaTile key={m.id} media={m} />
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function MediaTile({ media }: { media: RecipeMedia }) {
  const radius = 12;
  if (media.kind === 'image') {
    return (
      <figure className="flex flex-col gap-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.url}
          alt={media.caption ?? ''}
          loading="lazy"
          style={{ width: '100%', borderRadius: radius, display: 'block' }}
        />
        {media.caption ? <figcaption className="t-meta">{media.caption}</figcaption> : null}
      </figure>
    );
  }
  if (media.kind === 'video') {
    return (
      <figure className="flex flex-col gap-1">
        <video
          src={media.url}
          poster={media.posterUrl ?? undefined}
          controls
          playsInline
          preload="metadata"
          style={{ width: '100%', borderRadius: radius, display: 'block', background: '#000' }}
        />
        {media.caption ? <figcaption className="t-meta">{media.caption}</figcaption> : null}
      </figure>
    );
  }
  // embed
  return (
    <figure className="flex flex-col gap-1">
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: radius, overflow: 'hidden' }}>
        <iframe
          src={media.url}
          title={media.caption ?? 'Embedded video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
      </div>
      {media.caption ? <figcaption className="t-meta">{media.caption}</figcaption> : null}
    </figure>
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
