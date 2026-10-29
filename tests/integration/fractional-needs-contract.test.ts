import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import { createSaveFixture } from '../support/save-fixture.mjs';
const transport = vi.hoisted(() => ({
  fixture: null as Awaited<ReturnType<typeof createSaveFixture>> | null,
  calls: [] as string[],
}));
vi.mock('@/lib/supabase/server', () => ({
  serverClient: async (options?: { needsProtocol: true }) => ({
    auth: { getUser: async () => ({ data: { user: { id: transport.fixture!.ids.a } } }) },
    rpc: async (name: string, args?: Record<string, unknown>) => {
      transport.calls.push(name);
      try {
        return {
          data: await transport.fixture!.rpc(transport.fixture!.ids.a, name, args, {
            needsVersion: options?.needsProtocol ? '2' : null,
          }),
          error: null,
        };
      } catch (e) {
        const error = e as { message: string; code?: string };
        return { data: null, error };
      }
    },
  }),
}));
import { GET, POST } from '@/app/api/baby/route';
import { babyApi } from '@/features/baby-care/persistence';
import { babyStateSchema, availableMinutes } from '@/features/baby-care/model';
import { loadedSaveSchema } from '@/features/game-saves/loading';
let f: Awaited<ReturnType<typeof createSaveFixture>>;
beforeAll(async () => {
  vi.stubEnv('POMINS_TEST_ELAPSED_NEEDS', '1');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://fixture.local');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'fixture-public-only');
  f = await createSaveFixture({ paidCare: true });
  transport.fixture = f;
  // Auth/HTTP transport is simulated; migrations, reads, purchases and ledger are real local SQL.
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    const req = new Request('http://localhost:3000' + input, {
      ...init,
      headers: {
        ...Object.fromEntries(new Headers(init?.headers)),
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
      },
    });
    return req.method === 'POST' ? POST(req) : GET(req);
  });
}, 60000);
afterAll(async () => {
  await f?.db.close();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const read = () => babyApi(f.ids.baby, undefined, f.ids.two);
const counts = async () =>
  (
    await f.db.query<{ balance: number; allocations: number; cares: number }>(
      "select (select sum(eligible_minutes-allocated_minutes) from public.focus_credits where user_id=$1) balance,(select count(*) from public.focus_allocations where user_id=$1) allocations,(select count(*) from public.game_events where user_id=$1 and kind='BabyCare') cares",
      [f.ids.a],
    )
  ).rows[0];
it('accepts historical integers through SQL, API, JSON and the frontend while migration is inactive', async () => {
  const raw = await f.rpc(
    f.ids.a,
    'baby_state_for_save',
    { p_save: f.ids.two, p_character: f.ids.baby },
    { needsVersion: null },
  );
  expect(raw.needs_clock.active).toBe(false);
  expect(babyStateSchema.parse(JSON.parse(JSON.stringify(raw))).stats.needs.satiety).toBe(75);
  expect((await read()).stats.needs.satiety).toBe(75);
});
it('accepts fractional server state after local activation without rewriting the baseline or balance', async () => {
  const before = await counts();
  await f.db.query(
    "update public.characters set born_at=clock_timestamp()-interval '4 hours' where id=$1",
    [f.ids.baby],
  );
  await f.db.exec(
    "update game_private.baby_need_rule_versions set effective_at=clock_timestamp()-interval '1 hour' where version=1;update game_private.baby_need_release set activation_at=(select effective_at from game_private.baby_need_rule_versions where version=1)",
  );
  const state = await read();
  expect(state.needs_clock?.active).toBe(true);
  expect(state.stats.needs.satiety).toBeCloseTo(72.5, 2);
  expect(state.stats.needs.hygiene).toBeCloseTo(73.5, 2);
  expect(state.character.needs).toEqual(state.stats.needs);
  expect(Object.values(state.stats.needs).some((value) => !Number.isInteger(value))).toBe(true);
  expect(
    (
      await f.db.query<{ needs: { satiety: number } }>(
        'select needs from public.characters where id=$1',
        [f.ids.baby],
      )
    ).rows[0].needs.satiety,
  ).toBe(75);
  expect(await counts()).toEqual(before);
});
it('debits exactly two minutes after decay, preserves fractional effects and replays without duplication', async () => {
  const before = await counts(),
    requestId = crypto.randomUUID();
  const intent = { requestId, characterId: f.ids.baby, activity: 'baby_feed' as const };
  const bought = await babyApi(f.ids.baby, intent, f.ids.two);
  expect(bought.receipt?.chargedMinutes).toBe(2);
  expect(availableMinutes(bought)).toBe(Number(before.balance) - 2);
  expect(bought.stats.needs.satiety).toBeCloseTo(96.5, 2);
  const snapshot = (
    await f.db.query<{
      effects_snapshot: {
        after: { needs: { satiety: number } };
        before: { needs: { satiety: number } };
      };
    }>('select effects_snapshot from public.focus_allocations where request_id=$1', [requestId])
  ).rows[0].effects_snapshot;
  expect(snapshot.after.needs.satiety - snapshot.before.needs.satiety).toBeCloseTo(24, 12);
  const after = await counts(),
    replay = await babyApi(f.ids.baby, intent, f.ids.two);
  expect(replay.receipt).toEqual(bought.receipt);
  expect(await counts()).toEqual(after);
  expect(Number(after.allocations)).toBe(Number(before.allocations) + 1);
  expect(Number(after.cares)).toBe(Number(before.cares) + 1);
  const reloaded = await read();
  expect(reloaded.stats.needs.satiety).toBeCloseTo(bought.stats.needs.satiety, 2);
  expect(availableMinutes(reloaded)).toBe(availableMinutes(bought));
  const save = loadedSaveSchema.parse(
    await f.rpc(f.ids.a, 'load_game_save', { p_save: f.ids.two }),
  );
  expect(
    save.characters.find((character) => character.id === f.ids.baby)?.needs?.satiety,
  ).toBeCloseTo(bought.stats.needs.satiety, 2);
});
it('rejects stale browser and stale deployment before a debit, preserving all focus sessions', async () => {
  const before = await counts(),
    sessions = (
      await f.db.query('select to_jsonb(f) state from public.focus_sessions f order by id')
    ).rows;
  const calls = transport.calls.length;
  const stale = await POST(
    new Request(
      'http://localhost:3000/api/baby?saveId=' + f.ids.two + '&characterId=' + f.ids.baby,
      {
        method: 'POST',
        headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          characterId: f.ids.baby,
          activity: 'baby_feed',
        }),
      },
    ),
  );
  expect(stale.status).toBe(426);
  expect(transport.calls).toHaveLength(calls);
  for (const needsVersion of [null, '1', '3']) {
    await expect(
      f.rpc(
        f.ids.a,
        'purchase_baby_care',
        {
          p_save: f.ids.two,
          p_payload: {
            requestId: crypto.randomUUID(),
            characterId: f.ids.baby,
            activity: 'baby_feed',
          },
        },
        { needsVersion },
      ),
    ).rejects.toThrow('NEEDS_CLIENT_UPDATE_REQUIRED');
    await expect(
      f.rpc(
        f.ids.a,
        'baby_state_for_save',
        { p_save: f.ids.two, p_character: f.ids.baby },
        { needsVersion },
      ),
    ).rejects.toThrow('NEEDS_CLIENT_UPDATE_REQUIRED');
  }
  expect(await counts()).toEqual(before);
  expect(
    (await f.db.query('select to_jsonb(f) state from public.focus_sessions f order by id')).rows,
  ).toEqual(sessions);
});
