import { Suspense } from 'react';
import { AuthForm } from '@/features/auth/auth-form';
export default function AuthPage() {
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
