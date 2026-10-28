import { beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  serverClient: async () => ({ rpc: mock.rpc, auth: { getUser: mock.getUser } }),
}));
import { GET } from '../../src/app/api/continuity/route';
import { foundationRules } from '../../src/features/economy-foundation/model';
beforeEach(() => {
  mock.rpc.mockReset();
  mock.getUser.mockReset();
  mock.getUser.mockResolvedValue({ data: { user: { id: 'account-a' } } });
  mock.rpc.mockResolvedValue({
    data: {
      active: false,
      activation_at: null,
      server_now: '2030-01-01T00:00:00Z',
      rules_version: 1,
      rules: foundationRules,
      last_valid_focus: null,
      available_minutes: 4,
      care_offers: [],
    },
  });
});
it('authenticates, has no client owner/save input and calls only the existing read RPC', async () => {
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(mock.rpc).toHaveBeenCalledExactlyOnceWith('get_economy_foundation');
  expect(await response.json()).toMatchObject({ mode: 'informational', penalties_active: false });
});
it('rejects anonymous access before reading the ledger', async () => {
  mock.getUser.mockResolvedValue({ data: { user: null } });
  expect((await GET()).status).toBe(401);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it('fails closed on missing schema/network or unexpectedly activated foundation', async () => {
  mock.rpc.mockResolvedValue({ error: { message: 'private database detail' } });
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('private database detail');
});
