import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverClient } from '@/lib/supabase/server';
import { loadGameSave } from '@/features/game-saves/loading';
import { SaveContextError } from '@/features/game-saves/server';
const headers = { 'Cache-Control': 'private, no-store' };
type Context = { params: Promise<{ saveId: string }> };
export async function GET(_: Request, { params }: Context) {
  try {
    const result = await loadGameSave(await serverClient(), (await params).saveId);
    return NextResponse.json(result, { headers });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof SaveContextError ? e.message : 'Não foi possível carregar a partida.' },
      { status: e instanceof SaveContextError ? e.status : 503, headers },
    );
  }
}
export async function POST(request: Request, { params }: Context) {
  let sameOrigin=false;
  try { const origin=new URL(request.headers.get('origin')??''); sameOrigin=origin.host===request.headers.get('host') && ['http:','https:'].includes(origin.protocol); } catch {}
  if (!sameOrigin)
    return NextResponse.json({ error: 'Origem não autorizada.' }, { status: 403, headers });
  try {
    const saveId = z.uuid().parse((await params).saveId),
      raw = await request.text();
    if (raw.length > 2000) throw Error();
    const input = z
      .object({ characterId: z.uuid(), expectedRevision: z.number().int().nonnegative() })
      .strict()
      .parse(JSON.parse(raw));
    const db = await serverClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Entre novamente.' }, { status: 401, headers });
    const r = await db.rpc('select_save_protagonist', {
      p_save: saveId,
      p_character: input.characterId,
      p_expected_revision: input.expectedRevision,
    });
    if (r.error)
      return NextResponse.json(
        {
          error:
            r.error.code === 'PGRST202'
              ? 'A seleção de protagonista aguarda a atualização do banco.'
              : 'A escolha não foi salva. Recarregue para conferir a revisão atual.',
        },
        { status: r.error.code === 'PGRST202' ? 503 : 409, headers },
      );
    return NextResponse.json({ data: r.data }, { headers });
  } catch {
    return NextResponse.json(
      { error: 'Revise a partida e o personagem.' },
      { status: 400, headers },
    );
  }
}
