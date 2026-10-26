import { openFocus, openGamePanel } from '../support/ui';
import {
  test,
  expect,
  type Page,
  type BrowserContext,
  type APIRequestContext,
} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const fixture = process.env.POMINS_SAVE_FIXTURE_ORIGIN;
test.skip(!fixture, 'Disposable SQL and simulated Auth only. Never real focus or credits.');
const sizes = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 844, height: 390 },
  { width: 1280, height: 900 },
];
async function login(context: BrowserContext, request: APIRequestContext, project: string) {
  const info = await (
    await request.get(fixture + '/__test/immersive?project=audit-' + project)
  ).json();
  await context.addCookies([
    {
      name: 'sb-127-auth-token',
      value: 'base64-' + Buffer.from(JSON.stringify(info.session)).toString('base64url'),
      domain: 'localhost',
      path: '/',
    },
  ]);
  return info;
}
async function noHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function axe(page: Page) {
  // Measure the settled screen, not an intermediate frame of the 180ms tutorial fade.
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().endTime))
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
}
test('auth fields remain legible and errors announce themselves on small screens', async ({
  page,
}, info) => {
  await page.setViewportSize(sizes[0]);
  await page.goto('/auth');
  await noHorizontalOverflow(page);
  for (const input of await page.locator('.auth-card input').all())
    expect(
      await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeGreaterThanOrEqual(16);
  await page.getByRole('button', { name: 'Entrar na minha história' }).click();
  await expect(page.locator('.auth-card').getByRole('alert')).toContainText(
    'Digite um e-mail válido.',
  );
  await expect(page.getByRole('textbox', { name: 'E-mail', exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page.getByRole('button', { name: 'Começar minha história' }).click();
  await expect(page.getByLabel('Confirme a senha', { exact: true })).toBeVisible();
  await noHorizontalOverflow(page);
  await axe(page);
  await page.screenshot({ path: info.outputPath('auth-small.png'), fullPage: true });
});
test('portal and settings reflow at phone and desktop sizes without hiding field text', async ({
  page,
  context,
  request,
}, info) => {
  await login(context, request, info.project.name);
  for (const path of ['/menu', '/rules', '/settings', '/saves', '/saves/new']) {
    await page.goto(path);
    for (const size of sizes) {
      await page.setViewportSize(size);
      await noHorizontalOverflow(page);
    }
    await page.setViewportSize(sizes[2]);
    if (path === '/rules') {
      await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
      await page.getByRole('button', { name: 'Próximo', exact: true }).click();
      await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    }
    if (path === '/settings')
      for (const input of await page
        .locator('input:not([type=checkbox]):not([type=radio]),select')
        .all())
        expect(
          await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
        ).toBeGreaterThanOrEqual(16);
    await axe(page);
    await page.screenshot({
      path: info.outputPath(path.slice(1).replaceAll('/', '-') + '.png'),
      fullPage: true,
    });
  }
});
test('dragging inside the center does not accidentally start focus', async ({
  page,
  context,
  request,
}, info) => {
  const account = await login(context, request, info.project.name);
  const calls: string[] = [];
  await page.route('**/api/game', async (route) => {
    const body = route.request().postDataJSON();
    if (body.kind !== 'focus') return route.continue();
    calls.push(body.action);
    await route.fulfill({ status: 503, json: { error: 'Deliberately blocked in audit fixture' } });
  });
  await page.goto('/game/' + account.babySave);
  await openFocus(page);
  const center = page.getByRole('button', { name: 'Iniciar foco', exact: true });
  const box = (await center.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 18, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(center).toBeEnabled();
  expect(calls).toEqual([]);
  await center.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => calls).toEqual(['start']);
});
test('offline notice leaves game controls unobscured', async ({ page, context, request }, info) => {
  const account = await login(context, request, info.project.name);
  await page.setViewportSize(sizes[2]);
  await page.goto('/game/' + account.babySave);
  await openFocus(page);
  await context.setOffline(true);
  await expect(page.locator('.connection-banner')).toBeVisible();
  await expect(page.locator('.connection-banner')).not.toContainText('foi pausado');
  const banner = (await page.locator('.connection-banner').boundingBox())!;
  for (const control of await page.locator('.game-screen button').all()) {
    const box = await control.boundingBox();
    if (box)
      expect(
        Math.max(
          0,
          Math.min(banner.y + banner.height, box.y + box.height) - Math.max(banner.y, box.y),
        ),
      ).toBe(0);
  }
  const tabs = page.locator('.game-screen-tabs');
  await tabs.scrollIntoViewIfNeeded();
  for (const button of await tabs.locator('button').filter({ visible: true }).all())
    expect(
      await button.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return hit === el || (!!hit && el.contains(hit));
      }),
    ).toBe(true);
  await page.screenshot({ path: info.outputPath('offline-game.png'), fullPage: true });
  await context.setOffline(false);
});

test('adult and baby panels stay reachable through rotation and reduced viewport height', async ({
  page,
  context,
  request,
}, info) => {
  const account = await login(context, request, info.project.name);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (response) => {
    if (response.status() >= 400 && /\/(assets|fonts)\//.test(response.url()))
      errors.push('Missing static resource');
  });
  for (const baby of [false, true]) {
    await page.goto('/game/' + (baby ? account.babySave : account.adultSave));
    const canvas = page.getByTestId('room-canvas').locator('canvas');
    if (!baby) {
      await expect(canvas).toBeVisible();
      await canvas.evaluate((el) => el.setAttribute('data-audit-instance', 'stable'));
    }
    await openFocus(page);
    const dial = page.getByRole('slider', { name: 'Duração do foco', exact: true });
    await dial.evaluate((el) => el.setAttribute('data-audit-instance', 'stable'));
    for (const size of [...sizes, { width: 390, height: 400 }]) {
      await page.setViewportSize(size);
      await noHorizontalOverflow(page);
      for (const tab of await page.locator('.game-screen-tabs button').filter({ visible: true }).all()) {
        await tab.click();
        expect((await tab.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }
      await expect(dial).toHaveAttribute('data-audit-instance', 'stable');
      if (!baby) await expect(canvas).toHaveAttribute('data-audit-instance', 'stable');
    }
    await page.setViewportSize(sizes[2]);
    await openGamePanel(page, baby ? 'Cuidados' : 'Aparência');
    if (!baby) {
      const hair = page.getByRole('button', { name: /^Cor do cabelo #/ }).first();
      await hair.scrollIntoViewIfNeeded();
      await expect(hair).toBeInViewport();
      await page.getByRole('button', { name: 'Atividades', exact: true }).click();
      const world = (await page.locator('.game-screen-world').boundingBox())!;
      const image = (await canvas.boundingBox())!;
      expect(image.width / image.height).toBeCloseTo(4 / 3, 1);
      expect(image.width).toBeLessThanOrEqual(world.width);
      expect(image.height).toBeLessThanOrEqual(world.height);
    }
    await page.screenshot({
      path: info.outputPath(baby ? 'baby-audit.png' : 'adult-audit.png'),
      fullPage: true,
    });
    await axe(page);
  }
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Lumi', exact: true })).toBeVisible();
  await expect(page.getByTestId('room-canvas')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('focus pauses on lifecycle events and requires explicit resume without SQL progress', async ({
  page,
  context,
  request,
}, info) => {
  const account = await login(context, request, info.project.name);
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
            ...current,
            sequence: body.sequence,
            status: body.action === 'resume' ? 'active' : 'paused',
          };
    await route.fulfill({ json: { data: current } });
  });
  await page.clock.install();
  await page.goto('/game/' + account.adultSave);
  const before = await (await page.request.get('/api/game-saves/' + account.adultSave)).json();
  await openFocus(page);
  await page.getByRole('button', { name: 'Iniciar foco', exact: true }).click();
  for (const type of ['blur', 'pagehide', 'offline', 'visibilitychange']) {
    await expect(page.getByRole('button', { name: 'Pausar pelo seletor' })).toBeVisible();
    const original = calls.length;
    await page.evaluate((type) => {
      if (type === 'visibilitychange') {
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
        document.dispatchEvent(new Event(type));
      } else window.dispatchEvent(new Event(type));
    }, type);
    await expect.poll(() => calls.slice(original)).toEqual(['pause']);
    await expect(page.getByRole('button', { name: 'Retomar pelo seletor' })).toBeVisible();
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('online'));
    });
    await page.clock.runFor(6000);
    expect(calls.slice(original)).toEqual(['pause']);
    await expect(page.getByRole('timer', { name: 'Tempo restante' })).toHaveText('02:00');
    await page.getByRole('button', { name: 'Retomar pelo seletor' }).click();
  }
  await page.getByRole('button', { name: 'Pausar pelo seletor' }).click();
  await expect(page.getByRole('button', { name: 'Retomar pelo seletor' })).toBeVisible();
  await page.getByRole('link', { name: 'Partidas', exact: true }).click();
  await expect(page).toHaveURL(/\/saves$/);
  const after = await (await page.request.get('/api/game-saves/' + account.adultSave)).json();
  expect(after.data.sessions).toEqual(before.data.sessions);
  expect(after.data.room.credits).toEqual(before.data.room.credits);
  expect(calls).not.toContain('complete');
  expect(calls).not.toContain('cancel');
  // Event injection verifies UI behavior, not physical screen locking or offline server delivery.
});

test('touch cancellation rolls back the ring and never activates the center', async ({
  page,
  context,
  request,
}, info) => {
  test.skip(
    info.project.name !== 'iphone',
    'Native CDP touch is checked only in the touch project.',
  );
  const account = await login(context, request, info.project.name);
  await page.goto('/game/' + account.babySave);
  await openFocus(page);
  const dial = page.getByRole('slider', { name: 'Duração do foco', exact: true });
  const original = await dial.getAttribute('aria-valuenow');
  const cdp = await context.newCDPSession(page);
  const box = (await dial.boundingBox())!;
  const cx = box.x + box.width / 2,
    cy = box.y + box.height / 2,
    radius = box.width * 0.43;
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: cx, y: cy - radius }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: cx + radius, y: cy }],
  });
  await expect(dial).not.toHaveAttribute('aria-valuenow', original!);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(dial).toHaveAttribute('aria-valuenow', original!);
  await expect(page.getByRole('button', { name: 'Iniciar foco', exact: true })).toBeEnabled();
  const calls: string[] = [];
  await page.route('**/api/game', async (route) => {
    if (route.request().postDataJSON().kind !== 'focus') return route.continue();
    calls.push('focus');
    await route.fulfill({ status: 503, json: { error: 'Blocked in fixture' } });
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: cx, y: cy }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: cx + 18, y: cy }],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(calls).toEqual([]);
  await cdp.detach();
});

test('PWA caches only public assets and opens the offline fallback', async ({
  page,
  context,
  request,
}) => {
  await page.goto('/auth');
  expect(await page.locator('meta[name=viewport]').getAttribute('content')).not.toMatch(
    /user-scalable=no|maximum-scale=1/,
  );
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.display).toBe('standalone');
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true);
  expect((await request.get('/sw.js')).headers()['cache-control']).toContain('no-store');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const cached = await page.evaluate(async () => {
    const entries = await Promise.all(
      (await caches.keys()).map(async (key) =>
        (await (await caches.open(key)).keys()).map((req) => new URL(req.url).pathname),
      ),
    );
    return entries.flat();
  });
  expect(cached).toContain('/offline.html');
  expect(cached.some((path) => /^\/(api|auth|game|saves)(\/|$)/.test(path))).toBe(false);
  await context.setOffline(true);
  await page.goto('/menu');
  await expect(page.getByRole('heading', { name: 'As histórias esperam por você.' })).toBeVisible();
  await noHorizontalOverflow(page);
  await axe(page);
  await context.setOffline(false);
  await page.getByRole('link', { name: 'Tentar novamente' }).click();
  await expect(page.locator('main')).toBeVisible();
});

test('legacy birth stays readable and keyboard reachable on a narrow screen', async ({
  page,
}, info) => {
  await page.setViewportSize(sizes[0]);
  await page.goto('/');
  await page.getByRole('button', { name: 'Criar meu primeiro Pomin' }).click();
  const name = page.getByRole('textbox', { name: 'Nome do seu Pomin' });
  await name.fill('Pequena Aurora');
  await name.focus();
  await page.setViewportSize({ width: 320, height: 350 });
  await name.scrollIntoViewIfNeeded();
  await expect(name).toBeInViewport();
  await noHorizontalOverflow(page);
  await page.setViewportSize(sizes[0]);
  await page.getByRole('button', { name: 'Dar boas-vindas ao mundo' }).click();
  await expect(page.getByRole('heading', { name: /O mundo ganhou/ })).toBeVisible();
  await noHorizontalOverflow(page);
  await axe(page);
  await page.screenshot({ path: info.outputPath('birth-small.png'), fullPage: true });
  await page.getByRole('button', { name: 'Continuar', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: /A luz dançando/ }).click();
  await page.getByRole('button', { name: 'Guardar essa primeira memória' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: /Olá, Pequena Aurora/ })).toBeVisible();
});

test('client navigation cleans Phaser and focus listeners between worlds', async ({
  page,
  context,
  request,
}, info) => {
  // Track lifecycle listeners without adding a product debug interface.
  await page.addInitScript(`(() => {
    const sets = new Map();
    for (const [label, target] of [['window', window], ['document', document]]) {
      const add = target.addEventListener.bind(target), remove = target.removeEventListener.bind(target);
      target.addEventListener = (type, fn, options) => {
        if (['blur','pagehide','pageshow','offline','visibilitychange','resize'].includes(type)) {
          const key = label + ':' + type;
          if (!sets.has(key)) sets.set(key, new Set());
          sets.get(key).add(fn);
        }
        return add(type, fn, options);
      };
      target.removeEventListener = (type, fn, options) => {
        sets.get(label + ':' + type)?.delete(fn);
        return remove(type, fn, options);
      };
    }
    window.__auditCounts = () => Object.fromEntries([...sets].map(([key, value]) => [key, value.size]).sort());
  })();`);
  const account = await login(context, request, info.project.name);
  await page.goto('/game/' + account.adultSave);
  let baseline: Record<string, number> | undefined;
  const counts = () =>
    page.evaluate(() =>
      (window as unknown as { __auditCounts: () => Record<string, number> }).__auditCounts(),
    );
  for (let cycle = 0; cycle < 3; cycle++) {
    await expect(page.getByTestId('room-canvas').locator('canvas')).toBeVisible();
    await page.getByRole('button', { name: 'Iniciar foco', exact: true }).click();
    const activeCounts = await counts();
    for (const label of ['Aparência', 'Progresso', 'Moradores', 'Atividades'])
      await openGamePanel(page, label);
    expect(await counts()).toEqual(activeCounts);
    await page.getByRole('link', { name: 'Partidas', exact: true }).click();
    await expect(page).toHaveURL(/\/saves$/);
    await expect(page.getByTestId('room-canvas')).toHaveCount(0);
    if (baseline) await expect.poll(counts).toEqual(baseline);
    else baseline = await counts();
    if (cycle < 2) await page.locator('a[href="/game/' + account.adultSave + '"]').click();
  }
  await page.locator('a[href="/game/' + account.babySave + '"]').click();
  await expect(page.getByRole('heading', { name: 'Lumi', exact: true })).toBeVisible();
  await expect(page.getByTestId('room-canvas')).toHaveCount(0);
});
