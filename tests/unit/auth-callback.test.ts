import { afterEach, expect, it, vi } from 'vitest';

const { exchangeCodeForSession } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  serverClient: async () => ({ auth: { exchangeCodeForSession } }),
}));
import { GET } from '@/app/auth/callback/route';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

it('returns errors to the configured browser origin instead of the bind address', async () => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
  const response = await GET(new Request('http://0.0.0.0:3000/auth/callback?error=access_denied'));
  expect(response.headers.get('location')).toBe('http://localhost:3000/auth?error=callback');
  expect(exchangeCodeForSession).not.toHaveBeenCalled();
});

it.each([
  ['', '/menu'],
  ['&next=%2Fauth%3Fmode%3Dupdate', '/auth?mode=update'],
  ['&next=https%3A%2F%2Fexample.invalid', '/menu'],
])('keeps the allowed destination after a successful exchange: %s', async (query, path) => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://pomins.example');
  exchangeCodeForSession.mockResolvedValue({ error: null });
  const response = await GET(
    new Request(`http://0.0.0.0:3000/auth/callback?code=local-fixture${query}`),
  );
  expect(response.headers.get('location')).toBe(`https://pomins.example${path}`);
  expect(exchangeCodeForSession).toHaveBeenCalledWith('local-fixture');
});

it('handles a failed exchange without redirecting to an external next parameter', async () => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
  exchangeCodeForSession.mockResolvedValue({ error: { message: 'Invalid local fixture' } });
  const response = await GET(
    new Request('http://0.0.0.0:3000/auth/callback?code=local-fixture&next=//example.invalid'),
  );
  expect(response.headers.get('location')).toBe('http://localhost:3000/auth?error=callback');
});
