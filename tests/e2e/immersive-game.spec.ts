import { openGamePanel, openFocus } from '../support/ui';
import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const fixture = process.env.POMINS_SAVE_FIXTURE_ORIGIN;
test.skip(!fixture, 'Disposable SQL and simulated Auth only; never accesses real accounts.');
async function login(context: BrowserContext, session: unknown) {
  await context.addCookies([
    {
      name: 'sb-127-auth-token',
      value: 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url'),
      domain: 'localhost',
      path: '/',
    },
  ]);
}
async function layout(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const world = await page.locator('.game-screen-world').boundingBox();
  expect(world!.height).toBeGreaterThanOrEqual(210);
  expect(
    await page.locator('.game-screen-tabs').evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  for (const tab of await page.locator('.game-screen-tabs button').filter({ visible: true }).all())
    expect(await tab.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  const padding = await page.getByTestId('immersive-game').evaluate((el) => ({
    left: parseFloat(getComputedStyle(el).paddingLeft),
    right: parseFloat(getComputedStyle(el).paddingRight),
    bottom: parseFloat(getComputedStyle(el).paddingBottom),
  }));
  expect(padding.left).toBeGreaterThanOrEqual(10);
  expect(padding.right).toBeGreaterThanOrEqual(10);
  expect(padding.bottom).toBeGreaterThanOrEqual(12);
  expect(await page.locator('meta[name=viewport]').getAttribute('content')).toContain(
    'viewport-fit=cover',
  );
  for (const button of await page.locator('.game-screen-tabs button').filter({ visible: true }).all())
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
}

test('keeps a recovered pause through panels and clears only acknowledged terminal UI state', async ({
  page,
  context,
  request,
}) => {
  const info = await (await request.get(fixture + '/__test/info')).json();
  await login(context, info.session);
  await page.goto('/game/' + info.one);
  const before = await (await page.request.get('/api/game-saves/' + info.one)).json();
  let current = before.data.sessions.find((s: { id: string }) => s.id === info.paused);
  const calls: string[] = [];
  await page.route('**/api/game', async (route) => {
    const input = route.request().postDataJSON();
    if (input.kind !== 'focus') return route.continue();
    calls.push(input.action);
    current = {
      ...current,
      client_id: input.clientId,
      status: input.action === 'cancel' ? 'cancelled' : 'paused',
      sequence: input.sequence,
    };
    await route.fulfill({ json: { data: current } });
  });
  await openFocus(page);
  await expect(page.getByRole('button', { name: 'Retomar foco', exact: true })).toBeVisible();
  for (const name of ['Progresso', 'Moradores', 'Atividades'])
    await openGamePanel(page, name);
  expect(calls).toEqual(['recover']);
  await page.getByRole('button', { name: 'Encerrar sessão', exact: true }).click();
  await page.getByRole('button', { name: 'Preparar novo foco', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Abrir foco', exact: true })).toBeVisible();
  await openFocus(page);
  await expect(
    page.locator('.compact-focus').getByRole('button', { name: 'Iniciar foco', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retomar foco', exact: true })).toHaveCount(0);
  expect(calls).toEqual(['recover', 'recover', 'cancel']);
  // The lifecycle above is simulated; persisted SQL focus must stay untouched.
  const after = await (await page.request.get('/api/game-saves/' + info.one)).json();
  expect(after.data.sessions).toEqual(before.data.sessions);
  expect(after.data.room.credits).toEqual(before.data.room.credits);
});

test('keeps one Phaser canvas across panels, movement, appearance and viewport changes', async ({
  page,
  context,
  request,
}, testInfo) => {
  const info = await (
    await request.get(fixture + '/__test/immersive?project=' + testInfo.project.name)
  ).json();
  await login(context, info.session);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/game/' + info.adultSave);
  const canvas = page.getByTestId('room-canvas').locator('canvas');
  await expect(canvas).toBeVisible();
  await canvas.evaluate((el) => el.setAttribute('data-instance', 'original'));
  for (const size of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(size);
    await layout(page);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const name of ['Progresso', 'Aparência', 'Moradores', 'Atividades']) {
    await openGamePanel(page, name);
    await expect(canvas).toHaveAttribute('data-instance', 'original');
  }
  await page.getByRole('button', { name: 'Ler', exact: true }).click();
  await expect(page.getByTestId('room-canvas')).toHaveAttribute('data-state', 'reading', {
    timeout: 15000,
  });
  await openGamePanel(page, 'Aparência');
  await page
    .getByRole('button', { name: /^Cor do cabelo #/ })
    .nth(1)
    .click();
  await page.getByRole('button', { name: 'Salvar aparência', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-instance', 'original');
  await page.getByRole('button', { name: 'Atividades', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('adult-vertical.png'), fullPage: true });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  await page.reload();
  await expect(canvas).toBeVisible();
  await expect(page.getByTestId('room-canvas')).toHaveAttribute('data-state', 'reading');
  expect(errors).toEqual([]);
});

test('reuses baby reactions, saved care, balance and restoration without adult sprites', async ({
  page,
  context,
  request,
}, testInfo) => {
  const info = await (
    await request.get(fixture + '/__test/immersive?project=' + testInfo.project.name)
  ).json();
  await login(context, info.session);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/game/' + info.babySave);
  await expect(page.getByRole('heading', { name: 'Lumi', exact: true })).toBeVisible();
  await expect(page.getByTestId('room-canvas')).toHaveCount(0);
  await expect(page.getByRole('meter', { name: 'Saciedade', exact: true })).toBeVisible();
  await layout(page);
  const before = await (await page.request.get('/api/game-saves/' + info.babySave)).json();
  const need = await page.getByRole('meter', { name: 'Saciedade', exact: true }).getAttribute('value');
  await page.getByRole('button', { name: 'Dar carinho', exact: true }).click();
  await expect(page.locator('.baby-care-stage')).toHaveAttribute(
    'data-care-reaction',
    'baby_cuddle',
  );
  expect(await page.getByRole('meter', { name: 'Saciedade', exact: true }).getAttribute('value')).toBe(
    need,
  );
  await page.getByRole('button', { name: 'Registrar cuidado com minutos', exact: true }).click();
  await expect(page.getByText('1 min disponíveis', { exact: true })).toBeVisible();
  await openGamePanel(page, 'Progresso');
  await expect(page.getByText(/1\/30 min de cuidados/)).toBeVisible();
  await page.getByRole('button', { name: 'Cuidados', exact: true }).click();
  await page
    .getByRole('region', { name: 'Cuidados', exact: true })
    .evaluate((el) => el.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('baby-vertical.png'), fullPage: true });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  await page.reload();
  await expect(page.getByText('1 min disponíveis', { exact: true })).toBeVisible();
  expect(
    await page.locator('.baby-care-portrait').evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
  await context.clearCookies();
  await page.goto('/game/' + info.babySave);
  await expect(page).toHaveURL(/\/auth/);
  await login(context, info.session);
  await page.goto('/game/' + info.babySave);
  await openGamePanel(page, 'Progresso');
  await expect(page.getByText(/1\/30 min de cuidados/)).toBeVisible();
  const after = await (await page.request.get('/api/game-saves/' + info.babySave)).json();
  expect(after.data.sessions).toEqual(before.data.sessions);
  expect(after.data.room.credits[0].allocated_minutes).toBe(
    before.data.room.credits[0].allocated_minutes + 1,
  );
  await page.goto('/game/' + info.adultSave);
  await expect(
    page.getByRole('region', { name: 'Seu foco e saldo' }).getByText('1 min disponíveis · saldo da conta', { exact: true }),
  ).toBeVisible();
});

test('retains the same mounted focus across local panels and guards navigation during active focus', async ({
  page,
  context,
  request,
}, testInfo) => {
  const info = await (
    await request.get(fixture + '/__test/immersive?project=' + testInfo.project.name)
  ).json();
  await login(context, info.session);
  // Focus responses below are explicitly simulated. SQL economy is covered separately.
  const calls: string[] = [];
  let current: Record<string, unknown> | null = null;
  await page.route('**/api/game', async (route) => {
    const body = route.request().postDataJSON();
    if (body.kind !== 'focus') return route.continue();
    calls.push(body.action);
    if (body.action === 'start')
      current = {
        id: body.id,
        character_id: info.adult,
        status: 'active',
        planned_seconds: 120,
        validated_ms: 0,
        sequence: 0,
        client_id: body.clientId,
        task: '',
        first_step: '',
        reward_xp: 0,
        last_seen_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
    else
      current = {
        ...current,
        status:
          body.action === 'pause' ? 'paused' : body.action === 'cancel' ? 'cancelled' : 'active',
        sequence: body.sequence,
        validated_ms: body.action === 'heartbeat' ? 5000 : current?.validated_ms,
      };
    await route.fulfill({ json: { data: current } });
  });
  await page.clock.install();
  await page.goto('/game/' + info.adultSave);
  const canvas = page.getByTestId('room-canvas').locator('canvas');
  await expect(canvas).toBeVisible();
  await canvas.evaluate((el) => el.setAttribute('data-instance', 'focus-world'));
  await openFocus(page);
  await page.getByRole('button', { name: 'Iniciar foco', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  const timer = page.getByRole('timer', { name: 'Tempo restante' });
  await timer.evaluate((el) => el.setAttribute('data-instance', 'same-timer'));
  await page.clock.runFor(1000);
  for (const name of ['Progresso', 'Aparência', 'Moradores', 'Atividades']) {
    await openGamePanel(page, name);
    await expect(timer).toHaveAttribute('data-instance', 'same-timer');
    await expect(canvas).toHaveAttribute('data-instance', 'focus-world');
  }
  await page.locator('.game-screen-menu summary').click();
  await page.getByRole('link', { name: 'Menu principal', exact: true }).click();
  await expect(page).toHaveURL(new RegExp('/game/' + info.adultSave + '$'));
  await page.locator('.game-screen-menu summary').press('Escape');
  await expect(page.locator('.game-screen-menu')).not.toHaveAttribute('open');
  expect(calls).toEqual(['start']);
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retomar foco', exact: true })).toBeVisible();
  await openGamePanel(page, 'Progresso');
  await expect(timer).toHaveAttribute('data-instance', 'same-timer');
  await page.getByRole('button', { name: 'Retomar foco', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Encerrar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Preparar novo foco', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Preparar novo foco', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-instance', 'focus-world');
  expect(calls).toEqual(['start', 'pause', 'recover', 'resume', 'recover', 'cancel']);
});
