import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { defaultAppearance } from '../../src/features/character-creator/model';
async function seed(page: import('@playwright/test').Page) {
  await page.addInitScript(
    (data) => {
      localStorage.setItem('pomins-explore-v1', JSON.stringify(data));
    },
    {
      name: 'Lumi',
      appearance: defaultAppearance,
      id: 'test-local',
      born_at: '2026-10-16T12:00:00Z',
      life_xp: 0,
      birth_read: true,
      first_memory: 'sky',
    },
  );
}
test('home and auth meet automated WCAG AA checks', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ['/', '/auth']) {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  }
});
test('creator and focus stay within 320px with no serious accessibility violations', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Criar meu primeiro Pomin' }).click();
  await expect(page.getByRole('heading', { name: /Toda história começa/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  let results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({
    path: `test-results/creator-320-${test.info().project.name}.png`,
    fullPage: true,
  });
  await seed(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir foco' }).click();
  await expect(page.getByRole('heading', { name: /Seu foco abre/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({
    path: `test-results/focus-320-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test('background and connectivity interrupt local focus without rewards', async ({ page }) => {
  await seed(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir foco' }).click();
  await page.context().setOffline(false);
  await page.bringToFront();
  await page.getByRole('button', { name: 'Iniciar foco' }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('button', { name: 'Retomar foco' })).toBeVisible();
  await page.getByRole('button', { name: 'Retomar foco' }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.getByRole('button', { name: 'Retomar foco' })).toBeVisible();
  await expect(page.getByText('Exploração local · sem recompensas')).toBeVisible();
});

test('a full two minute local session completes without granting XP', async ({ page }) => {
  await seed(page);
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir foco' }).click();
  await page.getByRole('button', { name: 'Iniciar foco' }).click();
  await page.clock.runFor(125_000);
  await expect(page.getByText('Você reservou um tempo para começar.')).toBeVisible();
  await expect(page.getByText(/Sessão local concluída, sem XP/)).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pomins-explore-v1')!));
  expect(saved.life_xp).toBe(0);
});
