'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { browserClient, isConfigured } from '@/lib/supabase/browser';
import { Nursery } from '@/components/characters/nursery';
import { authErrorMessage } from './error-message';
import {loginDestination} from '../preferences/model';
const schema = z.object({
  email: z.email('Digite um e-mail válido.'),
  password: z.string(),
  confirm: z.string(),
  nickname: z.string(),
});
type Fields = z.infer<typeof schema>;
export function AuthForm() {
  const params = useSearchParams();
  const [mode, setMode] = useState(params.get('mode') === 'update' ? 'update' : 'login');
  const [message, setMessage] = useState(
    params.get('error') ? 'Este link expirou ou já foi utilizado. Solicite um novo.' : '',
  );
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Fields>({
    resolver: zodResolver(mode === 'update' ? schema.extend({ email: z.string() }) : schema),
    defaultValues: { email: '', password: '', confirm: '', nickname: '' },
  });
  const submit = handleSubmit(async (values) => {
    setMessage('');
    if (!isConfigured()) {
      setMessage(
        'A conexão com o Supabase ainda não está configurada. Você pode explorar o aplicativo sem conta.',
      );
      return;
    }
    if (mode !== 'reset' && values.password.length < 8) {
      setMessage('Use uma senha com pelo menos 8 caracteres.');
      return;
    }
    if ((mode === 'signup' || mode === 'update') && values.password !== values.confirm) {
      setMessage('As senhas precisam ser iguais.');
      return;
    }
    if (mode === 'signup' && !/^[a-zA-Z0-9_]{3,24}$/.test(values.nickname)) {
      setMessage('O apelido deve ter de 3 a 24 letras, números ou sublinhado.');
      return;
    }
    setBusy(true);
    try {
      const db = browserClient();
      const origin = location.origin;
      let error;
      if (mode === 'signup')
        ({ error } = await db.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: { nickname: values.nickname.toLowerCase() },
            emailRedirectTo: `${origin}/auth/callback`,
          },
        }));
      else if (mode === 'reset')
        ({ error } = await db.auth.resetPasswordForEmail(values.email, {
          redirectTo: `${origin}/auth/callback?next=/auth?mode=update`,
        }));
      else if (mode === 'update')
        ({ error } = await db.auth.updateUser({ password: values.password }));
      else
        ({ error } = await db.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        }));
      if (error) {
        setMessage(authErrorMessage(mode, error));
      } else if (mode === 'login' || mode === 'update') {
        const next=params.get('next');
        location.assign(loginDestination(mode==='login'?next:null));
      }
      else
        setMessage(
          mode === 'signup'
            ? 'Confira seu e-mail para confirmar a conta. Depois, volte para entrar.'
            : 'Se existir uma conta com esse e-mail, enviaremos um link de recuperação.',
        );
    } catch {
      setMessage('Não foi possível conectar. Tente novamente.');
    } finally {
      setBusy(false);
    }
  });
  return (
    <main id="main" className="auth-page">
      <Link href="/" className="back-link">
        <ArrowLeft size={18} /> Voltar ao Pomins
      </Link>
      <div className="auth-grid">
        <div className="auth-story">
          <span className="brand">
            pomins<span>.</span>
          </span>
          <h1>
            Um pequeno foco.
            <br />
            <em>Infinitas histórias.</em>
          </h1>
          <Nursery />
          <p>Seu tempo abre espaço para uma vida florescer.</p>
        </div>
        <section className="auth-card">
          <p className="eyebrow">SEU PRÓXIMO COMEÇO</p>
          <h2>
            {mode === 'signup'
              ? 'Vamos criar sua conta?'
              : mode === 'reset'
                ? 'Um caminho de volta.'
                : mode === 'update'
                  ? 'Sua nova senha.'
                  : 'Que bom ter você aqui.'}
          </h2>
          <p className="muted">
            {mode === 'login'
              ? 'Entre para continuar sua história de onde parou.'
              : 'Um passo de cada vez. Seu Pomin espera por você.'}
          </p>
          <form onSubmit={submit} noValidate>
            {mode !== 'update' && (
              <label>
                E-mail
                <input autoComplete="email" type="email" aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'auth-email-error' : undefined} {...register('email')} />
              </label>
            )}
            {errors.email && <p id="auth-email-error" className="field-error" role="alert">{errors.email.message}</p>}
            {mode === 'signup' && (
              <label>
                Apelido público
                <input autoComplete="nickname" maxLength={24} {...register('nickname')} />
                <small>Letras, números e sublinhado. Seu e-mail fica privado.</small>
              </label>
            )}
            {mode !== 'reset' && (
              <label>
                Senha
                <input
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  {...register('password')}
                />
              </label>
            )}
            {(mode === 'signup' || mode === 'update') && (
              <label>
                Confirme a senha
                <input type="password" autoComplete="new-password" {...register('confirm')} />
              </label>
            )}
            {message && (
              <p className="form-message" role="status">
                {message}
              </p>
            )}
            <Button disabled={busy} type="submit">
              {busy
                ? 'Um instante…'
                : mode === 'login'
                  ? 'Entrar na minha história'
                  : mode === 'signup'
                    ? 'Criar conta'
                    : mode === 'reset'
                      ? 'Enviar link'
                      : 'Salvar nova senha'}
            </Button>
          </form>
          {mode === 'login' && (
            <button
              className="text-button"
              onClick={() => {
                setMode('reset');
                setMessage('');
              }}
            >
              Esqueci minha senha
            </button>
          )}
          <div className="auth-switch">
            {mode === 'signup' ? 'Já tem uma conta?' : 'Ainda não tem conta?'}{' '}
            <button
              onClick={() => {
                setMode(mode === 'signup' ? 'login' : 'signup');
                setMessage('');
              }}
            >
              {mode === 'signup' ? 'Entrar' : 'Começar minha história'}
            </button>
          </div>
          {!isConfigured() && (
            <p className="small-note">
              Ambiente sem conexão com o Supabase. O cadastro fica disponível após a configuração.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
