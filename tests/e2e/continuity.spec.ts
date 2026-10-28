import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { projectContinuity } from '../../src/features/continuity/model';
import { foundationRules } from '../../src/features/economy-foundation/model';
const fixture = process.env.POMINS_SAVE_FIXTURE_ORIGIN;
test.skip(!fixture, 'Synthetic authenticated database only; no real game commands.');

test('a confirmed completion refreshes continuity once without remounting the dial', async ({
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
  let completed = false,
    reads = 0,
    current: Record<string, unknown> = {};
  await page.route('**/api/continuity', (route) => {
    reads++;
    return route.fulfill({
      json: projectContinuity({
        active: false,
        activation_at: null,
        server_now: '2030-01-01T00:00:00Z',
        rules_version: 1,
        rules: foundationRules,
        care_offers: [],
        available_minutes: 0,
        last_valid_focus: completed
          ? {
              session_id: '10000000-0000-4000-8000-000000000001',
              completed_at: '2030-01-01T00:00:00Z',
            }
          : null,
      }),
    });
  });
  await page.route('**/api/game', async (route) => {
    const body = route.request().postDataJSON();
    if (body.kind !== 'focus') return route.continue();
    if (body.action === 'start')
      current = {
        id: body.id,
        character_id: data.baby,
        origin_save_id: data.babySave,
        status: 'active',
        planned_seconds: 120,
        validated_ms: 0,
        sequence: 0,
        client_id: body.clientId,
        task: '',
        first_step: '',
        reward_xp: 0,
        created_at: '2030-01-01T00:00:00Z',
        last_seen_at: '2030-01-01T00:00:00Z',
      };
    if (body.action === 'heartbeat')
      current = { ...current, validated_ms: 120000, sequence: body.sequence };
    if (body.action === 'complete') {
      completed = true;
      current = { ...current, status: 'completed', sequence: body.sequence };
    }
    await route.fulfill({ json: { data: current } });
  });
  // Accelerated acknowledgement tests UI integration only; native PG tests validate completion.
  await page.clock.install();
  await page.goto('/game/' + data.babySave);
  await expect(page.getByText('Constância · primeiro foco', { exact: true })).toBeVisible();
  const initialReads = reads;
  await page.locator('.focus-duration-dial').evaluate((el) => {
    (window as typeof window & { originalDial?: Element }).originalDial = el;
  });
  await page.getByRole('button', { name: 'Iniciar foco', exact: true }).click();
  await page.clock.runFor(5000);
  await expect(page.getByText(/Constância · 72 h/)).toBeVisible();
  expect(reads).toBe(initialReads + 1);
  expect(
    await page
      .locator('.focus-duration-dial')
      .evaluate((el) => (window as typeof window & { originalDial?: Element }).originalDial === el),
  ).toBe(true);
});

test('account continuity is read-only across baby/adult saves and mobile details are accessible', async ({
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
  const before = await (await page.request.get('/api/game-saves/' + data.babySave)).json();
  const first = await (await page.request.get('/api/continuity')).json();
  expect(first.mode).toBe('informational');
  expect(first.penalties_active).toBe(false);
  await page.getByText('Constância ·', { exact: false }).click();
  await expect(
    page.getByRole('heading', { name: 'Um momento seu, todas as histórias' }),
  ).toBeVisible();
  await expect(page.getByText('Consequências em preparação.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ir ao foco', exact: true }).click();
  await expect(page.locator('.dial-center')).toBeFocused();
  await page.setViewportSize({ width: 320, height: 693 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  await page.goto('/game/' + data.adultSave);
  const second = await (await page.request.get('/api/continuity')).json();
  expect(second.last_valid_completed_at).toBe(first.last_valid_completed_at);
  const after = await (await page.request.get('/api/game-saves/' + data.babySave)).json();
  expect(after.context).toEqual(before.context);
  expect(second).not.toHaveProperty('available_minutes');
});

test('device clock changes and failed refresh cannot invent a deadline or activate effects', async ({
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
  const before = await (await page.request.get('/api/continuity')).json();
  await page.evaluate(() => {
    Date.now = () => 0;
  });
  const after = await (await page.request.get('/api/continuity')).json();
  expect(after.last_valid_completed_at).toBe(before.last_valid_completed_at);
  await page.getByText('Constância ·', { exact: false }).click();
  await page.route('**/api/continuity', (route) => route.abort());
  await page.getByRole('button', { name: 'Atualizar constância' }).click();
  await expect(page.getByText(/Informação desatualizada/)).toBeVisible();
  await expect(page.getByText('Consequências em preparação.', { exact: true })).toBeVisible();
  await page.unroute('**/api/continuity');
  await page.getByRole('button', { name: 'Atualizar constância' }).click();
  await expect(page.getByText(/Informação desatualizada/)).toHaveCount(0);
});
