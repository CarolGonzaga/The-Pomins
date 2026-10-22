import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { createSaveFixture } from '../support/save-fixture.mjs';
import {
  validateLoadedSave,
  eligibleProtagonist,
  loadGameSave,
  saveStorageKey,
} from '../../src/features/game-saves/loading';
import type { SupabaseClient } from '@supabase/supabase-js';
let f: Awaited<ReturnType<typeof createSaveFixture>>;
beforeAll(async () => {
  f = await createSaveFixture();
});
afterAll(async () => f.db.close());
describe('explicit save loading and protagonist', () => {
  it('loads two worlds with isolated residents and global focus without mutating it', async () => {
    const { a, one, two, paused } = f.ids;
    const first = validateLoadedSave(await f.rpc(a, 'load_game_save', { p_save: one }), a, one),
      second = validateLoadedSave(await f.rpc(a, 'load_game_save', { p_save: two }), a, two);
    expect(first.characters.map((c) => c.name)).toEqual(['Aurora']);
    expect(second.characters.map((c) => c.name).sort()).toEqual(['Nina', 'Sol']);
    expect(first.memories).toHaveLength(0);
    expect(second.memories).toHaveLength(1);
    expect(second.memories[0].character_id).toBe(f.ids.baby);
    expect(second.events.every(e=>e.save_id===two)).toBe(true);
    expect(first.room.credits).toEqual(second.room.credits);
    expect(first.sessions.find((s) => s.id === paused)?.status).toBe('paused');
    expect(
      (
        await f.db.query('select status,validated_ms from public.focus_sessions where id=$1', [
          paused,
        ])
      ).rows[0],
    ).toEqual({ status: 'paused', validated_ms: 60000 });
  });
  it('rejects other owners, nonexistent and archived saves', async () => {
    await expect(f.rpc(f.ids.b, 'load_game_save', { p_save: f.ids.one })).rejects.toThrow();
    await expect(
      f.rpc(f.ids.a, 'load_game_save', { p_save: '99999999-0000-4000-8000-000000000009' }),
    ).rejects.toThrow();
    await f.db.query('update public.game_saves set archived_at=now() where id=$1', [f.ids.foreign]);
    await expect(f.rpc(f.ids.b, 'load_game_save', { p_save: f.ids.foreign })).rejects.toThrow();
  });
  it('rejects incompatible references even within one account', async () => {
    const x = await f.rpc(f.ids.a, 'load_game_save', { p_save: f.ids.two });
    expect(() =>
      validateLoadedSave(
        { ...x, household: { ...x.household, save_id: f.ids.one } },
        f.ids.a,
        f.ids.two,
      ),
    ).toThrow();
    expect(() =>
      validateLoadedSave(
        { ...x, characters: [{ ...x.characters[0], save_id: f.ids.one }] },
        f.ids.a,
        f.ids.two,
      ),
    ).toThrow();
    await expect(
      f.rpc(f.ids.a, 'select_save_protagonist', {
        p_save: f.ids.two,
        p_character: f.ids.adultOne,
        p_expected_revision: x.context.save.world_revision,
      }),
    ).rejects.toThrow();
  });
  it('rejects stale revisions and archived candidates before choosing',async()=>{
    const {a,two,adultTwo}=f.ids;
    const x=await f.rpc(a,'load_game_save',{p_save:two});
    await f.db.query('update public.characters set archived_at=now() where id=$1',[adultTwo]);
    await expect(f.rpc(a,'select_save_protagonist',{p_save:two,p_character:adultTwo,p_expected_revision:x.context.save.world_revision})).rejects.toThrow();
    await f.db.query('update public.characters set archived_at=null where id=$1',[adultTwo]);
    await expect(f.rpc(a,'select_save_protagonist',{p_save:two,p_character:adultTwo,p_expected_revision:x.context.save.world_revision})).rejects.toThrow();
  });
  it('selects explicitly, retries idempotently and restores on a fresh authenticated read', async () => {
    const { a, two, baby } = f.ids,
      x = await f.rpc(a, 'load_game_save', { p_save: two }),
      args = { p_save: two, p_character: baby, p_expected_revision: x.context.save.world_revision };
    const next = await f.rpc(a, 'select_save_protagonist', args);
    expect(next.save.protagonist_id).toBe(baby);
    const replay = await f.rpc(a, 'select_save_protagonist', args);
    expect(replay.save.world_revision).toBe(next.save.world_revision);
    const restored = await f.rpc(a, 'load_game_save', { p_save: two });
    expect(restored.context.save.protagonist_id).toBe(baby);
    expect(restored.characters).toHaveLength(2);
    expect(
      restored.events.filter((e: { kind: string }) => e.kind === 'ProtagonistSelected'),
    ).toHaveLength(1);
  });
  it('rejects changing a ready protagonist and stale selections without advancing balance', async () => {
    const { a, two, adultTwo } = f.ids,
      before = await f.rpc(a, 'load_game_save', { p_save: two });
    await expect(
      f.rpc(a, 'select_save_protagonist', {
        p_save: two,
        p_character: adultTwo,
        p_expected_revision: before.context.save.world_revision,
      }),
    ).rejects.toThrow();
    const after = await f.rpc(a, 'load_game_save', { p_save: two });
    expect(after.room.credits).toEqual(before.room.credits);
    expect(after.context.focus_revision).toBe(before.context.focus_revision);
  });
  it('does not trust a browser ID and namespaces transient state by owner/save', async () => {
    const db = {
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    } as unknown as SupabaseClient;
    await expect(loadGameSave(db, f.ids.one)).rejects.toMatchObject({ status: 401 });
    await expect(loadGameSave(db, 'bad')).rejects.toMatchObject({ status: 404 });
    expect(saveStorageKey(f.ids.a, f.ids.one, 'care')).not.toBe(
      saveStorageKey(f.ids.a, f.ids.two, 'care'),
    );
    const x = validateLoadedSave(
      await f.rpc(f.ids.a, 'load_game_save', { p_save: f.ids.two }),
      f.ids.a,
      f.ids.two,
    );
    expect(x.characters.every((c) => eligibleProtagonist(c, x.household.id))).toBe(true);
  });
});
