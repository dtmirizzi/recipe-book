'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RecipeDraft } from '@/lib/validation/schemas';
import type { RecipeMedia } from '@/db/schema';
import { MediaEditor } from './media-editor';

const MEAL_TYPES = [null, 'breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'side', 'sauce'] as const;
const COMMON_TAGS = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'quick'];

export type StepRef = { id: string; label: string };

export function EditForm({
  id,
  draft,
  coverImageUrl,
  stepRefs,
  initialMedia,
  initialVisibility,
}: {
  id: string;
  draft: RecipeDraft;
  coverImageUrl: string | null;
  stepRefs: StepRef[];
  initialMedia: RecipeMedia[];
  initialVisibility: 'private' | 'public';
}) {
  const [d, setD] = useState<RecipeDraft>(draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibility, setVis] = useState<'private' | 'public'>(initialVisibility);
  const router = useRouter();

  async function toggleVisibility() {
    const next = visibility === 'public' ? 'private' : 'public';
    setVis(next);
    await fetch(`/api/recipes/${id}/visibility`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ visibility: next }),
    });
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/recipes/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ draft: d }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not save');
      }
      router.push(`/recipes/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setBusy(false);
    }
  }

  function update<K extends keyof RecipeDraft>(key: K, val: RecipeDraft[K]) {
    setD((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <form onSubmit={onSave} className="flex flex-col gap-6">
      <div className="card flex items-center justify-between gap-3">
        <div>
          <div className="t-eyebrow">Visibility</div>
          <div className="t-meta mt-1">
            {visibility === 'public'
              ? 'Public — searchable in Discover by anyone.'
              : 'Private — only you and your roundtables can see it.'}
          </div>
        </div>
        <button
          type="button"
          className={visibility === 'public' ? 'btn btn-primary' : 'btn'}
          onClick={toggleVisibility}
        >
          {visibility === 'public' ? 'Make private' : 'Make public'}
        </button>
      </div>

      <MediaEditor
        recipeId={id}
        initialCover={coverImageUrl}
        initialMedia={initialMedia}
        stepRefs={stepRefs}
      />

      <div className="card flex flex-col gap-4">
        <Field label="Title">
          <input
            className="input input--lg"
            style={{ fontFamily: 'var(--font-serif)', fontSize: 22 }}
            value={d.title}
            onChange={(e) => update('title', e.target.value)}
            required
          />
        </Field>
        <Field label="Description">
          <textarea
            className="input"
            rows={2}
            value={d.description ?? ''}
            onChange={(e) => update('description', e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Servings">
            <input
              type="number"
              min={1}
              max={99}
              className="input"
              value={d.baseServings}
              onChange={(e) => update('baseServings', Math.max(1, parseInt(e.target.value || '1', 10)))}
            />
          </Field>
          <Field label="Prep (min)">
            <input
              type="number"
              min={0}
              className="input"
              value={d.prepMinutes ?? ''}
              onChange={(e) => update('prepMinutes', e.target.value ? parseInt(e.target.value, 10) : null)}
            />
          </Field>
          <Field label="Cook (min)">
            <input
              type="number"
              min={0}
              className="input"
              value={d.cookMinutes ?? ''}
              onChange={(e) => update('cookMinutes', e.target.value ? parseInt(e.target.value, 10) : null)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cuisine">
            <input
              className="input"
              value={d.cuisine ?? ''}
              onChange={(e) => update('cuisine', e.target.value || null)}
            />
          </Field>
          <Field label="Meal type">
            <select
              className="input"
              value={d.mealType ?? ''}
              onChange={(e) => update('mealType', (e.target.value || null) as RecipeDraft['mealType'])}
            >
              {MEAL_TYPES.map((m) => (
                <option key={m ?? 'none'} value={m ?? ''}>
                  {m ?? '(none)'}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Dietary tags">
          <div className="flex flex-wrap gap-2">
            {COMMON_TAGS.map((tag) => {
              const on = d.dietaryTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className="chip"
                  aria-pressed={on}
                  onClick={() =>
                    update(
                      'dietaryTags',
                      on ? d.dietaryTags.filter((t) => t !== tag) : [...d.dietaryTags, tag],
                    )
                  }
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </Field>
      </div>

      <div className="card flex flex-col gap-3">
        <div className="t-eyebrow">Ingredients</div>
        <ul className="flex flex-col gap-2">
          {d.ingredients.map((ing, i) => (
            <li key={i} className="flex gap-2 items-center">
              <input
                className="input"
                value={ing.rawText}
                onChange={(e) => {
                  const next = [...d.ingredients];
                  next[i] = { ...ing, rawText: e.target.value, name: e.target.value };
                  update('ingredients', next);
                }}
                aria-label={`Ingredient ${i + 1}`}
              />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => update('ingredients', d.ingredients.filter((_, j) => j !== i))}
                aria-label="Remove ingredient"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="btn"
          onClick={() =>
            update('ingredients', [
              ...d.ingredients,
              { rawText: '', name: '', quantity: null, unit: null, note: null, confidence: 1 },
            ])
          }
        >
          + Add ingredient
        </button>
      </div>

      <div className="card flex flex-col gap-3">
        <div className="t-eyebrow">Steps</div>
        <ol className="flex flex-col gap-2">
          {d.steps.map((step, i) => (
            <li key={i} className="flex gap-2 items-start">
              <div
                className="flex items-center justify-center mt-1"
                style={{
                  width: 28, height: 28, borderRadius: 14,
                  background: 'var(--tomato-50)', color: 'var(--tomato-700)',
                  fontFamily: 'var(--font-serif)', fontWeight: 600,
                  flexShrink: 0,
                }}
                aria-hidden
              >
                {i + 1}
              </div>
              <textarea
                className="input flex-1"
                rows={2}
                value={step.body}
                onChange={(e) => {
                  const next = [...d.steps];
                  next[i] = { body: e.target.value };
                  update('steps', next);
                }}
                aria-label={`Step ${i + 1}`}
              />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => update('steps', d.steps.filter((_, j) => j !== i))}
                aria-label="Remove step"
              >
                ×
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className="btn" onClick={() => update('steps', [...d.steps, { body: '' }])}>
          + Add step
        </button>
      </div>

      {error ? <p className="t-meta" style={{ color: 'var(--err)' }}>{error}</p> : null}
      <div className="flex gap-3">
        <button type="submit" className="btn btn-primary flex-1" disabled={busy || !d.title.trim()}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" className="btn" onClick={() => router.push(`/recipes/${id}`)} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="t-eyebrow">{label}</span>
      {children}
    </label>
  );
}
