import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverClient } from '@/lib/supabase/server';
import { careInputSchema, carePricingSchema } from '@/features/baby-care/model';
import { resolveGameContext, SaveContextError } from '@/features/game-saves/server';
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
  let context;
  try {
    id = z.uuid().parse(new URL(request.url).searchParams.get('characterId'));
    const saveId = new URL(request.url).searchParams.get('saveId') ?? undefined;
    context = await resolveGameContext(db, saveId);
    if (write) {
      const raw = await request.text();
      if (raw.length > 12000) throw Error();
      command = careInputSchema.parse(JSON.parse(raw));
      if (command.characterId !== id) throw Error();
    }
  } catch (e) {
    if (e instanceof SaveContextError)
      return NextResponse.json({ error: e.message }, { status: e.status, headers });
    return NextResponse.json(
      { error: 'Revise o bebê e o cuidado escolhido. O preço é definido pelo servidor.' },
      { status: 400, headers },
    );
  }
  const catalog = await db.rpc('baby_care_catalog');
  const pricing = catalog.error ? null : carePricingSchema.safeParse(catalog.data);
  if (command && (!context || !pricing || !pricing.success))
    return NextResponse.json(
      {
        error:
          'Os cuidados pagos ainda não estão disponíveis. A atualização do servidor é necessária; nenhum minuto foi gasto.',
      },
      { status: 503, headers },
    );
  const { data, error } = command
    ? await db.rpc('lines' in command ? 'baby_care_for_save' : 'purchase_baby_care', {
        p_save: context!.save.id,
        p_payload: command,
      })
    : context
      ? await db.rpc('baby_state_for_save', { p_save: context.save.id, p_character: id })
      : await db.rpc('baby_state', { p_character: id });
  if (error)
    return NextResponse.json(
      {
        error: command
          ? error.message?.includes('Insufficient minutes')
            ? 'São necessários 2 minutos disponíveis. Inicie uma sessão de foco ou experimente a reação gratuita.'
            : 'O cuidado não foi confirmado. Confira o saldo e tente novamente com o mesmo pedido.'
          : 'Os cuidados na conta ainda não estão disponíveis. Confira a conexão e a aplicação autorizada da migração de cuidados.',
      },
      { status: command && /^(P0001|22|23)/.test(error.code ?? '') ? 409 : 503, headers },
    );
  return NextResponse.json(
    { data: { ...data, care_pricing: pricing && pricing.success ? pricing.data : null } },
    { headers },
  );
}
export const GET = (request: Request) => execute(request, false);
export const POST = (request: Request) => execute(request, true);
