import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase/server';
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const recovery = url.searchParams.get('next') === '/auth?mode=update';
  if (code) {
    const db = await serverClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(new URL(recovery ? '/auth?mode=update' : '/', url.origin));
  }
  return NextResponse.redirect(new URL('/auth?error=callback', url.origin));
}
