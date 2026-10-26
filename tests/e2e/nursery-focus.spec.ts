import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const fixture = process.env.POMINS_SAVE_FIXTURE_ORIGIN;
test.skip(!fixture, 'Disposable fixture only; never starts real focus.');
test('nursery stays cozy, centered and accessible from 320px to desktop', async ({
  page,
  context,
  request,
}, info) => {
  const data = await (
    await request.get(fixture + '/__test/immersive?project=nursery-' + info.project.name)
  ).json();
  await context.addCookies([
    {
      name: 'sb-127-auth-token',
      value: 'base64-' + Buffer.from(JSON.stringify(data.session)).toString('base64url'),
      domain: 'localhost',
      path: '/',
    },
  ]);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/game/' + data.babySave);
  for (const width of [320, 390, 430, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.getByRole('timer', { name: 'Tempo restante' })).toHaveText('02:00');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const world = await page.locator('.game-screen-world').boundingBox(),
      baby = await page.locator('.baby-care-portrait').boundingBox(),
      dial = await page.locator('.dial-face').boundingBox();
    expect(Math.abs(baby!.x + baby!.width / 2 - (world!.x + world!.width / 2))).toBeLessThan(2);
    expect(Math.abs(dial!.x + dial!.width / 2 - (world!.x + world!.width / 2))).toBeLessThan(2);
    expect(baby!.width).toBeGreaterThanOrEqual(170);
    await expect(page.locator('.care-icon')).toHaveCount(6);
    await expect(
      page.getByRole('button', { name: 'Alimentar · 2 min', exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: info.outputPath('nursery-' + width + '.png'), fullPage: true });
  }
  await page.getByRole('button', { name: 'Cuidados', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Alimentar · 2 min', exact: true }),
  ).toBeInViewport();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
});
test('internal routes preserve canonical focus time and keep Ending stable through heartbeats', async ({
  page,
  context,
  request,
}, info) => {
  const data = await (
    await request.get(fixture + '/__test/immersive?project=nursery-' + info.project.name)
  ).json();
  await context.addCookies([
    {
      name: 'sb-127-auth-token',
      value: 'base64-' + Buffer.from(JSON.stringify(data.session)).toString('base64url'),
      domain: 'localhost',
      path: '/',
    },
  ]);
  const calls: string[] = [];
  let current: Record<string, unknown> = {};
  await page.route('**/api/game', async (route) => {
    const body = route.request().postDataJSON();
    if (body.kind !== 'focus') return route.continue();
    calls.push(body.action);
    current =
      body.action === 'start'
        ? {
            id: body.id,
            character_id: data.baby,
            origin_save_id: data.babySave,
            status: 'active',
            planned_seconds: body.minutes * 60,
            validated_ms: 0,
            sequence: 0,
            client_id: body.clientId,
            task: '',
            first_step: '',
            reward_xp: 0,
            created_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
          }
        : {
            ...current,
            sequence: Number(current.sequence) + 1,
            validated_ms: Number(current.validated_ms) + (body.action === 'heartbeat' ? 5000 : 0),
            status:
              body.action === 'heartbeat' || body.action === 'resume'
                ? 'active'
                : body.action === 'cancel'
                  ? 'cancelled'
                  : body.action === 'recover'
                    ? 'interrupted'
                    : 'paused',
          };
    await route.fulfill({ json: { data: current } });
  });
  await page.clock.install();
  await page.goto('/game/' + data.babySave);
  const before = await (await page.request.get('/api/game-saves/' + data.babySave)).json();
  await page.getByText('Duração e intenção do foco', { exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Ou escolha seu tempo (2 a 120 min)' }).fill('10');
  await page.getByText('Duração e intenção do foco', { exact: true }).click();
  await page.getByRole('button', { name: 'Iniciar foco', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Encerrar', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Encerrar', exact: true }).evaluate((el) => {
    const w = window as typeof window & { endingElement?: Element; endingChanges?: number };
    w.endingElement = el;
    w.endingChanges = 0;
    new MutationObserver((records) => {
      w.endingChanges! += records.filter((r) => r.attributeName === 'disabled').length;
    }).observe(el, { attributes: true });
  });
  await page.clock.runFor(16000);
  const timer = page.getByRole('timer', { name: 'Tempo restante' });
  const previous = (await timer.textContent())!;
  const seconds = (s: string) => s.split(':').reduce((a, n) => a * 60 + Number(n), 0);
  expect(seconds(previous)).toBeLessThanOrEqual(600);
  expect(seconds(previous)).toBeGreaterThanOrEqual(600 - Number(current.validated_ms) / 1000);
  expect(
    await page.getByRole('button', { name: 'Encerrar', exact: true }).evaluate((el) => {
      const w = window as typeof window & { endingElement?: Element; endingChanges?: number };
      return el === w.endingElement && w.endingChanges === 0;
    }),
  ).toBe(true);
  await page.locator('.game-screen-menu summary').click();
  await page.getByRole('link', { name: 'Menu principal', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/);
  await page.clock.runFor(6000);
  expect(calls.filter((c) => c === 'heartbeat').length).toBeGreaterThan(3);
  await page.getByRole('link', { name: 'Começar', exact: true }).click();
  await page.locator('a[href="/game/' + data.babySave + '"]').click();
  await expect(page.getByRole('button', { name: 'Pausar pelo seletor' })).toBeVisible();
  expect(seconds((await timer.textContent())!)).toBeLessThanOrEqual(seconds(previous));
  expect(calls.filter((c) => c === 'start')).toHaveLength(1);
  expect(calls.filter((c) => c === 'recover' || c === 'pause')).toHaveLength(0);
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retomar foco', exact: true })).toBeVisible();
  const paused = await timer.textContent();
  await page.clock.runFor(30000);
  expect(await timer.textContent()).toBe(paused);
  const after = await (await page.request.get('/api/game-saves/' + data.babySave)).json();
  expect(after.data.sessions).toEqual(before.data.sessions);
  expect(after.data.room.credits).toEqual(before.data.room.credits);
  expect(calls).not.toContain('complete');
});
