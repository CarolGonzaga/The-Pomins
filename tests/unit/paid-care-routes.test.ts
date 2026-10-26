import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
const mock = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn(), context: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  serverClient: async () => ({ rpc: mock.rpc, auth: { getUser: mock.getUser } }),
}));
vi.mock('@/features/game-saves/server', () => ({
  resolveGameContext: mock.context,
  SaveContextError: class extends Error {
    status = 403;
  },
}));
import { POST, GET } from '@/app/api/baby/route';
import { localCarePricing, careIntentSchema } from '@/features/baby-care/model';
const char = '10000000-0000-4000-8000-000000000001',
  save = '20000000-0000-4000-8000-000000000001',
  id = '30000000-0000-4000-8000-000000000001';
const input = { requestId: id, characterId: char, activity: 'baby_feed' };
function request(body?: unknown) {
  return new Request('http://localhost:3000/api/baby?saveId=' + save + '&characterId=' + char, {
    method: body ? 'POST' : 'GET',
    headers: {
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://fixture.test');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'fixture-public-only');
  mock.getUser.mockResolvedValue({ data: { user: { id } } });
  mock.context.mockResolvedValue({ save: { id: save } });
  mock.rpc.mockImplementation(async (name) => ({
    data: name === 'baby_care_catalog' ? localCarePricing : { character: { id: char } },
    error: null,
  }));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
describe('paid care API safety with simulated transport', () => {
  it('sends only intent and verified save to the server purchase RPC', async () => {
    expect((await POST(request(input))).status).toBe(200);
    expect(mock.rpc).toHaveBeenCalledWith('purchase_baby_care', { p_save: save, p_payload: input });
    expect(mock.rpc).not.toHaveBeenCalledWith('baby_care', expect.anything());
  });
  it('fails closed before any charge when the new migration is unavailable', async () => {
    mock.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });
    expect((await POST(request(input))).status).toBe(503);
    expect(mock.rpc).toHaveBeenCalledTimes(1);
    expect(mock.rpc).toHaveBeenCalledWith('baby_care_catalog');
  });
  it('retains read-only baby state and free previews when catalog is missing', async () => {
    mock.rpc.mockImplementation(async (name) =>
      name === 'baby_care_catalog'
        ? { data: null, error: { code: 'PGRST202' } }
        : { data: { character: { id: char } }, error: null },
    );
    const r = await GET(request());
    expect(r.status).toBe(200);
    expect((await r.json()).data.care_pricing).toBeNull();
  });
  for (const extra of [{ minutes: 1 }, { price: 0 }, { offerVersion: 1 }, { userId: id }])
    it('rejects client charge fields ' + Object.keys(extra)[0], async () => {
      expect(careIntentSchema.safeParse({ ...input, ...extra }).success).toBe(false);
      expect((await POST(request({ ...input, ...extra }))).status).toBe(400);
      expect(mock.rpc).not.toHaveBeenCalled();
    });
  it('returns a definitive insufficient balance error without fallback to old charging', async () => {
    mock.rpc.mockImplementation(async (name) =>
      name === 'baby_care_catalog'
        ? { data: localCarePricing, error: null }
        : { data: null, error: { code: 'P0001', message: 'Insufficient minutes' } },
    );
    const r = await POST(request(input));
    expect(r.status).toBe(409);
    expect((await r.json()).error).toMatch(/2 minutos/);
    expect(mock.rpc).toHaveBeenCalledTimes(2);
  });
  it('preserves ambiguous network failures as retryable with the original request ID', async () => {
    mock.rpc.mockImplementation(async (name) =>
      name === 'baby_care_catalog'
        ? { data: localCarePricing, error: null }
        : { data: null, error: { code: '', message: 'fetch failed' } },
    );
    expect((await POST(request(input))).status).toBe(503);
  });
  it('rejects unauthenticated access before invoking catalog or spending', async () => {
    mock.getUser.mockResolvedValue({ data: { user: null } });
    expect((await POST(request(input))).status).toBe(401);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
});
