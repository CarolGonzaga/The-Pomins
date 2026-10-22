import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverClient } from '@/lib/supabase/server';
import { careCommandSchema } from '@/features/baby-care/model';
const headers = { 'Cache-Control': 'private, no-store' };
async function execute(request: Request, write: boolean) {
  if (write) {
    try {
      const origin = new URL(request.headers.get('origin') ?? '');
      if (
        origin.host !== request.headers.get('host') ||
        !['http:', 'https:'].includes(origin.protocol)
      )
        throw Error();
    } catch {
      return NextResponse.json({ error: 'Origem não autorizada.' }, { status: 403, headers });
    }
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    return NextResponse.json(
      { error: 'Configure o Supabase para salvar na conta.' },
      { status: 503, headers },
    );
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: 'Entre novamente para cuidar do seu Pomin.' },
      { status: 401, headers },
    );
  let id: string;
  let command;
  try {
    id = z.uuid().parse(new URL(request.url).searchParams.get('characterId'));
    if (write) {
      const raw = await request.text();
      if (raw.length > 12000) throw Error();
      command = careCommandSchema.parse(JSON.parse(raw));
      if (command.characterId !== id) throw Error();
    }
  } catch {
    return NextResponse.json(
      { error: 'Revise o bebê e os minutos escolhidos.' },
      { status: 400, headers },
    );
  }
  const { data, error } = command
    ? await db.rpc('baby_care', { p_payload: command })
    : await db.rpc('baby_state', { p_character: id });
  if (error)
    return NextResponse.json(
      {
        error: command
          ? 'O cuidado não foi confirmado. Confira o saldo e tente novamente com o mesmo pedido.'
          : 'Os cuidados na conta ainda não estão disponíveis. Confira a conexão e a aplicação autorizada da migração de cuidados.',
      },
      { status: command ? 409 : 503, headers },
    );
  return NextResponse.json({ data }, { headers });
}
export const GET = (request: Request) => execute(request, false);
export const POST = (request: Request) => execute(request, true);
