import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), getUser: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  serverClient: async () => ({ rpc: mock.rpc, from: mock.from, auth: { getUser: mock.getUser } }),
}));
import { POST as gamePost } from '@/app/api/game/route';
import { POST as roomPost, GET as roomGet } from '@/app/api/room/route';
import { GET as babyGet } from '@/app/api/baby/route';
const user = '10000000-0000-4000-8000-000000000001',
  saveId = '20000000-0000-4000-8000-000000000002',
  char = '30000000-0000-4000-8000-000000000003';
const context = {
  save: {
    id: saveId,
    user_id: user,
    name: 'Partida',
    protagonist_id: char,
    primary_household_id: '40000000-0000-4000-8000-000000000004',
    current_generation: 1,
    state: 'ready',
    format_version: 1,
    world_revision: 4,
    progression: {},
    created_at: '2026-10-22',
    last_used_at: null,
    archived_at: null,
    origin_save_id: null,
    origin_snapshot_id: null,
  },
  focus_revision: 2,
};
function response(data: unknown, error: unknown = null) {
  return Object.assign(Promise.resolve({ data, error }), { single: async () => ({ data, error }) });
}
function request(path: string, body?: unknown) {
  return new Request('http://localhost:3000' + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.test');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'public-test-fixture');
  mock.getUser.mockResolvedValue({ data: { user: { id: user } } });
  mock.rpc.mockImplementation((name: string) =>
    response(name === 'get_game_context' ? context : {}),
  );
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: char }, error: null }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.is.mockReturnValue(query);
  mock.from.mockReturnValue(query);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
describe('save-aware Next routes with simulated Auth/RPC transport', () => {
  it('passes explicit scope to room state and commands', async () => {
    expect((await roomGet(request('/api/room?saveId=' + saveId))).status).toBe(200);
    expect(mock.rpc).toHaveBeenCalledWith('room_state_for_save', { p_save: saveId });
    expect(
      (
        await roomPost(
          request('/api/room', {
            action: 'activity',
            saveId,
            payload: { characterId: char, activity: 'read' },
          }),
        )
      ).status,
    ).toBe(200);
    expect(mock.rpc).toHaveBeenCalledWith('room_command_for_save', {
      p_save: saveId,
      p_action: 'activity',
      p_payload: { characterId: char, activity: 'read' },
    });
  });
  it('never falls back to an unscoped write after a save ownership error', async () => {
    mock.rpc.mockImplementation(() => response(null, { code: 'P0001' }));
    expect(
      (
        await roomPost(
          request('/api/room', {
            action: 'activity',
            saveId,
            payload: { characterId: char, activity: 'read' },
          }),
        )
      ).status,
    ).toBe(409);
    expect(mock.rpc).toHaveBeenCalledTimes(1);
  });
  it('keeps the old endpoint bridge only while the context function is missing', async () => {
    mock.rpc.mockImplementation((name: string) =>
      name === 'get_game_context' ? response(null, { code: 'PGRST202' }) : response({}),
    );
    expect((await roomGet(request('/api/room'))).status).toBe(200);
    expect(mock.rpc).toHaveBeenCalledWith('room_state');
    mock.rpc.mockClear();
    expect((await roomGet(request('/api/room?saveId=' + saveId))).status).toBe(503);
    expect(mock.rpc).toHaveBeenCalledTimes(1);
  });
  it('routes baby reads to the exact save and character', async () => {
    expect((await babyGet(request(`/api/baby?characterId=${char}&saveId=${saveId}`))).status).toBe(
      200,
    );
    expect(mock.rpc).toHaveBeenCalledWith('baby_state_for_save', {
      p_save: saveId,
      p_character: char,
    });
  });
  it('resolves a legacy birth request inside its explicit context rather than the account default', async () => {
    expect(
      (await gamePost(request('/api/game', { kind: 'birth', saveId, memory: 'sky' }))).status,
    ).toBe(200);
    expect(mock.from.mock.results[0].value.eq).toHaveBeenCalledWith('save_id', saveId);
    expect(mock.rpc).toHaveBeenCalledWith('read_birth_for_save', {
      p_save: saveId,
      p_character: char,
      p_memory: 'sky',
    });
  });
  it('starts focus with explicit scope while heartbeat remains account/session scoped', async () => {
    const id = '50000000-0000-4000-8000-000000000005',
      clientId = '60000000-0000-4000-8000-000000000006';
    expect(
      (
        await gamePost(
          request('/api/game', {
            kind: 'focus',
            action: 'start',
            saveId,
            characterId: char,
            id,
            clientId,
            sequence: 0,
            minutes: 2,
          }),
        )
      ).status,
    ).toBe(200);
    expect(mock.rpc).toHaveBeenCalledWith(
      'start_save_focus',
      expect.objectContaining({ p_save: saveId, p_character: char, p_seconds: 120 }),
    );
    mock.rpc.mockClear();
    expect(
      (
        await gamePost(
          request('/api/game', { kind: 'focus', action: 'heartbeat', id, clientId, sequence: 1 }),
        )
      ).status,
    ).toBe(200);
    expect(mock.rpc).toHaveBeenCalledTimes(1);
    expect(mock.rpc).toHaveBeenCalledWith(
      'focus_command',
      expect.objectContaining({ p_action: 'heartbeat' }),
    );
  });
  it('rejects malformed save IDs and unsigned users before mutations', async () => {
    expect((await roomGet(request('/api/room?saveId=invalid'))).status).toBe(400);
    expect(mock.rpc).not.toHaveBeenCalled();
    mock.getUser.mockResolvedValue({ data: { user: null } });
    expect((await roomGet(request('/api/room?saveId=' + saveId))).status).toBe(401);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
});
