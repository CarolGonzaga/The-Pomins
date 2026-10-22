import {
  activities,
  applyProgress,
  emptySkills,
  initialNeeds,
  roomStateSchema,
  type AdultAppearance,
  type AllocationLine,
  type Resident,
  type RoomState,
  adultAppearanceSchema,
} from './domain';
import type { FocusSession } from '../focus-engine/model';
export type RoomCommand =
  | { action: 'create'; payload: { name: string; appearance: AdultAppearance } }
  | { action: 'appearance'; payload: { characterId: string; appearance: AdultAppearance } }
  | { action: 'activity'; payload: { characterId: string; activity: keyof typeof activities } }
  | {
      action: 'arrive';
      payload: { characterId: string; activity: keyof typeof activities; revision: number };
    }
  | { action: 'allocate'; payload: { requestId: string; lines: AllocationLine[] } };
const STORAGE = 'pomins-room-local-v1';
export type LocalSave = {
  version: 1;
  state: RoomState;
  requests: Record<string, string>;
  babyCare?: Record<string, unknown>;
};
function fresh(): LocalSave {
  return {
    version: 1,
    state: {
      revision: 0,
      household: { id: 'local-household', name: 'Casa em Vila Aurora' },
      residents: [],
      credits: [],
      allocations: [],
      historical_ms: 0,
    },
    requests: {},
  };
}
function load(): LocalSave {
  const raw = localStorage.getItem(STORAGE);
  if (!raw) return fresh();
  const parsed = JSON.parse(raw);
  return {
    version: 1,
    state: roomStateSchema.parse(parsed.state),
    requests: parsed.requests ?? {},
    babyCare: parsed.babyCare,
  };
}
export function loadLocalRoom() {
  return load().state;
}
export async function localTransaction(update: (save: LocalSave) => void) {
  const run = () => {
    const save = load();
    update(save);
    save.state.revision++;
    localStorage.setItem(STORAGE, JSON.stringify(save));
    return save.state;
  };
  return navigator.locks ? navigator.locks.request(STORAGE, run) : run();
}
export async function localCommand(command: RoomCommand) {
  return localTransaction((save) => {
    const state = save.state;
    const p = command.payload;
    if (command.action === 'create') {
      if (state.residents.length) return;
      const draft = command.payload;
      const resident: Resident = {
        id: crypto.randomUUID(),
        household_id: state.household.id,
        name: draft.name.trim(),
        life_stage: 'adult',
        appearance: adultAppearanceSchema.parse(draft.appearance),
        needs: initialNeeds(),
        skills: emptySkills(),
        relationships: [],
        current_activity: null,
        animation_state: 'idle',
        position: { x: 7, y: 8 },
        activity_revision: 0,
        progress_minutes: 0,
        render_system: 'lpc',
      };
      if (resident.name.length < 2 || resident.name.length > 32)
        throw Error('Escolha um nome entre 2 e 32 caracteres.');
      state.residents.push(resident);
    } else if (command.action === 'allocate') {
      const signature = JSON.stringify(command.payload);
      const previous = save.requests[command.payload.requestId];
      if (previous) {
        if (previous !== signature) throw Error('Este pedido já foi utilizado.');
        return;
      }
      if (command.payload.lines.length < 1 || command.payload.lines.length > 20)
        throw Error('Revise as distribuições.');
      for (const line of command.payload.lines) {
        const credit = state.credits.find((c) => c.session_id === line.sessionId);
        const index = state.residents.findIndex((c) => c.id === line.characterId);
        if (
          !credit ||
          index < 0 ||
          !Number.isInteger(line.minutes) ||
          line.minutes < 1 ||
          line.minutes > 120 ||
          credit.eligible_minutes - credit.allocated_minutes < line.minutes
        )
          throw Error('Não há minutos disponíveis para essa distribuição.');
        state.residents[index] = applyProgress(state.residents[index], line.activity, line.minutes);
        credit.allocated_minutes += line.minutes;
        state.allocations.unshift({
          id: crypto.randomUUID(),
          session_id: credit.session_id,
          character_id: line.characterId,
          activity_id: line.activity,
          minutes: line.minutes,
          created_at: new Date().toISOString(),
        });
      }
      save.requests[command.payload.requestId] = signature;
    } else {
      const index = state.residents.findIndex(
        (c) => c.id === ('characterId' in p ? p.characterId : ''),
      );
      if (index < 0) throw Error('Personagem não encontrado.');
      const resident = state.residents[index];
      if (command.action === 'appearance')
        resident.appearance = adultAppearanceSchema.parse(command.payload.appearance);
      else {
        const activity = activities[command.payload.activity];
        if (!activity.stages.includes(resident.life_stage))
          throw Error('Atividade indisponível nesta fase.');
        if (command.action === 'activity') {
          resident.current_activity = activity.id;
          resident.animation_state = 'walking';
          resident.activity_revision++;
        } else if (
          resident.activity_revision === command.payload.revision &&
          resident.current_activity === command.payload.activity
        ) {
          resident.position = { ...activity.destination };
          resident.animation_state = activity.state;
        }
      }
    }
  });
}
export async function localSessionCompleted(session: FocusSession) {
  return localTransaction((save) => {
    if (save.state.credits.some((c) => c.session_id === session.id)) return;
    if (
      session.status !== 'completed' ||
      session.validated_ms < session.planned_seconds * 1000 ||
      session.planned_seconds < 120
    )
      throw Error('A sessão ainda não foi concluída.');
    save.state.credits.unshift({
      session_id: session.id,
      eligible_minutes: Math.floor(session.validated_ms / 60000),
      allocated_minutes: 0,
      created_at: new Date().toISOString(),
    });
    save.state.historical_ms += session.validated_ms;
  });
}
export class RoomRejected extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function roomApi(command: RoomCommand) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch('/api/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
      signal: controller.signal,
      cache: 'no-store',
    });
    const result = await response.json();
    if (!response.ok)
      throw new RoomRejected(result.error ?? 'Não foi possível salvar.', response.status);
    return roomStateSchema.parse(result.data);
  } finally {
    clearTimeout(timer);
  }
}
export async function refreshRoom() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch('/api/room', { cache: 'no-store', signal: controller.signal });
    const result = await response.json();
    if (!response.ok) throw Error(result.error ?? 'Não foi possível carregar.');
    return roomStateSchema.parse(result.data);
  } finally {
    clearTimeout(timer);
  }
}
