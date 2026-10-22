import type { Character } from '../character-creator/model';
import { loadLocalRoom, localTransaction, type LocalSave } from '../room/persistence';
import {
  applyCare,
  babyStateSchema,
  babyStatsSchema,
  careCommandSchema,
  defaultCareRules,
  initialBabyStats,
  type BabyState,
  type CareCommand,
} from './model';

function statsFor(save: LocalSave, id: string) {
  return babyStatsSchema.parse(save.babyCare?.[id] ?? initialBabyStats());
}
export function loadLocalBaby(character: Character): BabyState {
  const room = loadLocalRoom();
  // Same save/ledger as /play. No second balance and no offline elapsed-time effects.
  const raw = localStorage.getItem('pomins-room-local-v1');
  const save = raw ? (JSON.parse(raw) as LocalSave) : null;
  return babyStateSchema.parse({
    revision: room.revision,
    household_id: room.household.id,
    character,
    stats: save ? statsFor(save, character.id) : initialBabyStats(),
    rules: defaultCareRules,
    credits: room.credits,
  });
}
export async function localCare(character: Character, input: CareCommand) {
  const command = careCommandSchema.parse(input);
  if (command.characterId !== character.id) throw Error('Bebê não encontrado.');
  await localTransaction((save) => {
    const signature = JSON.stringify({ babyCare: command });
    const previous = save.requests[command.requestId];
    if (previous) {
      if (previous !== signature) throw Error('Este pedido já foi utilizado.');
      return;
    }
    let total = 0;
    for (const [index, line] of command.lines.entries()) {
      const credit = save.state.credits.find((c) => c.session_id === line.sessionId);
      if (!credit || credit.eligible_minutes - credit.allocated_minutes < line.minutes)
        throw Error('Não há minutos disponíveis para esse cuidado.');
      credit.allocated_minutes += line.minutes;
      total += line.minutes;
      save.state.allocations.unshift({
        id: `${command.requestId}-${index}`,
        character_id: character.id,
        session_id: line.sessionId,
        activity_id: command.activity,
        minutes: line.minutes,
        created_at: new Date().toISOString(),
      });
    }
    const stats = applyCare(statsFor(save, character.id), command.activity, total);
    stats.history.unshift({
      id: command.requestId,
      activity: command.activity,
      minutes: total,
      created_at: new Date().toISOString(),
      rules_version: defaultCareRules.version,
    });
    save.babyCare = { ...save.babyCare, [character.id]: stats };
    save.requests[command.requestId] = signature;
  });
  return loadLocalBaby(character);
}
export class CareRejected extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function babyApi(characterId: string, command?: CareCommand): Promise<BabyState> {
  const response = await fetch(`/api/baby?characterId=${encodeURIComponent(characterId)}`, {
    method: command ? 'POST' : 'GET',
    headers: command ? { 'Content-Type': 'application/json' } : undefined,
    body: command ? JSON.stringify(careCommandSchema.parse(command)) : undefined,
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
