import { beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ account: vi.fn(), redirect: vi.fn() }));
vi.mock('@/features/preferences/server', () => ({ getAccount: mock.account }));
vi.mock('next/navigation', () => ({ redirect: mock.redirect }));
vi.mock('@/features/auth/auth-form', () => ({ AuthForm: () => null }));
import Home from '@/app/page';
import AuthPage from '@/app/auth/page';
beforeEach(() => {
  vi.clearAllMocks();
  mock.account.mockResolvedValue(null);
  mock.redirect.mockImplementation(() => { throw Error('redirect'); });
});
it('renders guest entry without loading a game context', async () => {
  expect(await Home()).toBeTruthy();
  expect(mock.redirect).not.toHaveBeenCalled();
});
it('sends an authenticated entry and ordinary login directly to the menu', async () => {
  mock.account.mockResolvedValue({ id: 'owner' });
  await expect(Home()).rejects.toThrow('redirect');
  await expect(AuthPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('redirect');
  expect(mock.redirect).toHaveBeenCalledWith('/menu');
});
it.each(['update', 'reset'])('keeps authenticated password %s accessible', async (mode) => {
  mock.account.mockResolvedValue({ id: 'owner' });
  expect(await AuthPage({ searchParams: Promise.resolve({ mode }) })).toBeTruthy();
  expect(mock.redirect).not.toHaveBeenCalled();
});
it('keeps callback errors visible instead of hiding them behind the menu', async () => {
  mock.account.mockResolvedValue({ id: 'owner' });
  expect(await AuthPage({ searchParams: Promise.resolve({ error: 'expired' }) })).toBeTruthy();
  expect(mock.redirect).not.toHaveBeenCalled();
});
