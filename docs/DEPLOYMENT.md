# Publicação na Vercel e Supabase

**Etapa 1 de 21/10:** após a migração de fundação, aplicar também `supabase/migrations/202610210001_playable_room.sql`. Ela preserva os personagens/histórico antigos e cria a residência, o adulto LPC, os créditos e as alocações. O protótipo fica em `/play`; não há novas chaves ou serviços de runtime. Consultar `PLAYABLE_ROOM.md` antes de atualizar um projeto existente.

## Supabase

1. Criar projeto; obter URL e publishable key no painel. Nunca usar service role/secret como NEXT_PUBLIC.
2. Aplicar a migração inicial (e futuras em ordem). Testar consultas como usuário comum; não testar RLS só no SQL Editor como postgres.
3. Habilitar e-mail/senha e confirmação de e-mail em Auth. Configurar Site URL HTTPS e allowlist de callbacks exatos para o domínio e desenvolvimento.
4. Redirecionamentos: `/auth/callback` e `/auth/callback?next=/auth?mode=update`. O destino seguinte é limitado pelo código a `/` ou à tela de redefinição; não aceita redirecionamento aberto.
5. Revisar limites de e-mail do plano gratuito. SMTP próprio é opcional e deve ser escolhido apenas se necessário; nenhum provedor pago é requisito do código.

## Vercel

1. Enviar o código ao repositório GitHub informado e importar no Vercel como Next.js (root do repositório).
2. Node.js 24; install `npm ci`; build `npm run build`.
3. Definir NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_APP_URL com domínio HTTPS. As variáveis públicas são incorporadas no build; redeploy ao alterar.
4. Garantir callbacks do domínio de produção no Supabase. Previews devem usar allowlist deliberada; evitar curingas amplos desnecessários.
5. Abrir a publicação e executar cadastro/confirmação/login/recuperação, criação, foco real de dois minutos, pausa/recarga/retomada e conclusão única.
6. Instalar no Safari e completar `IOS_TEST_CHECKLIST.md`.

Não existe projeto Supabase/Vercel conectado ou URL pública criada nesta entrega local. Não há credenciais inventadas. O servidor local acessível por IP via HTTP não oferece as mesmas capacidades de segurança/PWA de uma publicação HTTPS; `localhost` é a exceção de desenvolvimento.

## PWA e atualização

Service worker guarda somente assets estáticos explícitos, ícones e chunks públicos. Navegações usam rede com fallback offline; API, Auth, RSC e respostas pessoais não são cacheadas. Sem conexão, não se geram intervalos/recompensas. Uma nova instalação espera; aviso permite aplicar a atualização quando não há foco ativo. Não trocar o app no meio da sessão. Ao atualizar assets mude `CACHE` em `public/sw.js`. HTTPS é obrigatório para instalação e Wake Lock fora de localhost.
