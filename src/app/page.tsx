import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAccount } from '@/features/preferences/server';
import { AuthForm } from '@/features/auth/auth-form';
export default async function Home() {
  if (await getAccount().catch(() => null)) redirect('/menu');
  return (
    <Suspense fallback={<main id="main">Carregando…</main>}>
      <AuthForm entry />
    </Suspense>
  );
}
