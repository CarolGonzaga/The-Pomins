import { test, expect } from '@playwright/test';
test('PWA installs a static cache and serves an offline fallback', async ({
  page,
  context,
  request,
}) => {
  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBe(true);
  const data = await manifest.json();
  expect(data.display).toBe('standalone');
  expect(data.icons.some((icon: { purpose: string }) => icon.purpose === 'maskable')).toBe(true);
  expect((await request.get('/icons/apple-touch-icon.png')).ok()).toBe(true);
  await page.goto('/');
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    const urls: string[] = [];
    for (const key of keys) {
      const cache = await caches.open(key);
      urls.push(...(await cache.keys()).map((request) => new URL(request.url).pathname));
    }
    return urls;
  });
  expect(cached).toContain('/offline.html');
  expect(
    cached.some((path) => path.startsWith('/api/') || path.startsWith('/auth') || path === '/'),
  ).toBe(false);
  await context.setOffline(true);
  await page.goto('/offline-navigation');
  await expect(page.getByRole('heading', { name: 'As histórias esperam por você.' })).toBeVisible();
  await context.setOffline(false);
});
