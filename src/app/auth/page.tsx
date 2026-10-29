import { Suspense } from 'react';
import { AuthForm } from '@/features/auth/auth-form';
import { getAccount } from '@/features/preferences/server';
import { redirect } from 'next/navigation';
export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; error?: string }>;
}) {
  const params = await searchParams;
  if (
    params.mode !== 'update' &&
    params.mode !== 'reset' &&
    !params.error &&
    (await getAccount().catch(() => null))
  )
    redirect('/menu');
  return (
    <Suspense
      fallback={
        <main id="main" className="auth-page">
          Preparando sua chegada…
        </main>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
