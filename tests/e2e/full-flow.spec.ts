import { test, expect, type Page } from '@playwright/test';

const SAMPLE_TEXT = `Lemon Chicken & Spinach
Serves 4. About 30 minutes.

Ingredients
- 2 tbsp olive oil
- 1 lb chicken thighs
- 4 cloves garlic, minced
- 1 lemon, juiced
- 6 oz baby spinach
- salt and pepper, to taste

Steps
1. Heat the olive oil in a skillet over medium heat. Brown the chicken on both sides.
2. Add the garlic and cook until fragrant.
3. Pour in the lemon juice. Toss in the spinach and cover until wilted.
4. Season and serve warm.`;

async function devSignIn(page: Page, email = `e2e+${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`) {
  await page.goto('/sign-in');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: /Continue/i }).click();
  await page.waitForURL(/\/library/, { timeout: 20_000 });
  // Webkit needs the in-flight router.refresh() to settle before the next nav.
  await page.waitForLoadState('networkidle');
}

async function captureTextRecipe(page: Page, text: string = SAMPLE_TEXT) {
  await page.goto('/capture/text', { waitUntil: 'networkidle' });
  await page.locator('textarea').fill(text);
  await page.getByRole('button', { name: /Extract recipe/i }).click();
  await page.waitForURL(/\/capture\/review\//, { timeout: 30_000 });
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /Save to library/i }).click();
  await page.waitForURL(/\/recipes\//, { timeout: 30_000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Recipe Box · landing', () => {
  test('landing renders branded marketing', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Tonight, something warm/i })).toBeVisible();
    await page.screenshot({ path: `test-results/screenshots-${test.info().project.name}/01-landing.png`, fullPage: true });
  });

  test('sign-in renders dev mode form', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
    await expect(page.getByText(/Local dev mode/i)).toBeVisible();
    await page.screenshot({ path: `test-results/screenshots-${test.info().project.name}/02-sign-in.png`, fullPage: true });
  });

  test('protected route redirects unauthenticated users', async ({ page }) => {
    await page.goto('/library');
    await page.waitForURL(/\/sign-in/);
    expect(page.url()).toContain('next=%2Flibrary');
  });

  test('PWA manifest is correct', async ({ request }) => {
    const res = await request.get('/manifest.json');
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.name).toBe('Recipe Box');
    expect(json.start_url).toBe('/library');
    expect(json.display).toBe('standalone');
  });

  test('service worker is served', async ({ request }) => {
    const res = await request.get('/service-worker.js');
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('Recipe Box service worker');
  });

  test('a11y: every link on landing has a visible label', async ({ page }) => {
    await page.goto('/');
    const links = await page.getByRole('link').all();
    expect(links.length).toBeGreaterThan(0);
    for (const b of links) {
      const accessible = (await b.getAttribute('aria-label')) ?? (await b.textContent()) ?? '';
      expect(accessible.trim().length).toBeGreaterThan(0);
    }
  });
});

test.describe('Recipe Box · authenticated flows', () => {
  test('signed-in user lands on empty library', async ({ page }) => {
    await devSignIn(page);
    await expect(page.getByRole('heading', { name: /0 recipes/i })).toBeVisible();
    await page.screenshot({ path: `test-results/screenshots-${test.info().project.name}/03-empty-library.png`, fullPage: true });
  });

  test('capture from text → review → save → recipe detail', async ({ page }) => {
    await devSignIn(page);
    await page.goto('/capture');
    await expect(page.getByRole('heading', { name: /Save anything/i })).toBeVisible();
    await page.screenshot({ path: `test-results/screenshots-${test.info().project.name}/04-capture-doors.png`, fullPage: true });

    await page.getByRole('link', { name: /From text/i }).click();
    await page.locator('textarea').fill(SAMPLE_TEXT);
    await page.getByRole('button', { name: /Extract recipe/i }).click();

    await page.waitForURL(/\/capture\/review\//, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: /Anything to clean up/i })).toBeVisible();
    await page.screenshot({ path: `test-results/screenshots-${test.info().project.name}/05-review.png`, fullPage: true });

    await page.getByRole('button', { name: /Save to library/i }).click();
    await page.waitForURL(/\/recipes\//, { timeout: 30_000 });
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/lemon/i);
    await page.screenshot({ path: `test-results/screenshots-${test.info().project.name}/06-recipe-detail.png`, fullPage: true });
  });

  test('servings scaler updates ingredient quantities', async ({ page }) => {
    await devSignIn(page);
    await captureTextRecipe(page);
    const scalerText = page.getByText(/\d+ servings? \(base \d+\)|^4 servings$/i).first();
    const inc = page.getByRole('button', { name: /Increase servings/i });
    const dec = page.getByRole('button', { name: /Decrease servings/i });
    await inc.click();
    await inc.click();
    await page.screenshot({ path: `test-results/screenshots-${test.info().project.name}/07-recipe-scaled.png`, fullPage: true });
    // Decreasing back to base should remove the "(base N)" suffix
    await dec.click();
    await dec.click();
  });

  test('library shows newly saved recipe', async ({ page }) => {
    await devSignIn(page);
    await captureTextRecipe(page);
    await page.goto('/library', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /1 recipe/i })).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: `test-results/screenshots-${test.info().project.name}/08-library-with-recipe.png`, fullPage: true });
  });

  test('pantry: add starter, type-ahead, and remove', async ({ page }) => {
    await devSignIn(page);
    await page.goto('/pantry', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /^0 items/i })).toBeVisible();
    await page.screenshot({ path: `test-results/screenshots-${test.info().project.name}/09-pantry-empty.png`, fullPage: true });

    // Tap a starter chip
    await page.getByRole('button', { name: /^\+ olive oil$/i }).click();
    await expect(page.getByRole('heading', { name: /^1 item/i })).toBeVisible({ timeout: 8_000 });

    // Type-ahead add
    await page.getByPlaceholder(/lemon, basil/i).fill('lemon');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: /^2 items/i })).toBeVisible({ timeout: 8_000 });
    await page.screenshot({ path: `test-results/screenshots-${test.info().project.name}/10-pantry-populated.png`, fullPage: true });
  });

  test('cook page: smart search returns ranked results', async ({ page }) => {
    await devSignIn(page);
    // Seed a pantry + a recipe
    await page.request.post('/api/pantry', { data: { name: 'olive oil' } });
    await page.request.post('/api/pantry', { data: { name: 'chicken thighs' } });
    await page.request.post('/api/pantry', { data: { name: 'lemon' } });
    await page.request.post('/api/pantry', { data: { name: 'garlic' } });
    await page.request.post('/api/pantry', { data: { name: 'baby spinach' } });
    await captureTextRecipe(page);

    await page.goto('/cook', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /What's for dinner/i })).toBeVisible();
    await page.getByRole('button', { name: /Quick weeknight dinner/i }).click();
    await page.waitForResponse((res) => res.url().includes('/api/cook/search') && res.ok(), {
      timeout: 15_000,
    });
    // Should have at least one result and a match% chip
    await expect(page.getByText(/% match/i).first()).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: `test-results/screenshots-${test.info().project.name}/11-cook-results.png`, fullPage: true });
  });

  test('settings page renders and supports unit toggle', async ({ page }) => {
    await devSignIn(page);
    await page.goto('/settings', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /Your account/i })).toBeVisible();
    await page.getByRole('button', { name: /Metric/i }).click();
    await page.getByRole('button', { name: /^Save$/i }).click();
    await expect(page.getByText(/^Saved\.$/i)).toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: `test-results/screenshots-${test.info().project.name}/12-settings.png`, fullPage: true });
  });

  test('onboarding renders three steps', async ({ page }) => {
    await devSignIn(page);
    await page.goto('/onboarding', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /Three quick steps/i })).toBeVisible();
    await page.screenshot({ path: `test-results/screenshots-${test.info().project.name}/13-onboarding.png`, fullPage: true });
  });
});
