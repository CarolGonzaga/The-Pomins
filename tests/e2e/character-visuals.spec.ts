import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('extended appearance changes pixels in every pose/direction and survives save/reload', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/play');
  await page.getByRole('textbox', { name: 'Nome do Pomin', exact: true }).fill('Nara');
  const preview = page.locator('.adult-editor .lpc-preview');
  await page.getByRole('button', { name: 'Longo', exact: true }).click();
  await page.getByRole('button', { name: 'Ondulado', exact: true }).click();
  await page.getByRole('button', { name: 'Rabo de cavalo', exact: true }).click();
  await expect(preview).toHaveAttribute('data-ready-key', /"hair":"ponytail"/);
  await page.getByRole('combobox', { name: 'Roupa', exact: true }).selectOption('sleeveless');
  await page.getByLabel('Cor da calça personalizado', { exact: true }).fill('#746b8b');
  await page.getByLabel('Cor do cabelo personalizado', { exact: true }).fill('#23ab79');
  await expect(preview).toHaveAttribute('data-ready-key', /"hairColor":"#23ab79"/);
  const snapshots: string[] = [];
  for (const hairColor of ['#23ab79', '#b74b8e']) {
    await page.getByLabel('Cor do cabelo personalizado', { exact: true }).fill(hairColor);
    await expect(preview).toHaveAttribute('data-ready-key', new RegExp(hairColor));
    let index = 0;
    for (const [pose, clip, row] of [
      ['Em pé', 'idle', 4],
      ['Caminhar', 'walk', 0],
      ['Sentar', 'sit', 8],
    ] as const) {
      await page.getByRole('button', { name: pose, exact: true }).click();
      for (const direction of [0, 1, 2, 3]) {
        await page
          .getByRole('combobox', { name: 'Direção da prévia', exact: true })
          .selectOption(String(direction));
        await expect(preview).toHaveAttribute('data-clip', clip);
        await expect(preview).toHaveAttribute('data-frame', String((row + direction) * 9));
        const data = await preview.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
        if (hairColor === '#23ab79') snapshots.push(data);
        else
          expect(
            data === snapshots[index],
            `${pose}/${direction} must recolor the selected hair`,
          ).toBe(false);
        index++;
      }
    }
  }
  await page.getByRole('button', { name: 'Entrar no meu quarto', exact: true }).click();
  await expect(page.getByTestId('room-canvas').locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: /^Estudar/ }).click();
  await expect(page.getByTestId('room-canvas')).toHaveAttribute('data-state', 'studying', {
    timeout: 15000,
  });
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('pomins-room-local-v1')!).state.residents[0].appearance,
  );
  await page.reload();
  await expect(page.getByTestId('room-canvas').locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Editar aparência', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Rabo de cavalo', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('combobox', { name: 'Roupa', exact: true })).toHaveValue(
    'sleeveless',
  );
  await expect(page.getByLabel('Cor da calça personalizado', { exact: true })).toHaveValue(
    '#746b8b',
  );
  await expect(preview).toHaveAttribute('data-ready-key', /#b74b8e/);
  const restored = await page.evaluate(
    () => JSON.parse(localStorage.getItem('pomins-room-local-v1')!).state.residents[0].appearance,
  );
  expect(restored).toEqual(saved);
  if (test.info().project.name === 'iphone')
    await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({
    path: `test-results/visual-editor-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test('walking preview advances frames without changing its composition', async ({ page }) => {
  await page.clock.install();
  await page.goto('/play');
  const preview = page.locator('.adult-editor .lpc-preview');
  await page.getByRole('button', { name: 'Ondulado', exact: true }).click();
  await page.getByRole('button', { name: 'Caminhar', exact: true }).click();
  await expect(preview).toHaveAttribute('data-ready-key', /"hair":"wavy"/);
  const key = await preview.getAttribute('data-ready-key');
  const frame = await preview.getAttribute('data-frame');
  await page.clock.runFor(350);
  expect(await preview.getAttribute('data-frame')).not.toBe(frame);
  expect(await preview.getAttribute('data-ready-key')).toBe(key);
});
