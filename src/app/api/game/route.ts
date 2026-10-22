import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverClient } from '@/lib/supabase/server';
import { characterSchema } from '@/features/character-creator/model';
import { resolveGameContext, SaveContextError } from '@/features/game-saves/server';
const focusSchema = z.object({
  action: z.enum(['start', 'heartbeat', 'pause', 'resume', 'cancel', 'complete', 'recover']),
  id: z.uuid(),
  clientId: z.uuid(),
  sequence: z.number().int().min(0).max(100000),
  minutes: z.number().int().min(2).max(120).optional(),
  task: z.string().trim().max(160).optional(),
  firstStep: z.string().trim().max(160).optional(),
  residentId: z.uuid().optional(),
  characterId: z.uuid().optional(),
  saveId: z.uuid().optional(),
});
export async function POST(request: Request) {
  let sameOrigin = false;
  try {
    const origin = new URL(request.headers.get('origin') ?? '');
    sameOrigin =
      origin.host === request.headers.get('host') && ['http:', 'https:'].includes(origin.protocol);
  } catch {}
  if (!sameOrigin) return NextResponse.json({ error: 'Origem não autorizada.' }, { status: 403 });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    return NextResponse.json({ error: 'O Supabase ainda não foi configurado.' }, { status: 503 });
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'Entre novamente para continuar.' }, { status: 401 });
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 8000) throw Error();
    body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error();
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }
  let result;
  let context;
  try {
    // Heartbeats and recovery remain account/session scoped, including pre-migration sessions.
    if (
      body.kind === 'character' ||
      body.kind === 'birth' ||
      (body.kind === 'focus' && body.action === 'start')
    )
      context = await resolveGameContext(db, z.uuid().optional().parse(body.saveId));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof SaveContextError ? e.message : 'Partida inválida.' },
      { status: e instanceof SaveContextError ? e.status : 400 },
    );
  }
  if (body.kind === 'character') {
    const parsed = characterSchema.safeParse(body.character);
    if (!parsed.success)
      return NextResponse.json({ error: 'Revise o nome e a aparência.' }, { status: 400 });
    result = context
      ? await db
          .rpc('create_character_for_save', {
            p_save: context.save.id,
            p_name: parsed.data.name,
            p_appearance: parsed.data.appearance,
          })
          .single()
      : await db
          .rpc('create_character', {
            p_name: parsed.data.name,
            p_appearance: parsed.data.appearance,
          })
          .single();
  } else if (body.kind === 'birth') {
    const parsed = z
      .object({ memory: z.enum(['sky', 'home']), characterId: z.uuid().optional() })
      .safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Memória inválida.' }, { status: 400 });
    if (context) {
      let characterId = parsed.data.characterId;
      if (!characterId) {
        const legacy = await db
          .from('characters')
          .select('id')
          .eq('user_id', user.id)
          .eq('save_id', context.save.id)
          .eq('render_system', 'legacy')
          .is('archived_at', null)
          .maybeSingle();
        if (legacy.error || !legacy.data)
          return NextResponse.json(
            { error: 'Informe o personagem desta partida.' },
            { status: 409 },
          );
        characterId = legacy.data.id;
      }
      result = await db
        .rpc('read_birth_for_save', {
          p_save: context.save.id,
          p_character: characterId,
          p_memory: parsed.data.memory,
        })
        .single();
    } else result = await db.rpc('read_birth', { p_memory: parsed.data.memory }).single();
  } else if (body.kind === 'focus') {
    const parsed = focusSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Sessão inválida.' }, { status: 400 });
    const a = parsed.data;
    if (a.action === 'start' && context) {
      let characterId = a.residentId ?? a.characterId;
      if (!characterId) {
        const legacy = await db
          .from('characters')
          .select('id')
          .eq('user_id', user.id)
          .eq('save_id', context.save.id)
          .eq('render_system', 'legacy')
          .is('archived_at', null)
          .maybeSingle();
        if (legacy.error || !legacy.data)
          return NextResponse.json(
            { error: 'Informe o personagem desta partida.' },
            { status: 409 },
          );
        characterId = legacy.data.id;
      }
      result = await db
        .rpc('start_save_focus', {
          p_save: context.save.id,
          p_id: a.id,
          p_client: a.clientId,
          p_character: characterId,
          p_seconds: (a.minutes ?? 25) * 60,
          p_task: a.task ?? '',
          p_step: a.firstStep ?? '',
        })
        .single();
    } else if (a.action === 'start' && a.residentId) {
      result = await db
        .rpc('start_resident_focus', {
          p_id: a.id,
          p_client: a.clientId,
          p_character: a.residentId,
          p_seconds: (a.minutes ?? 25) * 60,
          p_task: a.task ?? '',
          p_step: a.firstStep ?? '',
        })
        .single();
    } else {
      result = await db
        .rpc('focus_command', {
          p_action: a.action,
          p_id: a.id,
          p_client: a.clientId,
          p_sequence: a.sequence,
          p_seconds: (a.minutes ?? 25) * 60,
          p_task: a.task ?? '',
          p_step: a.firstStep ?? '',
        })
        .single();
    }
  } else if (body.kind === 'privacy' && typeof body.public === 'boolean') {
    result = await db
      .from('profiles')
      .update({ is_public: body.public })
      .eq('id', user.id)
      .select()
      .single();
  } else if (body.kind === 'delete' && body.confirmation === 'EXCLUIR') {
    result = await db.rpc('delete_my_account');
    if (!result.error) await db.auth.signOut();
  } else return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
  if (result.error) {
    console.error('Pomins RPC:', result.error.code, result.error.message);
    return NextResponse.json(
      {
        error:
          'Não foi possível salvar. Confira sua conexão e se as migrações foram aplicadas. Uma sessão aberta em outra aba precisa ser recuperada.',
        code: result.error.code,
      },
      { status: 409 },
    );
  }
  return NextResponse.json({ data: result.data }, { headers: { 'Cache-Control': 'no-store' } });
}
