import type { Page } from '@playwright/test';

export async function openGamePanel(page: Page, name: string) {
  const button = page.getByRole('button', { name, exact: true });
  if (!(await button.isVisible())) await page.locator('.game-screen-menu > summary').click();
  await button.click();
}

/** Opens the existing timer UI without starting or resuming a session. */
export async function openFocus(page: Page) {
  const close = page.getByRole('button', { name: 'Voltar ao jogo', exact: true });
  if (await close.isVisible()) await close.click();
  if (await page.locator('.compact-focus').isVisible()) return;
  const existing = page.getByRole('button', { name: 'Continuar sessão', exact: true });
  await (
    (await existing.isVisible())
      ? existing
      : page.getByRole('button', { name: 'Abrir foco', exact: true })
  ).click();
}
