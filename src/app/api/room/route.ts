import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverClient } from '@/lib/supabase/server';
import { adultAppearanceSchema, allocationLineSchema } from '@/features/room/domain';
const command = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create'),
    payload: z.object({
      name: z.string().trim().min(2).max(32),
      appearance: adultAppearanceSchema,
    }),
  }),
  z.object({
    action: z.literal('appearance'),
    payload: z.object({ characterId: z.uuid(), appearance: adultAppearanceSchema }),
  }),
  z.object({
    action: z.literal('activity'),
    payload: z.object({ characterId: z.uuid(), activity: z.enum(['study', 'read', 'sleep']) }),
  }),
  z.object({
    action: z.literal('arrive'),
    payload: z.object({
      characterId: z.uuid(),
      activity: z.enum(['study', 'read', 'sleep']),
      revision: z.number().int().nonnegative(),
    }),
  }),
  z.object({
    action: z.literal('allocate'),
    payload: z.object({ requestId: z.uuid(), lines: z.array(allocationLineSchema).min(1).max(20) }),
  }),
]);
export async function POST(request: Request) {
  try {
    const origin = new URL(request.headers.get('origin') ?? '');
    if (
      origin.host !== request.headers.get('host') ||
      !['http:', 'https:'].includes(origin.protocol)
    )
      throw Error();
  } catch {
    return NextResponse.json({ error: 'Origem não autorizada.' }, { status: 403 });
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    return NextResponse.json(
      { error: 'Configure o Supabase para salvar na conta.' },
      { status: 503 },
    );
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'Entre novamente para continuar.' }, { status: 401 });
  let input;
  try {
    const raw = await request.text();
    if (raw.length > 12000) throw Error();
    input = command.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json(
      { error: 'Confira os dados do personagem e a distribuição.' },
      { status: 400 },
    );
  }
  const { data, error } = await db.rpc('room_command', {
    p_action: input.action,
    p_payload: input.payload,
  });
  if (error) {
    console.error('Room command', error.code, error.message);
    return NextResponse.json(
      {
        error:
          'Não foi possível salvar. O saldo pode ter mudado ou a atividade não está disponível. Recarregue e confira a conexão.',
        code: error.code,
      },
      { status: 409 },
    );
  }
  return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store' } });
}
export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Entre novamente.' }, { status: 401 });
  const { data, error } = await db.rpc('room_state');
  if (error)
    return NextResponse.json(
      { error: 'Aplique as migrações e confira a conexão.' },
      { status: 503 },
    );
  return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store' } });
}
