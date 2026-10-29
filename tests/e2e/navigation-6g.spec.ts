import { test, expect, type BrowserContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openGamePanel, openFocus } from '../support/ui';
const fixture = process.env.POMINS_SAVE_FIXTURE_ORIGIN;
test.skip(!fixture, 'Disposable SQL and simulated Auth only.');
async function login(context: BrowserContext, session: unknown) {
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url'), domain: 'localhost', path: '/' }]);
}
test('guest entry exposes auth states without a game menu; authenticated entry goes to menu', async ({ page, context, request }) => {
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'E-mail', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Menu principal', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cadastro', exact: true }).click();
  await expect(page.getByLabel('Confirme a senha', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('button', { name: 'Esqueci minha senha' }).click();
  await expect(page.getByRole('button', { name: 'Enviar link', exact: true })).toBeVisible();
  const data = await (await request.get(fixture + '/__test/info')).json();
  await login(context, data.session);
  await page.goto('/');
  await expect(page).toHaveURL(/\/menu$/);
  await page.goto('/auth?mode=update');
  await expect(page.getByRole('button', { name: 'Salvar nova senha', exact: true })).toBeVisible();
});
for (const width of [320, 375, 390, 430, 768, 1280]) {
  test(`five-action game menu and compact settings fit ${width}px`, async ({ page, context, request }, info) => {
    const data = await (await request.get(fixture + '/__test/info')).json();
    await login(context, data.session);
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/menu');
    const nav = page.getByRole('navigation', { name: 'Menu principal', exact: true });
    await expect(nav.locator('a,button')).toHaveText(['Iniciar', 'Carregar', 'Regras', 'Configurações', 'Sair']);
    for (const control of await nav.locator('a,button').all()) {
      const box = await control.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(48);
      expect(box!.y + box!.height).toBeLessThanOrEqual(width === 320 ? 568 : 844);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: info.outputPath(`menu-${width}.png`), fullPage: true });
    await page.getByRole('link', { name: 'Configurações', exact: true }).click();
    await expect(page.getByRole('navigation', { name: 'Categorias de configurações' }).getByRole('button')).toHaveCount(4);
    await expect(page.getByRole('spinbutton')).toHaveCount(0);
    await expect(page.getByRole('combobox')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`settings-${width}.png`), fullPage: true });
    // Accessibility zoom/reflow can scroll, rather than clipping controls.
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
test('logout checks active focus, fails closed offline and preserves paused focus on explicit confirmation', async ({ page, context, request }) => {
  const data = await (await request.get(fixture + '/__test/info')).json();
  await login(context, data.session);
  const before = await (await page.request.get('/api/game-saves/' + data.one)).json();
  await page.goto('/menu');
  const status = await (await page.request.get('/api/account')).json();
  await page.route('**/api/account', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { ...status, focus: 'active' } });
    return route.continue();
  });
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.locator('.logout-control [role="alert"]')).toContainText('Pause o foco');
  await expect(page).toHaveURL(/\/menu$/);
  await page.unroute('**/api/account');
  await page.route('**/api/account', route => route.abort());
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.locator('.logout-control [role="alert"]')).toBeVisible();
  await expect(page).toHaveURL(/\/menu$/);
  await page.unroute('**/api/account');
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Confirmar saída' })).toContainText('continuará salvo');
  await page.getByRole('button', { name: 'Confirmar saída', exact: true }).click();
  await expect(page).toHaveURL(/\/auth$/);
  await login(context, data.session);
  const after = await (await page.request.get('/api/game-saves/' + data.one)).json();
  expect(after.data.sessions).toEqual(before.data.sessions);
  expect(after.data.room.credits).toEqual(before.data.room.credits);
});
test('loading lists preserves progression; privacy persists and account deletion stays explicitly guarded', async ({ page, context, request }) => {
  const data = await (await request.get(fixture + '/__test/info')).json();
  await login(context, data.session);
  const before = await (await page.request.get('/api/game-saves/' + data.one)).json();
  const writes: string[] = [];
  page.on('request', req => { if (req.method() !== 'GET' && req.url().includes('/api/')) writes.push(req.url()); });
  await page.goto('/menu');
  await page.getByRole('link', { name: 'Carregar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Suas partidas', exact: true })).toBeVisible();
  expect(writes).toEqual([]);
  const after = await (await page.request.get('/api/game-saves/' + data.one)).json();
  expect(after.data.context.save.progression).toEqual(before.data.context.save.progression);
  expect(after.data.room.credits).toEqual(before.data.room.credits);
  expect(after.data.sessions).toEqual(before.data.sessions);
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Privacidade e dados', exact: true }).click();
  const privacy = page.getByRole('checkbox', { name: 'Permitir meu perfil público quando disponível' });
  await expect(privacy).toBeEnabled();
  const original = await privacy.isChecked();
  await privacy.click();
  await expect(page.getByRole('status')).toContainText('privacidade salva');
  await expect(privacy).toBeChecked({ checked: !original });
  await page.reload();
  await page.getByRole('button', { name: 'Privacidade e dados', exact: true }).click();
  await expect(privacy).toBeChecked({ checked: !original });
  await page.getByText('Excluir minha conta', { exact: true }).click();
  const remove = page.getByRole('button', { name: 'Excluir conta e dados', exact: true });
  await expect(remove).toBeDisabled();
  await page.getByRole('textbox', { name: 'Confirmação', exact: true }).fill('EXCLUIR');
  await expect(remove).toBeEnabled();
  // Never submit deletion; this is a guard test with disposable data.
});
test('four on-demand panels keep timer, scene and page position; help completion is remembered', async ({ page, context, request }, info) => {
  const data = await (await request.get(fixture + '/__test/immersive?project=nav-' + info.project.name)).json();
  await login(context, data.session);
  await page.goto('/game/' + data.babySave);
  const timer = page.getByRole('timer', { name: 'Tempo restante' });
  await timer.evaluate(el => el.setAttribute('data-instance', 'preserved'));
  const world = page.locator('.baby-care-portrait > svg');
  await world.evaluate(el => el.setAttribute('data-instance', 'preserved'));
  await expect(page.locator('.game-screen-tabs button')).toHaveText(['Cuidados', 'Progresso', 'História', 'Moradores']);
  for (const panel of ['Cuidados', 'Progresso', 'História', 'Moradores']) {
    const scroll = await page.evaluate(() => scrollY);
    await openGamePanel(page, panel);
    expect(await page.evaluate(() => scrollY)).toBe(scroll);
    await expect(timer).toHaveAttribute('data-instance', 'preserved');
    await expect(world).toHaveAttribute('data-instance', 'preserved');
  }
  await openFocus(page);
  await page.getByText('Como jogar', { exact: true }).click();
  await page.getByRole('button', { name: 'Entendi', exact: true }).click();
  await page.reload();
  await expect(page.getByText('Como jogar', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('game.png'), fullPage: true });
  await page.locator('.game-screen-menu summary').click();
  await page.getByRole('link', { name: 'Menu principal', exact: true }).click();
  await page.getByRole('link', { name: 'Regras', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Regras essenciais' })).toContainText('não estão ativos');
  await page.getByText('Tutorial completo', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Um momento para você', exact: true })).toBeVisible();
});
