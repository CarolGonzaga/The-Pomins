import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { roomMap } from '../../src/features/room/map';
import { walkable } from '../../src/features/room/navigation';
async function create(page: Page) {
  await page.goto('/play');
  await page.getByRole('textbox', { name: 'Nome do Pomin', exact: true }).fill('Lumi');
  await page.getByRole('button', { name: 'Entrar no meu quarto' }).click();
  await expect(page.getByTestId('room-canvas').locator('canvas')).toBeVisible();
}
test('LPC appearance changes real pixels; adult walks around obstacles and restores activity', async ({
  page,
}) => {
  const errors: string[] = [];
  const assetFailures: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.url().includes('/assets/lpc/') && !response.ok())
      assetFailures.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  page.on('requestfailed', (request) => {
    if (request.url().includes('/assets/lpc/'))
      assetFailures.push(`${request.failure()?.errorText} ${new URL(request.url()).pathname}`);
  });
  // Check every vendored sheet over HTTP, including layers not selected in this journey.
  const manifestResponse = await page.request.get('/assets/lpc/manifest.json');
  expect(manifestResponse.ok()).toBe(true);
  const manifest = (await manifestResponse.json()) as { files: { path: string }[] };
  for (const file of manifest.files) {
    const response = await page.request.get(`/assets/lpc/${file.path}`);
    expect(response.ok(), file.path).toBe(true);
    expect(response.headers()['content-type']).toContain('image/png');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/play');
  await page.getByRole('textbox', { name: 'Nome do Pomin', exact: true }).fill('Lumi');
  await page.waitForFunction(() => {
    const c = document.querySelector<HTMLCanvasElement>('.lpc-preview');
    return (
      c &&
      c
        .getContext('2d')!
        .getImageData(0, 0, 64, 64)
        .data.some((v) => v !== 0)
    );
  });
  const original = await page
    .locator('.lpc-preview')
    .evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  await page.getByRole('button', { name: 'Afro', exact: true }).click();
  await page.getByRole('combobox', { name: 'Roupa', exact: true }).selectOption('shortsleeve');
  await page.getByRole('button', { name: 'Cor dos olhos #7897b3', exact: true }).click();
  await expect
    .poll(() =>
      page.locator('.lpc-preview').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL()),
    )
    .not.toBe(original);
  await page.getByRole('button', { name: 'Entrar no meu quarto' }).click();
  const scene = page.getByTestId('room-canvas');
  await expect(scene.locator('canvas')).toBeVisible();
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="room-canvas"]')!;
    const points: { x: number; y: number }[] = [];
    (window as unknown as { roomPoints: typeof points }).roomPoints = points;
    new MutationObserver(() =>
      points.push({
        x: Math.round(Number(el.getAttribute('data-x'))),
        y: Math.round(Number(el.getAttribute('data-y'))),
      }),
    ).observe(el, { attributes: true, attributeFilter: ['data-x', 'data-y'] });
  });
  await page.getByRole('button', { name: /^Estudar/ }).click();
  await expect(scene).toHaveAttribute('data-state', 'walking');
  await page.getByRole('button', { name: /^Ler/ }).click();
  await expect(scene).toHaveAttribute('data-state', 'reading', { timeout: 15000 });
  await expect(scene).toHaveAttribute('data-x', '11.00');
  await expect(scene).toHaveAttribute('data-y', '4.00');
  await page.getByRole('button', { name: /^Estudar/ }).click();
  await expect(scene).toHaveAttribute('data-state', 'studying', { timeout: 15000 });
  await page.getByRole('button', { name: /^Dormir/ }).click();
  await expect(scene).toHaveAttribute('data-state', 'sleeping', { timeout: 15000 });
  const points = await page.evaluate(
    () => (window as unknown as { roomPoints: { x: number; y: number }[] }).roomPoints,
  );
  expect(points.length).toBeGreaterThan(5);
  expect(points.every((p) => walkable(roomMap.grid, p))).toBe(true);
  await page.screenshot({
    path: `test-results/room-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem('pomins-room-local-v1')!).state.residents[0],
  );
  await page.reload();
  await expect(page.getByTestId('room-canvas')).toHaveAttribute('data-state', 'sleeping', {
    timeout: 15000,
  });
  const after = await page.evaluate(
    () => JSON.parse(localStorage.getItem('pomins-room-local-v1')!).state.residents[0],
  );
  expect(after.appearance).toEqual(before.appearance);
  expect(after.progress_minutes).toBe(0);
  expect(errors).toEqual([]);
  expect(assetFailures).toEqual([]);
});
test('reuses the strict timer, distributes a complete local session and persists effects', async ({
  page,
}) => {
  await page.clock.install();
  await create(page);
  await page.getByRole('button', { name: 'Iniciar foco', exact: true }).click();
  // Starting just before the mount-time timer tick must still get a full interval.
  await page.clock.runFor(4500);
  await page.getByRole('button', { name: 'Iniciar foco', exact: true }).click();
  await page.clock.runFor(5000);
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await expect(page.getByText(/Confirmado: 00:05/)).toBeVisible();
  await page.clock.runFor(120000);
  await expect(page.getByText('2 min locais para distribuir', { exact: true })).toBeVisible();
  await page
    .locator('.completion')
    .getByRole('button', { name: 'Voltar ao quarto', exact: true })
    .click();
  await expect(page.locator('.time-bank>div').nth(1).locator('strong')).toHaveText('2 min');
  await page.getByRole('button', { name: 'Distribuir minutos', exact: true }).click();
  await page.locator('.allocation-line').getByRole('spinbutton', { name: 'Minutos' }).fill('3');
  await page.getByRole('button', { name: 'Confirmar distribuição', exact: true }).click();
  await expect(
    page.getByText(
      'A distribuição ultrapassa os minutos disponíveis. Ajuste os valores e tente novamente.',
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Uma distribuição aguarda confirmação.' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Distribuir minutos', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar outra distribuição' }).click();
  await page
    .locator('.allocation-line')
    .nth(1)
    .getByRole('combobox', { name: 'Atividade', exact: true })
    .selectOption('read');
  await page.getByRole('button', { name: 'Confirmar distribuição', exact: true }).click();
  await expect(
    page.getByText('Minutos distribuídos. O progresso foi guardado junto com a distribuição.'),
  ).toBeVisible();
  await expect(page.locator('.time-bank>div').nth(1).locator('strong')).toHaveText('0 min');
  await expect(page.locator('.time-bank>div').nth(2).locator('strong')).toHaveText('2 min');
  await page.reload();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('pomins-room-local-v1')!).state,
  );
  expect(saved.residents[0].skills).toMatchObject({ knowledge: 3, creativity: 1, autonomy: 1 });
  expect(saved.residents[0].progress_minutes).toBe(2);
  expect(saved.allocations).toHaveLength(2);
  expect(saved.credits[0].allocated_minutes).toBe(2);
  // Restore a lost acknowledgement, retaining the exact persisted intent and UUID.
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('pomins-room-local-v1')!);
    const payload = JSON.parse(Object.values(save.requests)[0] as string);
    sessionStorage.setItem(
      'pomins-pending-allocation-local-household',
      JSON.stringify({ action: 'allocate', payload }),
    );
  });
  await page.reload();
  await page.getByRole('button', { name: 'Conferir distribuição pendente' }).click();
  const retried = await page.evaluate(
    () => JSON.parse(localStorage.getItem('pomins-room-local-v1')!).state,
  );
  expect(retried.residents[0].progress_minutes).toBe(2);
  expect(retried.allocations).toHaveLength(2);
});
test('room stays usable at 320px and meets automated accessibility checks', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 740 });
  await create(page);
  await expect(page.getByRole('heading', { name: 'Um quarto, um mundo.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
});
