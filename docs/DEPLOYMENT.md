# Publicação na Vercel e Supabase

## Atualização da Entrega 4A

`supabase/migrations/20261022021139_baby_care.sql` foi aplicada ao desenvolvimento após autorização, na versão atribuída pelo servidor `20261022021139`. Reutiliza os créditos existentes para cuidados, com novas RPCs e configuração protegida por RLS. Em projetos novos, aplicar depois das duas migrações anteriores; no desenvolvimento, não reaplicar. O lote inicial continua mapeando dois arquivos locais e precisa de reconciliação antes de `db push`. Recibo: `deployments/2026-10-21-baby-care.json`; detalhes e limitações: `BABY_CARE.md`. Nenhuma implantação pública foi feita.


**Etapa 1 de 21/10:** a base contém a fundação e `supabase/migrations/202610210001_playable_room.sql`, que preserva personagens/histórico antigos e cria residência, adulto LPC, créditos e alocações. O protótipo fica em `/play`; não há novas chaves ou serviços de runtime. Antes de aplicar qualquer arquivo, conferir esquema e histórico, apresentar as migrações realmente pendentes e obter autorização. Consultar `SUPABASE_DEVELOPMENT_VALIDATION.md` e `PLAYABLE_ROOM.md`.

## Supabase

1. Criar projeto; obter URL e publishable key no painel. Nunca usar service role/secret como NEXT_PUBLIC.
2. Conferir catálogo e histórico e obter autorização para os arquivos pendentes; só então aplicá-los em ordem. Testar consultas como usuário comum; não testar RLS só no SQL Editor como postgres.
3. Habilitar e-mail/senha e confirmação de e-mail em Auth. Configurar Site URL HTTPS e allowlist de callbacks exatos para o domínio e desenvolvimento.
4. Redirecionamentos: `/auth/callback` e `/auth/callback?next=/auth?mode=update`. O destino seguinte é limitado pelo código a `/` ou à tela de redefinição; não aceita redirecionamento aberto.
5. Revisar limites de e-mail do plano gratuito. SMTP próprio é opcional e deve ser escolhido apenas se necessário; nenhum provedor pago é requisito do código.

## Vercel

1. Enviar o código ao repositório GitHub informado e importar no Vercel como Next.js (root do repositório).
2. Node.js 24; install `npm ci`; build `npm run build`.
3. Definir NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_APP_URL com domínio HTTPS. As variáveis públicas são incorporadas no build; redeploy ao alterar.
4. Garantir callbacks do domínio de produção no Supabase. `NEXT_PUBLIC_APP_URL` deve corresponder à origem pública usada pelo navegador: o callback usa essa origem para evitar retornar ao endereço interno de bind do Next. Previews devem usar allowlist deliberada e configuração correspondente; evitar curingas amplos desnecessários.
5. Abrir a publicação e executar cadastro/confirmação/login/recuperação, criação, foco real de dois minutos, pausa/recarga/retomada e conclusão única.
6. Instalar no Safari e completar `IOS_TEST_CHECKLIST.md`.

Na validação de desenvolvimento de 21/10/2026, URL/chave pública foram configuradas e as duas migrações foram autorizadas e aplicadas pela integração Supabase no lote `20261021201224`. Esquema, histórico, jornada autenticada e 11 grupos remotos com duas contas foram conferidos conforme `SUPABASE_DEVELOPMENT_VALIDATION.md`. O lote remoto contém os dois arquivos locais: reconciliar esse mapeamento antes de usar a CLI para migrações futuras, sem reaplicação cega. Não há publicação Vercel ou URL pública criada nesta tarefa. O servidor local acessível por IP via HTTP não oferece as mesmas capacidades de segurança/PWA de uma publicação HTTPS; `localhost` é a exceção de desenvolvimento.

## PWA e atualização

Service worker guarda somente assets estáticos explícitos, ícones e chunks públicos. Navegações usam rede com fallback offline; API, Auth, RSC e respostas pessoais não são cacheadas. Sem conexão, não se geram intervalos/recompensas. Uma nova instalação espera; aviso permite aplicar a atualização quando não há foco ativo. Não trocar o app no meio da sessão. Ao atualizar assets mude `CACHE` em `public/sw.js`. HTTPS é obrigatório para instalação e Wake Lock fora de localhost.
