import { test, expect } from '@playwright/test';

test.describe('Landing hero video', () => {
  test('renders video tag with both formats and poster', async ({ page }) => {
    await page.goto('/');
    const video = page.locator('video.hero-video');
    await expect(video).toBeVisible();
    const poster = await video.getAttribute('poster');
    expect(poster).toBe('/videos/landing-hero-poster.jpg');
    const sources = await video.locator('source').all();
    expect(sources.length).toBe(2);
    const types = await Promise.all(sources.map((s) => s.getAttribute('type')));
    expect(types).toContain('video/webm');
    expect(types).toContain('video/mp4');
  });

  test('serves the video assets', async ({ request }) => {
    for (const path of [
      '/videos/landing-hero.mp4',
      '/videos/landing-hero.webm',
      '/videos/landing-hero-poster.jpg',
    ]) {
      const r = await request.get(path);
      expect(r.status(), `${path} status`).toBe(200);
      const len = Number(r.headers()['content-length'] ?? '0');
      expect(len, `${path} bytes`).toBeGreaterThan(50_000);
    }
  });

  test('hero copy stays legible on top of the video', async ({ page }) => {
    await page.goto('/');
    const heading = page.getByRole('heading', { name: /Tonight, something warm/i });
    await expect(heading).toBeVisible();
    await page.waitForTimeout(800);
    await page.screenshot({
      path: `test-results/screenshots-${test.info().project.name}/00-landing-hero-video.png`,
      fullPage: false,
    });
  });
});
