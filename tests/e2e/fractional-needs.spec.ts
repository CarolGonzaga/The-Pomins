import { test, expect } from '@playwright/test';
import { openGamePanel } from '../support/ui';
const fixture = process.env.POMINS_SAVE_FIXTURE_ORIGIN;
test.skip(
  !fixture || process.env.POMINS_TEST_DECIMAL_NEEDS !== '1',
  'Requires a separately activated disposable SQL fixture, never remote accounts.',
);
test('fractional needs cross RPC/API/UI, buy for two minutes, replay and restore after reload', async ({
  page,
  context,
  request,
}, info) => {
  const data = await (
    await request.get(fixture + '/__test/immersive?project=paid-' + info.project.name)
  ).json();
  await context.addCookies([
    {
      name: 'sb-127-auth-token',
      value: 'base64-' + Buffer.from(JSON.stringify(data.session)).toString('base64url'),
      domain: 'localhost',
      path: '/',
    },
  ]);
  await page.goto('/game/' + data.babySave);
  await openGamePanel(page, 'Cuidados');
  const url = '/api/baby?saveId=' + data.babySave + '&characterId=' + data.baby;
  const initial = await (
    await page.request.get(url, { headers: { 'x-pomins-needs-version': '2' } })
  ).json();
  expect(initial.data.needs_clock.active).toBe(true);
  expect(Number.isInteger(initial.data.stats.needs.satiety)).toBe(false);
  expect(initial.data.stats.needs.satiety).toBeCloseTo(72.5, 1);
  await expect(page.getByRole('meter', { name: 'Saciedade', exact: true })).toHaveAttribute(
    'data-band',
    'adequate',
  );
  expect(
    Number(await page.getByRole('meter', { name: 'Saciedade', exact: true }).getAttribute('value')),
  ).toBeCloseTo(initial.data.stats.needs.satiety, 1);
  const requests: { requestId: string }[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/baby')
      requests.push(r.postDataJSON());
  });
  await page.getByRole('button', { name: 'Alimentar · 2 min', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar Alimentar · 2 min', exact: true }).click();
  await expect(page.getByText('0 min disponíveis', { exact: true })).toBeVisible();
  const intent = requests[0];
  expect(intent).toBeTruthy();
  const response = await page.request.post(url, {
    headers: { origin: new URL(page.url()).origin, 'x-pomins-needs-version': '2' },
    data: intent,
  });
  expect(response.status()).toBe(200);
  const replay = await response.json();
  expect(replay.data.receipt.chargedMinutes).toBe(2);
  expect(replay.data.receipt.balanceAfter).toBe(0);
  expect(replay.data.stats.history.filter((item: { id: string }) => item.id).length).toBe(1);
  expect(replay.data.stats.needs.satiety).toBeCloseTo(96.5, 1);
  await page.reload();
  await openGamePanel(page, 'Cuidados');
  expect(
    Number(await page.getByRole('meter', { name: 'Saciedade', exact: true }).getAttribute('value')),
  ).toBeCloseTo(replay.data.stats.needs.satiety, 1);
  await expect(page.locator('.baby-care-portrait > svg')).toHaveAttribute('data-mood', 'happy');
  await page.screenshot({ path: info.outputPath('fractional-needs.png'), fullPage: true });
});
test('incompatible clients cannot spend and update advice never reloads or replaces the timer', async ({
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
  await page.goto('/game/' + data.babySave);
  await openGamePanel(page, 'Cuidados');
  const timer = page.getByRole('timer', { name: 'Tempo restante' });
  await timer.evaluate((el) => el.setAttribute('data-instance', 'same-focus'));
  const before = await (await page.request.get('/api/game-saves/' + data.babySave)).json();
  const url = '/api/baby?saveId=' + data.babySave + '&characterId=' + data.baby;
  const rejected = await page.request.post(url, {
    headers: { origin: new URL(page.url()).origin },
    data: { requestId: crypto.randomUUID(), characterId: data.baby, activity: 'baby_feed' },
  });
  expect(rejected.status()).toBe(426);
  await page.route('**/api/baby?**', (route) =>
    route.continue({ headers: { ...route.request().headers(), 'x-pomins-needs-version': '1' } }),
  );
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByText(/Atualize o aplicativo para continuar os cuidados/)).toBeVisible();
  await expect(timer).toHaveAttribute('data-instance', 'same-focus');
  await expect(page).toHaveURL(new RegExp('/game/' + data.babySave + '$'));
  const after = await (await page.request.get('/api/game-saves/' + data.babySave)).json();
  expect(after.data.room.credits).toEqual(before.data.room.credits);
  expect(after.data.sessions).toEqual(before.data.sessions);
});
