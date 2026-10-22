import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase/server';
export async function GET(request: Request) {
  const url = new URL(request.url);
  // next start may expose its bind address (0.0.0.0) as request.url.
  const origin = new URL(process.env.NEXT_PUBLIC_APP_URL || url.origin).origin;
  const code = url.searchParams.get('code');
  const recovery = url.searchParams.get('next') === '/auth?mode=update';
  if (code) {
    const db = await serverClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(recovery ? '/auth?mode=update' : '/', origin));
  }
  return NextResponse.redirect(new URL('/auth?error=callback', origin));
}
