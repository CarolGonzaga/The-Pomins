import { getContinuity } from '@/features/continuity/server';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET() {
  try {
    return Response.json(await getContinuity(), { headers });
  } catch (error) {
    // Do not leak RPC details or session identifiers. Auth is checked by service/RPC.
    return Response.json(
      { error: 'Entre na conta e confira a conexão para consultar a constância.' },
      {
        status: error instanceof Error && error.message === 'Autenticação necessária.' ? 401 : 503,
        headers,
      },
    );
  }
}
