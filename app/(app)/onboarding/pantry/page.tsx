import Link from 'next/link';
import { OnboardingPantryClient } from './onboarding-pantry-client';

export const metadata = { title: 'Seed your pantry' };

const STARTERS: Record<string, string[]> = {
  Produce: ['onion', 'garlic', 'lemon', 'lime', 'ginger', 'tomato', 'carrot', 'celery', 'bell pepper', 'parsley', 'cilantro', 'basil'],
  Proteins: ['chicken breast', 'chicken thigh', 'ground beef', 'eggs', 'tofu', 'salmon'],
  Grains: ['rice', 'pasta', 'bread', 'oats', 'flour'],
  Dairy: ['milk', 'butter', 'parmesan', 'cheddar', 'greek yogurt'],
  Pantry: ['olive oil', 'salt', 'pepper', 'soy sauce', 'honey', 'maple syrup', 'canned tomatoes', 'chicken stock'],
  Spices: ['cumin', 'paprika', 'cinnamon', 'red pepper flakes', 'oregano', 'thyme'],
};

export default function OnboardingPantryPage() {
  return (
    <div className="container-rb py-8 max-w-3xl">
      <Link href="/onboarding" className="t-meta">
        ← Back
      </Link>
      <div className="t-eyebrow mt-3" style={{ color: 'var(--tomato-700)' }}>
        Step 02 · Pantry
      </div>
      <h1 className="t-h1 mt-1">Tap the staples you usually have.</h1>
      <p className="t-body soft mt-2">
        Don't overthink it. We just need a baseline so the cook page can rank recipes well.
      </p>

      <div className="mt-6">
        <OnboardingPantryClient starters={STARTERS} />
      </div>
    </div>
  );
}
