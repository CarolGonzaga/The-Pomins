import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { gameSaveSchema, isCurrentSnapshot } from '../../src/features/game-saves/model';
import { resolveGameContext } from '../../src/features/game-saves/server';
import {
  localCommand,
  loadLocalRoom,
  localSessionCompleted,
} from '../../src/features/room/persistence';
import { defaultAdultAppearance } from '../../src/features/room/domain';
import type { FocusSession } from '../../src/features/focus-engine/model';
import { randomUUID } from 'node:crypto';

const save = {
  id: randomUUID(),
  user_id: randomUUID(),
  name: 'Minha partida',
  protagonist_id: randomUUID(),
  primary_household_id: randomUUID(),
  current_generation: 1,
  state: 'ready',
  format_version: 1,
  world_revision: 3,
  progression: {},
  created_at: '2026-10-22T00:00:00Z',
  last_used_at: null,
  archived_at: null,
  origin_save_id: null,
  origin_snapshot_id: null,
};
function db(response: unknown) {
  return { rpc: vi.fn().mockResolvedValue(response) } as unknown as Pick<SupabaseClient, 'rpc'>;
}
function storage() {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
  });
  vi.stubGlobal('navigator', {});
  return data;
}
afterEach(() => vi.unstubAllGlobals());
describe('save contracts and explicit compatibility negotiation', () => {
  it('allows pending migration selection but never a ready save without a protagonist', () => {
    expect(gameSaveSchema.safeParse(save).success).toBe(true);
    expect(gameSaveSchema.safeParse({ ...save, protagonist_id: null }).success).toBe(false);
    expect(
      gameSaveSchema.safeParse({ ...save, state: 'pending_selection', protagonist_id: null })
        .success,
    ).toBe(true);
    expect(gameSaveSchema.safeParse({ ...save, origin_snapshot_id: randomUUID() }).success).toBe(
      false,
    );
  });
  it('supports the old schema only on a missing context function and no explicit slot', async () => {
    const old = db({ data: null, error: { code: 'PGRST202' } });
    expect(await resolveGameContext(old)).toBeNull();
    await expect(resolveGameContext(old, save.id)).rejects.toMatchObject({ status: 503 });
  });
  it.each(['42501', 'P0001', 'PGRST301'])(
    'does not downgrade permission/ownership/Auth errors: %s',
    async (code) => {
      await expect(resolveGameContext(db({ data: null, error: { code } }))).rejects.toThrow();
    },
  );
  it('rejects malformed, archived, mismatched and disconnected contexts', async () => {
    await expect(resolveGameContext(db({ data: {}, error: null }))).rejects.toThrow();
    await expect(
      resolveGameContext(
        db({
          data: { save: { ...save, archived_at: '2026-10-22' }, focus_revision: 0 },
          error: null,
        }),
        save.id,
      ),
    ).rejects.toThrow();
    await expect(
      resolveGameContext(db({ data: { save, focus_revision: 0 }, error: null }), randomUUID()),
    ).rejects.toThrow();
    const offline = { rpc: vi.fn().mockRejectedValue(Error('offline')) } as unknown as Pick<
      SupabaseClient,
      'rpc'
    >;
    await expect(resolveGameContext(offline)).rejects.toMatchObject({ status: 503 });
  });
  it('keeps the validated explicit save and both independent revisions', async () => {
    const client = db({ data: { save, focus_revision: 5 }, error: null });
    expect((await resolveGameContext(client, save.id))?.save.id).toBe(save.id);
    expect(client.rpc).toHaveBeenCalledWith('get_game_context', { p_save: save.id });
    const current = { revision: 3, save_id: save.id, world_revision: 3, focus_revision: 5 };
    expect(isCurrentSnapshot(current, { ...current, focus_revision: 4 })).toBe(false);
    expect(isCurrentSnapshot(current, { ...current, world_revision: 2, focus_revision: 6 })).toBe(
      false,
    );
    expect(isCurrentSnapshot(current, { ...current, save_id: randomUUID() })).toBe(false);
    expect(isCurrentSnapshot(current, { ...current, focus_revision: 6 })).toBe(true);
  });
  it('adds a stable context to an old guest save without writing over it on read', async () => {
    const data = storage();
    await localCommand({
      action: 'create',
      payload: { name: 'Lumi', appearance: defaultAdultAppearance },
    });
    const old = JSON.parse(data.get('pomins-room-local-v1')!);
    delete old.state.save_id;
    delete old.state.world_revision;
    delete old.state.focus_revision;
    old.state.residents.forEach((r: Record<string, unknown>) => delete r.save_id);
    old.requests = { original: '{"requestId":"old-intent"}' };
    old.babyCare = { kept: { needs: { affection: 87 } } };
    data.set('pomins-room-local-v1', JSON.stringify(old));
    data.delete('pomins-local-save-id');
    const original = data.get('pomins-room-local-v1');
    const first = loadLocalRoom(),
      again = loadLocalRoom();
    expect(first.save_id).toBe(again.save_id);
    expect(first.residents[0].id).toBe(old.state.residents[0].id);
    expect(first.residents[0].appearance).toEqual(defaultAdultAppearance);
    expect(data.get('pomins-room-local-v1')).toBe(original);
    await localCommand({
      action: 'appearance',
      payload: { characterId: first.residents[0].id, appearance: defaultAdultAppearance },
    });
    const upgraded = JSON.parse(data.get('pomins-room-local-v1')!);
    expect(upgraded.requests).toEqual(old.requests);
    expect(upgraded.babyCare).toEqual(old.babyCare);
  });
  it('separates guest focus/world revisions and never retargets a scoped pending allocation', async () => {
    storage();
    await localCommand({
      action: 'create',
      payload: { name: 'Lumi', appearance: defaultAdultAppearance },
    });
    const first = loadLocalRoom();
    const id = randomUUID();
    const session = {
      id,
      status: 'completed',
      validated_ms: 120000,
      planned_seconds: 120,
    } as FocusSession;
    await localSessionCompleted(session);
    const credited = loadLocalRoom();
    expect(credited.world_revision).toBe(first.world_revision);
    expect(credited.focus_revision).toBe(1);
    await localSessionCompleted(session);
    expect(loadLocalRoom()).toEqual(credited);
    const command = {
      action: 'allocate' as const,
      saveId: credited.save_id,
      payload: {
        requestId: randomUUID(),
        lines: [
          {
            sessionId: id,
            characterId: credited.residents[0].id,
            activity: 'study' as const,
            minutes: 1,
          },
        ],
      },
    };
    await expect(localCommand({ ...command, saveId: randomUUID() })).rejects.toThrow();
    expect(loadLocalRoom()).toEqual(credited);
    await localCommand(command);
    const spent = loadLocalRoom();
    expect(spent.focus_revision).toBe(2);
    expect(spent.world_revision).toBeGreaterThan(credited.world_revision!);
    await localCommand(command);
    expect(loadLocalRoom()).toEqual(spent);
  });
});
