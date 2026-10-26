import { test, expect } from '@playwright/test';
test('creates an alien, saves a birth memory, reloads and starts strict local focus', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Há uma história/ })).toBeVisible();
  await page.getByRole('button', { name: 'Criar meu primeiro Pomin' }).click();
  await page.getByRole('button', { name: 'Alienígena', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nome do seu Pomin' }).fill('Lumi');
  await page.getByRole('tab', { name: 'Rosto' }).click();
  await page.getByRole('button', { name: 'Cachos', exact: true }).click();
  await page.getByRole('tab', { name: 'Estilo' }).click();
  await page.getByRole('button', { name: 'Estrelinha', exact: true }).click();
  await page.getByRole('button', { name: 'Dar boas-vindas ao mundo' }).click();
  await expect(page.getByRole('heading', { name: /O mundo ganhou/ })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: /A luz dançando/ }).click();
  await page.getByRole('button', { name: 'Guardar essa primeira memória' }).click();
  await expect(page.getByRole('heading', { name: /Olá, Lumi/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: /Olá, Lumi/ })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir foco' }).click();
  await expect(page.getByRole('heading', { name: /Seu foco abre/ })).toBeVisible();
  await page.getByRole('button', { name: 'Iniciar foco' }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retomar foco' })).toBeVisible();
  await page.getByRole('button', { name: 'Encerrar sessão', exact: true }).click();
  await expect(page.getByText('Sessão encerrada', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('home, login, and small viewport remain accessible', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await page.screenshot({
    path: `test-results/home-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/auth');
  await page.getByRole('button', { name: 'Entrar na minha história' }).click();
  await expect(page.getByText('Digite um e-mail válido.')).toBeVisible();
  await page.getByRole('button', { name: 'Começar minha história' }).click();
  await expect(page.getByLabel('Confirme a senha', { exact: true })).toBeVisible();
});
test('API rejects unauthenticated or cross-origin commands', async ({ request, baseURL }) => {
  const cross = await request.post('/api/game', {
    headers: { origin: 'https://other.invalid' },
    data: { kind: 'focus' },
  });
  expect(cross.status()).toBe(403);
  const same = await request.post('/api/game', {
    headers: { origin: baseURL! },
    data: { kind: 'focus' },
  });
  expect([401, 503]).toContain(same.status());
});
