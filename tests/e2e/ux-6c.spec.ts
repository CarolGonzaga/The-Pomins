import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openGamePanel } from '../support/ui';

const fixture = process.env.POMINS_SAVE_FIXTURE_ORIGIN;
test.skip(!fixture, 'Only disposable local SQL and simulated Auth.');

for (const width of [320, 375, 390, 430, 1280]) {
  test(`creation, introduction, care and history use one document scroll at ${width}px`, async ({
    page,
    context,
    request,
  }, info) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const focusCalls: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/game') {
        const command = request.postDataJSON();
        if (command.kind === 'focus') focusCalls.push(command.action);
      }
    });
    const account = await (
      await request.get(fixture + '/__test/immersive?project=' + info.project.name)
    ).json();
    await context.addCookies([
      {
        name: 'sb-127-auth-token',
        value: 'base64-' + Buffer.from(JSON.stringify(account.session)).toString('base64url'),
        domain: 'localhost',
        path: '/',
      },
    ]);
    await page.goto('/menu');
    await page.getByRole('link', { name: 'Começar', exact: true }).click();
    await page.getByRole('link', { name: 'Nova partida', exact: true }).click();
    await page
      .getByRole('textbox', { name: 'Nome da partida' })
      .fill(`UX ${width} ${info.project.name}`);
    await page.getByRole('button', { name: 'Criar partida', exact: true }).click();
    const creator = page.locator('.creator-page');
    await expect(creator).toBeVisible();
    await expect(creator.locator('.orbit')).toHaveCount(0);
    for (const tab of ['Origem', 'Rosto', 'Estilo']) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(
        await creator.locator('.options-panel').evaluate((el) => getComputedStyle(el).overflowY),
      ).toBe('visible');
    }
    await page.getByRole('textbox', { name: 'Nome do seu Pomin', exact: true }).fill('Auróra');
    await creator.screenshot({ path: info.outputPath(`creator-${width}.png`) });
    await page.getByRole('button', { name: 'Dar boas-vindas ao mundo', exact: true }).click();
    await expect(page.getByRole('heading', { name: /O mundo ganhou/ })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByRole('button', { name: /A luz dançando/ }).click();
    await page.getByRole('button', { name: 'Guardar essa primeira memória', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Cuidados', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar foco', exact: true })).toBeVisible();
    await expect(page.getByRole('meter', { name: 'Saciedade', exact: true })).toHaveAttribute(
      'value',
      '75',
    );
    await expect(page.getByText('menos é melhor')).toHaveCount(0);
    await openGamePanel(page, 'História');
    await expect(
      page.getByRole('heading', { name: 'A primeira memória', exact: true }),
    ).toBeVisible();
    await page.getByText('Reler capítulo inicial', { exact: true }).click();
    await expect(page.getByRole('heading', { name: /O mundo ganhou/ })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Guardar essa primeira memória', exact: true }),
    ).toHaveCount(0);
    await openGamePanel(page, 'Cuidados');
    await openGamePanel(page, 'Progresso');
    await expect(page.getByText('Mais opções', { exact: true })).toBeFocused();
    await expect(page.getByText('XP de vida: 0', { exact: true })).toBeVisible();
    await openGamePanel(page, 'Cuidados');
    const fonts = await page.locator('.game-screen-header h1').evaluate(async (el) => {
      const family = getComputedStyle(el).fontFamily;
      const game = getComputedStyle(el).getPropertyValue('--font-game').trim();
      const faces = await document.fonts.load(
        '400 24px ' + game.split(',')[0],
        'Ação, bebê, coração',
      );
      return {
        family,
        game,
        loaded: faces.length > 0 && faces.every((face) => face.status === 'loaded'),
      };
    });
    expect(fonts.family).toContain(fonts.game.split(',')[0].replaceAll('"', ''));
    expect(fonts.loaded).toBe(true);
    expect(
      await page
        .locator('.game-screen-panel:visible')
        .evaluate((el) => getComputedStyle(el).overflowY),
    ).toBe('visible');
    expect(
      await page
        .locator('.game-screen')
        .evaluate(
          (el) =>
            el.getBoundingClientRect().bottom >=
            el.querySelector('.game-screen-panel:not([hidden])')!.getBoundingClientRect().bottom,
        ),
    ).toBe(true);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const needs = await page.getByRole('meter', { name: 'Diversão', exact: true }).boundingBox();
    const navigation = await page.locator('.game-screen-tabs').boundingBox();
    expect(needs!.y + needs!.height).toBeLessThanOrEqual(navigation!.y);
    expect(focusCalls).toEqual([]);
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
    ).toEqual([]);
    await page.screenshot({ path: info.outputPath(`care-${width}.png`), fullPage: true });
    await page.reload();
    await expect(page.getByRole('region', { name: 'Cuidados', exact: true })).toBeVisible();
  });
}

test('skipping introduction opens care without inventing a first memory', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Criar meu primeiro Pomin', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nome do seu Pomin' }).fill('Lumi');
  await page.getByRole('button', { name: 'Dar boas-vindas ao mundo', exact: true }).click();
  await page.getByRole('button', { name: 'Pular introdução', exact: true }).click();
  await expect(page.getByRole('meter', { name: 'Saciedade', exact: true })).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('pomins-explore-v1')!));
  expect(stored.birth_read).toBe(false);
  expect(stored.first_memory).toBeNull();
  const stories = page.getByRole('button', { name: /^Histórias/ });
  if (!(await stories.isVisible()))
    await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  await stories.click();
  await expect(page.getByRole('heading', { name: /O mundo ganhou/ })).toBeVisible();
});
