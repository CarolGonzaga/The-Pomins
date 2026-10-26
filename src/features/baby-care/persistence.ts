import type { Character } from '../character-creator/model';
import { loadLocalRoom, localTransaction, type LocalSave } from '../room/persistence';
import {
  applyCare,
  babyStateSchema,
  babyStatsSchema,
  careInputSchema,
  defaultCareRules,
  initialBabyStats,
  localCarePricing,
  type BabyState,
  type CareInput,
} from './model';
function statsFor(save: LocalSave, id: string) {
  return babyStatsSchema.parse(save.babyCare?.[id] ?? initialBabyStats());
}
export function loadLocalBaby(character: Character): BabyState {
  const room = loadLocalRoom(),
    raw = localStorage.getItem('pomins-room-local-v1'),
    save = raw ? (JSON.parse(raw) as LocalSave) : null;
  return babyStateSchema.parse({
    save_id: room.save_id,
    world_revision: room.world_revision,
    focus_revision: room.focus_revision,
    revision: room.revision,
    household_id: room.household.id,
    character: { ...character, save_id: room.save_id },
    stats: save ? statsFor(save, character.id) : initialBabyStats(),
    rules: defaultCareRules,
    credits: room.credits,
    care_pricing: localCarePricing,
  });
}
export async function localCare(character: Character, input: CareInput) {
  const command = careInputSchema.parse(input);
  if (command.characterId !== character.id) throw Error('Bebê não encontrado.');
  let receipt: BabyState['receipt'];
  await localTransaction((save) => {
    if (character.save_id && character.save_id !== save.state.save_id)
      throw Error('O bebê pertence a outra partida.');
    const previous = save.requests[command.requestId];
    if ('lines' in command) {
      if (previous === JSON.stringify({ babyCare: command })) return;
      throw Error('Pedido antigo não registrado. Use um cuidado de 2 minutos.');
    }
    if (previous) {
      const saved = JSON.parse(previous);
      if (JSON.stringify(saved.paidCare) !== JSON.stringify(command))
        throw Error('Este pedido já foi utilizado.');
      receipt = saved.receipt;
      return;
    }
    const balance = save.state.credits.reduce(
      (sum, c) => sum + c.eligible_minutes - c.allocated_minutes,
      0,
    );
    if (balance < 2) throw Error('Não há minutos disponíveis. São necessários 2 minutos.');
    let left = 2;
    const sources: NonNullable<BabyState['receipt']>['sources'] = [];
    for (const credit of [...save.state.credits].sort(
      (a, b) =>
        a.created_at.localeCompare(b.created_at) || a.session_id.localeCompare(b.session_id),
    )) {
      const minutes = Math.min(left, credit.eligible_minutes - credit.allocated_minutes);
      if (minutes <= 0) continue;
      credit.allocated_minutes += minutes;
      const id = `${command.requestId}-${sources.length}`;
      save.state.allocations.unshift({
        save_id: save.state.save_id,
        id,
        character_id: character.id,
        session_id: credit.session_id,
        activity_id: command.activity,
        minutes,
        created_at: new Date().toISOString(),
      });
      sources.push({ sessionId: credit.session_id, minutes, allocationId: id });
      left -= minutes;
      if (!left) break;
    }
    if (left) throw Error('Não há minutos disponíveis.');
    const stats = applyCare(statsFor(save, character.id), command.activity, 2);
    stats.history.unshift({
      id: command.requestId,
      activity: command.activity,
      minutes: 2,
      created_at: new Date().toISOString(),
      rules_version: defaultCareRules.version,
    });
    save.babyCare = { ...save.babyCare, [character.id]: stats };
    receipt = {
      purchaseId: crypto.randomUUID(),
      requestId: command.requestId,
      saveId: save.state.save_id!,
      characterId: character.id,
      activity: command.activity,
      offerVersion: 2,
      chargedMinutes: 2,
      balanceAfter: balance - 2,
      sources,
      createdAt: new Date().toISOString(),
    };
    save.requests[command.requestId] = JSON.stringify({ paidCare: command, receipt });
  }, 'both');
  return babyStateSchema.parse({ ...loadLocalBaby(character), ...(receipt ? { receipt } : {}) });
}
export class CareRejected extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function babyApi(
  characterId: string,
  command?: CareInput,
  saveId?: string,
): Promise<BabyState> {
  const scope = saveId ? `&saveId=${encodeURIComponent(saveId)}` : '';
  const response = await fetch(`/api/baby?characterId=${encodeURIComponent(characterId)}${scope}`, {
    method: command ? 'POST' : 'GET',
    headers: command ? { 'Content-Type': 'application/json' } : undefined,
    body: command ? JSON.stringify(careInputSchema.parse(command)) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  });
  const result = await response.json();
  if (!response.ok)
    throw new CareRejected(
      result.error ?? 'Não foi possível carregar os cuidados.',
      response.status,
    );
  return babyStateSchema.parse(result.data);
}
