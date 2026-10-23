import {
  test,
  expect,
  type Page,
  type BrowserContext,
  type APIRequestContext,
} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const fixture = process.env.POMINS_SAVE_FIXTURE_ORIGIN;
test.skip(!fixture, 'Isolated fixture only; no real credentials, focus or credits.');
async function enter(
  page: Page,
  context: BrowserContext,
  request: APIRequestContext,
  project: string,
  baby = false,
) {
  const info = await (await request.get(fixture + '/__test/immersive?project=dial-' + project)).json();
  await context.addCookies([
    {
      name: 'sb-127-auth-token',
      value: 'base64-' + Buffer.from(JSON.stringify(info.session)).toString('base64url'),
      domain: 'localhost',
      path: '/',
    },
  ]);
  await page.goto('/game/' + (baby ? info.babySave : info.adultSave));
  await page
    .getByRole('button', { name: baby ? 'Encontrar meu foco' : 'Começar meu foco', exact: true })
    .click();
  await expect(page.getByRole('slider', { name: 'Duração do foco', exact: true })).toBeVisible();
  return info;
}
async function point(page: Page, degrees: number) {
  const box = (await page
    .getByRole('slider', { name: 'Duração do foco', exact: true })
    .boundingBox())!;
  return {
    x: box.x + box.width / 2 + box.width * 0.43 * Math.sin((degrees * Math.PI) / 180),
    y: box.y + box.height / 2 - box.height * 0.43 * Math.cos((degrees * Math.PI) / 180),
  };
}
async function drag(page: Page, from: number, to: number) {
  const a = await point(page, from),
    b = await point(page, to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
}

test('uses saved defaults, conventional controls and keyboard without writing temporary adjustments', async ({
  page,
  context,
  request,
}, info) => {
  const account = await enter(page, context, request, info.project.name);
  await page.goto('/settings');
  await page
    .getByRole('spinbutton', { name: 'Duração padrão do foco (minutos)', exact: true })
    .fill('31');
  await page.getByRole('button', { name: 'Salvar preferências', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('salvas');
  await page.goto('/game/' + account.adultSave);
  await page.getByRole('button', { name: 'Começar meu foco', exact: true }).click();
  const dial = page.getByRole('slider', { name: 'Duração do foco', exact: true });
  await expect(dial).toHaveAttribute('aria-valuenow', '31');
  await page.getByRole('button', { name: 'Aumentar duração em um minuto' }).click();
  await expect(dial).toHaveAttribute('aria-valuenow', '32');
  await page.getByRole('button', { name: 'Diminuir duração em um minuto' }).click();
  await dial.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('PageUp');
  await expect(dial).toHaveAttribute('aria-valuenow', '37');
  await page.keyboard.press('PageDown');
  await page.keyboard.press('ArrowLeft');
  await expect(dial).toHaveAttribute('aria-valuenow', '31');
  await page.keyboard.press('Home');
  await expect(dial).toHaveAttribute('aria-valuenow', '2');
  await page.keyboard.press('ArrowDown');
  await expect(dial).toHaveAttribute('aria-valuenow', '2');
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowUp');
  await expect(dial).toHaveAttribute('aria-valuenow', '120');
  await page.getByText('Duração e intenção do foco', { exact: true }).click();
  await expect(
    page.getByRole('spinbutton', { name: 'Ou escolha seu tempo (2 a 120 min)', exact: true }),
  ).toHaveValue('120');
  await page
    .getByRole('spinbutton', { name: 'Ou escolha seu tempo (2 a 120 min)', exact: true })
    .fill('15');
  await expect(dial).toHaveAttribute('aria-valuetext', '15 minutos');
  await page
    .getByRole('spinbutton', { name: 'Ou escolha seu tempo (2 a 120 min)', exact: true })
    .fill('15.6');
  await expect(dial).toHaveAttribute('aria-valuetext', '16 minutos');
  await page.goto('/settings');
  await expect(
    page.getByRole('spinbutton', { name: 'Duração padrão do foco (minutos)', exact: true }),
  ).toHaveValue('31');
  // Restore only the disposable account preference for the remaining regressions.
  await page
    .getByRole('spinbutton', { name: 'Duração padrão do foco (minutos)', exact: true })
    .fill('2');
  await page.getByRole('button', { name: 'Salvar preferências', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('salvas');
});

test('rotates relatively in both directions, clamps the seam and rolls back cancelled gestures', async ({
  page,
  context,
  request,
}, info) => {
  await enter(page, context, request, info.project.name);
  const dial = page.getByRole('slider', { name: 'Duração do foco', exact: true });
  await dial.focus();
  await page.keyboard.press('Home');
  await page.getByText('Duração e intenção do foco', { exact: true }).click();
  await page
    .getByRole('spinbutton', { name: 'Ou escolha seu tempo (2 a 120 min)', exact: true })
    .fill('60');
  await page.getByText('Duração e intenção do foco', { exact: true }).click();
  await drag(page, 0, 45);
  await expect(dial).toHaveAttribute('aria-valuenow', '80');
  await drag(page, 0, -45);
  await expect(dial).toHaveAttribute('aria-valuenow', '60');
  await dial.focus();
  await page.keyboard.press('End');
  await drag(page, 170, -170);
  await expect(dial).toHaveAttribute('aria-valuenow', '120');
  await dial.focus();
  await page.keyboard.press('Home');
  await drag(page, -170, 170);
  await expect(dial).toHaveAttribute('aria-valuenow', '2');
  await drag(page, 170, -170);
  await expect(dial).toHaveAttribute('aria-valuenow', '11');
  const a = await point(page, 0),
    b = await point(page, 60);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await expect(dial).not.toHaveAttribute('aria-valuenow', '11');
  await dial.dispatchEvent('pointercancel', { pointerId: 1 });
  await page.mouse.up();
  await expect(dial).toHaveAttribute('aria-valuenow', '11');
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.up();
  await expect(dial).toHaveAttribute('aria-valuenow', '11');
  await page.mouse.move(1, 1);
  await page.mouse.wheel(0, 200);
  await expect(dial).toHaveAttribute('aria-valuenow', '11');
  await expect(page.getByRole('button', { name: 'Começar meu foco', exact: true })).toBeVisible();
});

test('center reuses start pause resume with fixed duration and no duplicate focus or balance', async ({
  page,
  context,
  request,
}, info) => {
  const calls: string[] = [],
    payloads: Record<string, unknown>[] = [];
  let session: Record<string, unknown> | null = null;
  await page.route('**/api/game', async (route) => {
    const body = route.request().postDataJSON();
    if (body.kind !== 'focus') return route.continue();
    calls.push(body.action);
    payloads.push(body);
    session =
      body.action === 'start'
        ? {
            id: body.id,
            character_id: body.characterId,
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
            ...session,
            status:
              body.action === 'pause'
                ? 'paused'
                : body.action === 'cancel'
                  ? 'cancelled'
                  : 'active',
            sequence: body.sequence,
          };
    await route.fulfill({ json: { data: session } });
  });
  await page.clock.install();
  const account = await enter(page, context, request, info.project.name);
  const before = await (await page.request.get('/api/game-saves/' + account.adultSave)).json();
  const canvas = page.getByTestId('room-canvas').locator('canvas');
  await expect(canvas).toBeVisible();
  await canvas.evaluate((el) => el.setAttribute('data-instance', 'dial-world'));
  const dial = page.getByRole('slider', { name: 'Duração do foco', exact: true });
  await dial.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('PageUp');
  await expect(dial).toHaveAttribute('aria-valuenow', '7');
  await page
    .getByRole('button', { name: 'Começar meu foco', exact: true })
    .evaluate((el: HTMLButtonElement) => {
      el.click();
      el.click();
    });
  await expect(
    page.getByRole('button', { name: 'Pausar pelo seletor', exact: true }),
  ).toBeVisible();
  expect(calls.filter((x) => x === 'start')).toHaveLength(1);
  expect(payloads[0].minutes).toBe(7);
  await expect(dial).toHaveAttribute('aria-disabled', 'true');
  await dial.focus();
  await page.keyboard.press('End');
  await expect(dial).toHaveAttribute('aria-valuenow', '7');
  await expect(page.getByRole('button', { name: 'Aumentar duração em um minuto' })).toBeDisabled();
  await page.clock.runFor(1000);
  for (const name of ['Progresso', 'Aparência', 'Moradores', 'Atividades'])
    await page.getByRole('button', { name, exact: true }).click();
  await expect(canvas).toHaveAttribute('data-instance', 'dial-world');
  expect(calls).toEqual(['start']);
  await page.getByRole('button', { name: 'Pausar pelo seletor', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Retomar pelo seletor', exact: true }),
  ).toBeVisible();
  await expect(dial).toHaveAttribute('aria-valuenow', '7');
  await page.getByRole('button', { name: 'Retomar pelo seletor', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Pausar pelo seletor', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Encerrar', exact: true }).click();
  await page.getByRole('button', { name: 'Preparar novo foco', exact: true }).click();
  expect(calls).toEqual(['start', 'pause', 'recover', 'resume', 'recover', 'cancel']);
  const after = await (await page.request.get('/api/game-saves/' + account.adultSave)).json();
  expect(after.data.sessions).toEqual(before.data.sessions);
  expect(after.data.room.credits).toEqual(before.data.room.credits);
});

test('supports real touch pointers on the baby layout and reduced motion without covering the world', async ({
  page,
  context,
  request,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enter(page, context, request, info.project.name, true);
  const dial = page.getByRole('slider', { name: 'Duração do foco', exact: true });
  await dial.focus();
  await page.keyboard.press('Home');
  if (info.project.name === 'iphone') {
    const cdp = await context.newCDPSession(page),
      a = await point(page, 0),
      b = await point(page, 60);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: a.x, y: a.y }],
    });
    for (let n = 1; n <= 8; n++) {
      const radians = ((n / 8) * 60 * Math.PI) / 180,
        box = (await dial.boundingBox())!;
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          {
            x: box.x + box.width / 2 + box.width * 0.43 * Math.sin(radians),
            y: box.y + box.height / 2 - box.height * 0.43 * Math.cos(radians),
          },
        ],
      });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
    void b;
  } else await drag(page, 0, 60);
  await expect(dial).toHaveAttribute('aria-valuenow', '28');
  for (const size of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect((await page.locator('.game-screen-world').boundingBox())!.height).toBeGreaterThanOrEqual(
      210,
    );
    const box = (await page
      .getByRole('button', { name: 'Começar meu foco', exact: true })
      .boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  expect(
    await page.locator('.dial-needle').evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe('0s');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath('dial-baby-mobile.png'), fullPage: true });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
});

test('shows completion only after the existing engine receives confirmation', async ({
  page,
  context,
  request,
}, info) => {
  let confirm!: () => void;
  const gate = new Promise<void>((resolve) => {
    confirm = resolve;
  });
  const calls: string[] = [];
  let current: Record<string, unknown> = {};
  await page.route('**/api/game', async (route) => {
    const body = route.request().postDataJSON();
    if (body.kind !== 'focus') return route.continue();
    calls.push(body.action);
    if (body.action === 'start')
      current = {
        id: body.id,
        character_id: body.characterId,
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
    if (body.action === 'heartbeat')
      current = { ...current, validated_ms: 120000, sequence: body.sequence };
    if (body.action === 'complete') {
      await gate;
      current = { ...current, status: 'completed', sequence: body.sequence };
    }
    await route.fulfill({ json: { data: current } });
  });
  // The accelerated acknowledgement is simulated; it does not validate elapsed SQL time.
  await page.clock.install();
  const account = await enter(page, context, request, info.project.name);
  const before = await (await page.request.get('/api/game-saves/' + account.adultSave)).json();
  await page.getByRole('button', { name: 'Começar meu foco', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Pausar pelo seletor', exact: true }),
  ).toBeVisible();
  await page.clock.runFor(5000);
  await expect(page.locator('.focus-duration-dial')).toHaveAttribute('data-state', 'completing');
  await page.clock.runFor(1000);
  await expect(page.getByRole('button', { name: 'Foco concluído', exact: true })).toHaveCount(0);
  confirm();
  await expect(page.getByRole('button', { name: 'Foco concluído', exact: true })).toBeDisabled();
  await expect(page.getByRole('slider', { name: 'Duração do foco', exact: true })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  expect(calls).toEqual(['start', 'heartbeat', 'complete']);
  const after = await (await page.request.get('/api/game-saves/' + account.adultSave)).json();
  expect(after.data.room.credits).toEqual(before.data.room.credits);
  expect(after.data.sessions).toEqual(before.data.sessions);
});
