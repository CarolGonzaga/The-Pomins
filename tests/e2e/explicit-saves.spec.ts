import { test, expect } from '@playwright/test';
const fixture = process.env.POMINS_SAVE_FIXTURE_ORIGIN;
test.skip(!fixture, 'Requires the isolated SQL/Auth fixture; never uses remote accounts.');
test('loads independent saves, chooses protagonist and restores SQL state and Phaser', async ({
  page,
  context,
  request,
}) => {
  const info = await (await request.get(fixture + '/__test/info')).json();
  const cookie = () => ({
    name: 'sb-127-auth-token',
    value: 'base64-' + Buffer.from(JSON.stringify(info.session)).toString('base64url'),
    domain: 'localhost',
    path: '/',
  });
  await context.addCookies([cookie()]);
  await page.goto('/game/' + info.one);
  await expect(page.getByTestId('room-canvas').locator('canvas')).toBeVisible();
  await page.getByRole('button',{name:'Moradores',exact:true}).click();
  await expect(page.getByRole('navigation', { name: 'Moradores da partida' })).toContainText(
    'Aurora',
  );
  await page.goto('/game/' + info.two);
  if (await page.getByRole('heading', { name: 'Quem protagoniza esta história?' }).isVisible())
    await page.getByRole('button', { name: 'Nina', exact: true }).click();
  await page.getByRole('button',{name:'Moradores',exact:true}).click();
  await expect(page.getByRole('navigation', { name: 'Moradores da partida' })).toContainText(
    'Nina · Protagonista',
  );
  await expect(page.getByRole('navigation', { name: 'Moradores da partida' })).not.toContainText(
    'Aurora',
  );
  await page.getByRole('button',{name:'Cuidados',exact:true}).click();
  await expect(page.getByRole('meter',{name:'Saciedade',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Moradores',exact:true}).click();
  await page
    .getByRole('navigation', { name: 'Moradores da partida' })
    .getByRole('link', { name: 'Sol', exact: true })
    .click();
  await expect(page.getByTestId('room-canvas').locator('canvas')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('room-canvas').locator('canvas')).toBeVisible();
  await context.clearCookies();
  await page.goto('/game/' + info.two);
  await expect(page).toHaveURL(/\/auth\?next=/);
  await context.addCookies([cookie()]);
  await page.goto('/game/' + info.two);
  await page.getByRole('button',{name:'Moradores',exact:true}).click();
  await expect(page.getByRole('navigation', { name: 'Moradores da partida' })).toContainText(
    'Nina · Protagonista',
  );
  const before = await (await page.request.get('/api/game-saves/' + info.one)).json(),
    after = await (await page.request.get('/api/game-saves/' + info.two)).json();
  expect(before.data.room.credits).toEqual(after.data.room.credits);
  expect(after.data.sessions.find((f: { id: string }) => f.id === info.paused).status).toBe(
    'paused',
  );
  const calls = await (await request.get(fixture + '/__test/info')).json();
  expect(calls.commands).not.toContain('focus_command');
});
test('rejects foreign saves and incompatible resident URLs and preserves legacy routes', async ({
  page,
  context,
  request,
}) => {
  const info = await (await request.get(fixture + '/__test/info')).json();
  await context.addCookies([
    {
      name: 'sb-127-auth-token',
      value: 'base64-' + Buffer.from(JSON.stringify(info.session)).toString('base64url'),
      domain: 'localhost',
      path: '/',
    },
  ]);
  await page.goto('/game/' + info.foreign);
  await expect(page.getByRole('heading', { name: 'Partida indisponível' })).toBeVisible();
  await page.goto(`/game/${info.one}?character=${info.baby}`);
  await expect(page.getByRole('heading', { name: 'Morador indisponível' })).toBeVisible();
  await context.clearCookies();
  await page.goto('/');
  await expect(page.locator('main')).toBeVisible();
  await page.goto('/play');
  await expect(page.getByRole('textbox', { name: 'Nome do Pomin', exact: true })).toBeVisible();
});
