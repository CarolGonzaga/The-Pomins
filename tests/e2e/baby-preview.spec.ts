import { test, expect } from '@playwright/test';

for (const size of [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 1280, height: 900 },
]) {
  test(`baby preview stays centered across appearances at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/');
    await page.getByRole('button', { name: 'Criar meu primeiro Pomin', exact: true }).click();
    const card = page.locator('.creator-grid .character-preview');
    const preview = card.getByRole('img', { name: 'Prévia de seu bebê', exact: true });
    await expect(preview).toBeVisible();

    async function aligned() {
      const geometry = await card.evaluate((element) => {
        const svg = element.querySelector('svg')!;
        const rect = svg.getBoundingClientRect();
        const cardRect = element.getBoundingClientRect();
        const plaque = element.querySelector('.preview-plaque')!.getBoundingClientRect();
        const bounds = svg.getBBox();
        const matrix = svg.getScreenCTM()!;
        const corners = [
          new DOMPoint(bounds.x, bounds.y).matrixTransform(matrix),
          new DOMPoint(bounds.x + bounds.width, bounds.y + bounds.height).matrixTransform(matrix),
        ];
        return {
          svgCenter: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
          cardCenter: cardRect.x + cardRect.width / 2,
          orbits: Array.from(element.querySelectorAll('.orbit'), (orbit) => {
            const r = orbit.getBoundingClientRect();
            return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
          }),
          // The illustration's original viewBox includes breathing space above the head.
          // Check its painted bounds too, so equal element centers cannot hide clipping.
          contained:
            corners[0].x >= rect.left &&
            corners[0].y >= rect.top &&
            corners[1].x <= rect.right &&
            corners[1].y <= rect.bottom &&
            corners[0].x >= cardRect.left &&
            corners[1].x <= cardRect.right &&
            corners[1].y <= plaque.top,
          visualX: (corners[0].x + corners[1].x) / 2,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      expect(Math.abs(geometry.svgCenter.x - geometry.cardCenter)).toBeLessThan(1);
      for (const orbit of geometry.orbits) {
        expect(Math.abs(geometry.svgCenter.x - orbit.x)).toBeLessThan(1);
        expect(Math.abs(geometry.svgCenter.y - orbit.y)).toBeLessThan(1);
      }
      expect(Math.abs(geometry.visualX - geometry.cardCenter)).toBeLessThan(2);
      expect(geometry.contained).toBe(true);
      expect(geometry.overflow).toBe(false);
    }

    for (const species of ['Humano', 'Alienígena']) {
      await page.getByRole('tab', { name: 'Origem', exact: true }).click();
      await page.getByRole('button', { name: species, exact: true }).click();
      await page.getByRole('tab', { name: 'Rosto', exact: true }).click();
      for (const hair of ['Topete', 'Cachos', 'De lado', 'Sem cabelo']) {
        await page.getByRole('button', { name: hair, exact: true }).click();
        for (const eyes of ['Curioso', 'Sonolento', 'Brilhante']) {
          await page.getByRole('button', { name: eyes, exact: true }).click();
          await aligned();
        }
      }
      if (species === 'Alienígena') {
        await page.getByLabel('Antenas', { exact: true }).uncheck();
        await aligned();
        await page.getByLabel('Antenas', { exact: true }).check();
        await page.getByLabel('Marquinhas no rosto', { exact: true }).check();
      }
      await page.getByRole('tab', { name: 'Estilo', exact: true }).click();
      for (const accessory of ['Só eu', 'Lacinho', 'Estrelinha']) {
        await page.getByRole('button', { name: accessory, exact: true }).click();
        await aligned();
      }
    }
    await card.getByRole('button', { name: 'Me surpreenda', exact: true }).click();
    await aligned();
    await expect(card.getByRole('heading', { name: 'Seu pequeno Pomin', exact: true })).toBeVisible();
    await expect(card.getByText('Alienígena · Recém-nascido', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dar boas-vindas ao mundo', exact: true })).toBeVisible();
    await card.screenshot({ path: test.info().outputPath('baby-preview.png') });
  });
}
