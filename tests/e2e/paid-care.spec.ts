import { test, expect } from '@playwright/test';
const fixture = process.env.POMINS_SAVE_FIXTURE_ORIGIN;
test.skip(!fixture, 'Only disposable SQL and simulated Auth.');
test('fixed-price care confirms first use, recovers a lost acknowledgement and never duplicates debit', async ({
  page,
  context,
  request,
}, testInfo) => {
  const info = await (
    await request.get(fixture + '/__test/immersive?project=paid-' + testInfo.project.name)
  ).json();
  const login = () =>
    context.addCookies([
      {
        name: 'sb-127-auth-token',
        value: 'base64-' + Buffer.from(JSON.stringify(info.session)).toString('base64url'),
        domain: 'localhost',
        path: '/',
      },
    ]);
  await login();
  await page.goto('/game/' + info.babySave);
  await expect(page.getByText('2 min disponíveis', { exact: true })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Minutos para o cuidado' })).toHaveCount(0);
  const before = await (await page.request.get('/api/game-saves/' + info.babySave)).json();
  await page.getByRole('button', { name: 'Alimentar · 2 min', exact: true }).dblclick();
  await expect(
    page.getByRole('button', { name: 'Confirmar Alimentar · 2 min', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('2 min disponíveis', { exact: true })).toBeVisible();
  const bodies: unknown[] = [];
  let lost = false;
  await page.route('**/api/baby?*', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    bodies.push(route.request().postDataJSON());
    if (!lost) {
      lost = true;
      await route.fetch();
      return route.abort('failed');
    }
    return route.continue();
  });
  await page.getByRole('button', { name: 'Confirmar Alimentar · 2 min', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Conferir cuidado pendente' })).toBeEnabled();
  await page.getByRole('button', { name: 'Conferir cuidado pendente' }).click();
  await expect(page.getByText(/Alimentar: 2 min registrados/)).toBeVisible();
  expect(bodies).toHaveLength(2);
  expect(bodies[0]).toEqual(bodies[1]);
  expect(Object.keys(bodies[0] as object).sort()).toEqual(['activity', 'characterId', 'requestId']);
  await expect(page.getByText('0 min disponíveis', { exact: true })).toBeVisible();
  await expect(page.getByRole('meter', { name: 'Saciedade', exact: true })).toHaveAttribute(
    'value',
    '99',
  );
  await expect(page.getByRole('button', { name: 'Alimentar · 2 min', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Dar carinho', exact: true }).click();
  await expect(page.locator('.baby-care-stage')).toHaveAttribute(
    'data-care-reaction',
    'baby_cuddle',
  );
  await expect(page.getByRole('meter', { name: 'Afeto', exact: true })).toHaveAttribute(
    'value',
    '75',
  );
  await expect(page.getByRole('button', { name: 'Iniciar foco', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload();
  await expect(page.getByRole('meter', { name: 'Saciedade', exact: true })).toHaveAttribute(
    'value',
    '99',
  );
  await context.clearCookies();
  await page.goto('/game/' + info.babySave);
  await expect(page).toHaveURL(/\/auth/);
  await login();
  await page.goto('/game/' + info.babySave);
  await expect(page.getByText('0 min disponíveis', { exact: true })).toBeVisible();
  const after = await (await page.request.get('/api/game-saves/' + info.babySave)).json();
  expect(after.data.sessions).toEqual(before.data.sessions);
  expect(
    after.data.room.credits[0].allocated_minutes - before.data.room.credits[0].allocated_minutes,
  ).toBe(2);
});
