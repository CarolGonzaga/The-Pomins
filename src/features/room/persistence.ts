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
export type RoomCommand = (
  | { action: 'create'; payload: { name: string; appearance: AdultAppearance } }
  | { action: 'appearance'; payload: { characterId: string; appearance: AdultAppearance } }
  | { action: 'activity'; payload: { characterId: string; activity: keyof typeof activities } }
  | {
      action: 'arrive';
      payload: { characterId: string; activity: keyof typeof activities; revision: number };
    }
  | { action: 'allocate'; payload: { requestId: string; lines: AllocationLine[] } }
) & { saveId?: string };
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
      save_id: localSaveId(),
      world_revision: 0,
      focus_revision: 0,
      household: { id: 'local-household', name: 'Casa em Vila Aurora' },
      residents: [],
      credits: [],
      allocations: [],
      historical_ms: 0,
    },
    requests: {},
  };
}
function localSaveId() {
  const key = 'pomins-local-save-id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}
function load(): LocalSave {
  const raw = localStorage.getItem(STORAGE);
  if (!raw) return fresh();
  const parsed = JSON.parse(raw);
  const state = roomStateSchema.parse(parsed.state);
  // Add context without replacing the original save on read. Existing request signatures stay intact.
  state.save_id ??= localSaveId();
  state.world_revision ??= state.revision;
  state.focus_revision ??= 0;
  state.residents = state.residents.map((resident) => ({ ...resident, save_id: state.save_id }));
  state.allocations = state.allocations.map((line) => ({ ...line, save_id: state.save_id }));
  return {
    version: 1,
    state,
    requests: parsed.requests ?? {},
    babyCare: parsed.babyCare,
  };
}
export function loadLocalRoom() {
  return load().state;
}
export async function localTransaction(
  update: (save: LocalSave) => void,
  scope: 'world' | 'focus' | 'both' = 'world',
) {
  const run = () => {
    const save = load();
    const before = JSON.stringify(save);
    update(save);
    if (JSON.stringify(save) === before) return save.state;
    if (scope !== 'focus')
      save.state.world_revision = (save.state.world_revision ?? save.state.revision) + 1;
    if (scope !== 'world') save.state.focus_revision = (save.state.focus_revision ?? 0) + 1;
    save.state.revision =
      (save.state.world_revision ?? save.state.revision) + (save.state.focus_revision ?? 0);
    localStorage.setItem(STORAGE, JSON.stringify(save));
    return save.state;
  };
  return navigator.locks ? navigator.locks.request(STORAGE, run) : run();
}
export async function localCommand(command: RoomCommand) {
  return localTransaction(
    (save) => {
      const state = save.state;
      if (command.saveId && command.saveId !== state.save_id) throw Error('Partida incompatível.');
      const p = command.payload;
      if (command.action === 'create') {
        if (state.residents.length) return;
        const draft = command.payload;
        const resident: Resident = {
          id: crypto.randomUUID(),
          save_id: state.save_id,
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
            (line.saveId !== undefined && line.saveId !== state.save_id) ||
            index < 0 ||
            !Number.isInteger(line.minutes) ||
            line.minutes < 1 ||
            line.minutes > 120 ||
            credit.eligible_minutes - credit.allocated_minutes < line.minutes
          )
            throw Error('Não há minutos disponíveis para essa distribuição.');
          state.residents[index] = applyProgress(
            state.residents[index],
            line.activity,
            line.minutes,
          );
          credit.allocated_minutes += line.minutes;
          state.allocations.unshift({
            save_id: state.save_id,
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
    },
    command.action === 'allocate' ? 'both' : 'world',
  );
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
  }, 'focus');
}
export class RoomRejected extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function roomApi(command: RoomCommand, saveId?: string) {
  if (command.saveId && saveId && command.saveId !== saveId)
    throw new RoomRejected('O pedido pertence a outra partida.', 400);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch('/api/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...command, saveId: command.saveId ?? saveId }),
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
export async function refreshRoom(saveId?: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(
      saveId ? `/api/room?saveId=${encodeURIComponent(saveId)}` : '/api/room',
      { cache: 'no-store', signal: controller.signal },
    );
    const result = await response.json();
    if (!response.ok) throw Error(result.error ?? 'Não foi possível carregar.');
    return roomStateSchema.parse(result.data);
  } finally {
    clearTimeout(timer);
  }
}
