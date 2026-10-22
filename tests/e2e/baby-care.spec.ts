import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { defaultAppearance } from '../../src/features/character-creator/model';

async function seed(page: Page) {
  await page.addInitScript((appearance) => {
    if (!localStorage.getItem('pomins-explore-v1'))
      localStorage.setItem(
        'pomins-explore-v1',
        JSON.stringify({
          id: '10000000-0000-4000-8000-000000000001',
          name: 'Lumi',
          appearance,
          born_at: '2026-10-21T00:00:00Z',
          life_xp: 0,
          birth_read: true,
          first_memory: 'sky',
        }),
      );
  }, defaultAppearance);
}
test('six free care reactions preserve the save and remain accessible on mobile', async ({
  page,
}) => {
  await seed(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Cuidar do meu bebê' }).click();
  const panel = page.locator('.baby-care');
  await expect(panel.getByRole('meter', { name: 'Fome', exact: true })).toHaveAttribute(
    'value',
    '25',
  );
  const before = await page.evaluate(() => localStorage.getItem('pomins-room-local-v1'));
  for (const [label, id] of [
    ['Alimentar', 'baby_feed'],
    ['Dar banho', 'baby_bath'],
    ['Trocar fralda', 'baby_diaper'],
    ['Brincar', 'baby_play'],
    ['Dar carinho', 'baby_cuddle'],
    ['Colocar para dormir', 'baby_sleep'],
  ]) {
    await panel.getByRole('button', { name: label, exact: true }).click();
    await expect(panel.locator('.baby-care-stage')).toHaveAttribute('data-care-reaction', id);
  }
  expect(await page.evaluate(() => localStorage.getItem('pomins-room-local-v1'))).toBe(before);
  await expect(panel.getByRole('button', { name: 'Registrar cuidado com minutos' })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const audit = await new AxeBuilder({ page })
    .include('.baby-care')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.screenshot({
    path: `test-results/baby-care-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test('existing focus credits feed care, restore after reload and deduplicate a lost acknowledgement', async ({
  page,
}) => {
  await seed(page);
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Encontrar meu foco' }).click();
  await page.bringToFront();
  await page.getByRole('button', { name: 'Começar meu foco', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await page.clock.runFor(125000);
  await expect(page.getByText('Você reservou um tempo para começar.')).toBeVisible();
  await page
    .locator('.completion')
    .getByRole('button', { name: 'Voltar ao meu universo', exact: true })
    .click();
  await page.getByRole('button', { name: 'Cuidar do meu bebê' }).click();
  await expect(page.getByText('2 min disponíveis', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Dar carinho', exact: true }).click();
  await page.getByRole('button', { name: 'Registrar cuidado com minutos' }).click();
  await expect(page.getByText(/Dar carinho: 1 min registrados/)).toBeVisible();
  await expect(page.getByRole('meter', { name: 'Afeto', exact: true })).toHaveAttribute(
    'value',
    '87',
  );
  const saved = await page.evaluate(() => localStorage.getItem('pomins-room-local-v1'));
  await page.reload();
  await page.getByRole('button', { name: 'Cuidar do meu bebê' }).click();
  await expect(page.getByRole('meter', { name: 'Afeto', exact: true })).toHaveAttribute(
    'value',
    '87',
  );
  await page.getByText('Cuidados guardados · 1 min', { exact: true }).click();
  await expect(page.locator('.baby-care-history li')).toHaveCount(1);
  expect(await page.evaluate(() => localStorage.getItem('pomins-room-local-v1'))).toBe(saved);
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('pomins-room-local-v1')!);
    const payload = JSON.parse(Object.values(save.requests)[0] as string).babyCare;
    sessionStorage.setItem(
      `pomins-baby-care-pending-${payload.characterId}`,
      JSON.stringify(payload),
    );
  });
  await page.reload();
  await page.getByRole('button', { name: 'Cuidar do meu bebê' }).click();
  await page.getByRole('button', { name: 'Conferir cuidado pendente' }).click();
  await expect(page.getByRole('button', { name: 'Conferir cuidado pendente' })).toHaveCount(0);
  await page.getByText('Cuidados guardados · 1 min', { exact: true }).click();
  await expect(page.locator('.baby-care-history li')).toHaveCount(1);
  await expect(page.getByText('1 min disponíveis', { exact: true })).toBeVisible();
  await page.clock.fastForward(86400000);
  await expect(page.getByRole('meter', { name: 'Afeto', exact: true })).toHaveAttribute(
    'value',
    '87',
  );
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('pomins-explore-v1')!));
  expect(state.life_xp).toBe(0);
});
test('care endpoint rejects foreign origins and unauthenticated access', async ({
  request,
  baseURL,
}) => {
  const cross = await request.post('/api/baby', {
    headers: { origin: 'https://other.invalid' },
    data: {},
  });
  expect(cross.status()).toBe(403);
  expect([401, 503]).toContain(
    (await request.get('/api/baby?characterId=10000000-0000-4000-8000-000000000001')).status(),
  );
  expect([401, 503]).toContain(
    (await request.post('/api/baby', { headers: { origin: baseURL! }, data: {} })).status(),
  );
});
