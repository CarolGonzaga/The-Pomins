import { beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), focus: vi.fn(), profile: vi.fn(), eq: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ serverClient: async () => ({ auth: { getUser: mock.getUser }, from: mock.from }) }));
import { GET } from '@/app/api/account/route';
beforeEach(() => {
  vi.clearAllMocks();
  mock.getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
  mock.focus.mockResolvedValue({ data: [{ status: 'paused' }], error: null });
  mock.profile.mockResolvedValue({ data: { is_public: false }, error: null });
  mock.from.mockImplementation((table: string) => ({ select: () => ({ eq: (key: string, value: string) => {
    mock.eq(table, key, value);
    return table === 'focus_sessions' ? { in: () => ({ limit: mock.focus }) } : { single: mock.profile };
  } }) }));
});
it('reads only the verified account status with private no-store caching', async () => {
  const result = await GET();
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual({ userId: 'owner', focus: 'paused', publicProfile: false });
  expect(result.headers.get('cache-control')).toBe('private, no-store');
  expect(mock.eq.mock.calls).toEqual([['focus_sessions', 'user_id', 'owner'], ['profiles', 'id', 'owner']]);
  expect(mock.from.mock.calls.map(([table]) => table)).toEqual(['focus_sessions', 'profiles']);
});
it('rejects anonymous access before reading any state', async () => {
  mock.getUser.mockResolvedValue({ data: { user: null }, error: null });
  expect((await GET()).status).toBe(401);
  expect(mock.from).not.toHaveBeenCalled();
});
it('fails closed when the focus check fails', async () => {
  mock.focus.mockResolvedValue({ data: null, error: { message: 'private' } });
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('private');
});
it('represents no existing focus without creating or recovering one', async () => {
  mock.focus.mockResolvedValue({ data: [], error: null });
  expect((await (await GET()).json()).focus).toBeNull();
});
