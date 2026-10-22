# pomins.

**Entrega 5D — gerenciador de partidas (local):** `/saves` e `/saves/new`, criação idempotente com residência independente, retomada do nascimento, arquivamento reversível e foco global preservado. **211 testes locais aprovados** (160 + 11 nativos + 40 navegador), lint, TypeScript e build aprovados. Migração `20261022202113_save_manager.sql` aplicada ao desenvolvimento após autorização, backup/restauração de 44 tabelas e preflight. Oito grupos de testes reais aprovados; duas histórias de teste preservadas como arquivadas. Disponível em http://localhost:3000/saves, com sessão pausada e dados anteriores preservados. Sem commit/push. [Implementação, arquivos, plano e limitações](docs/SAVE_MANAGER.md).

**Entrega 5C — contexto explícito:** `/game/[saveId]`, carregamento autorizado e seleção idempotente de protagonista reutilizam bebê/nascimento e adulto LPC/Phaser. 182 testes locais, lint, TypeScript e build aprovados. **Migração 5C aplicada ao desenvolvimento após autorização e backup/restauração de 44 tabelas**, com sete grupos de Auth/RLS/SSR real aprovados. Servidor atualizado em http://localhost:3000 após reinício controlado, com sessão pausada preservada e sete grupos reais repetidos. O protagonista pendente continua aguardando escolha do jogador. Consolidação local autorizada, sem push. [Relatório e execução dos testes](docs/EXPLICIT_GAME_CONTEXT.md).

**Entrega 5A + 5B — base de partidas (22/10/2026):** saves com vínculos por proprietário/residência/personagem e contexto interno em `/` e `/play`, mantendo a interface existente e o saldo global. **Migração aplicada ao desenvolvimento após autorização, backup cifrado e restauração validada de 42 tabelas**, preservando os dados anteriores e a sessão pausada. 164 testes locais e seis grupos remotos com Auth/SSR real aprovados; lint, TypeScript e build aprovados. Consolidação local autorizada, com nova rodada de 164 testes e comparação do esquema remoto; sem push. Relatório e limites: [GAME_SAVES_FOUNDATION](docs/GAME_SAVES_FOUNDATION.md).

**Entrega 4A — cuidados do bebê:** em **Meu Pomin**, seis reações gratuitas e registro opcional de cuidados com os mesmos minutos de foco do quarto. Necessidades, histórico e prontidão configurável para crescer, sem deterioração por ausência. O nascimento e o adulto LPC foram preservados. A [migração](supabase/migrations/20261022021139_baby_care.sql) foi aplicada no desenvolvimento após autorização; 133 testes locais aprovados e isolamento/restauração inicial conferidos com Auth real. Um cuidado remoto com minutos e Safari/iPhone físico ainda precisam de validação. Veja [BABY_CARE](docs/BABY_CARE.md).

**Entrega 3 técnica — personalização LPC:** o adulto de `/play` tem 7 penteados, 3 cortes de camisa e cores personalizáveis de pele, cabelo, olhos, camisa e calça. Prévia e Phaser compartilham a composição nas poses em pé, caminhada e sentado. Aparência salva/restaurada no Supabase real; 109 testes locais, lint, TypeScript e build aprovados nesta entrega. Sem migração ou dependência nova. Outras fases e alienígenas LPC aguardam arte compatível; o nascimento anterior permanece disponível. Veja [CHARACTER_VISUALS](docs/CHARACTER_VISUALS.md) e [resultados atuais](docs/TEST_RESULTS.md).

**Supabase de desenvolvimento validado:** migrações autorizadas, Auth/recovery, adulto LPC, foco real, distribuição e restauração após novo login conferidos. Duas contas aprovaram 11 grupos de testes remotos de isolamento, repetição, rollback, concorrência e controle da sessão. Conta A: 4 minutos elegíveis, 2 distribuídos e 2 disponíveis; conta B: progresso e saldo próprios zerados. Consulte [SUPABASE_DEVELOPMENT_VALIDATION](docs/SUPABASE_DEVELOPMENT_VALIDATION.md) para evidências, limites e o mapeamento do lote remoto antes de novas migrações. Validação em iPhone físico e produção HTTPS ainda necessária.

**Atualização de 21/10/2026 — Etapa 1 jogável:** abra **`/play`** para criar um adulto LPC, escolher estudar/ler/dormir, observar a caminhada automática pelo quarto e distribuir os minutos de sessões concluídas. O fluxo de bebê e nascimento em `/` foi preservado. A nova especificação em `docs/specs/` passa a orientar o jogo 2D em pixel art.

Leia [PLAYABLE_ROOM](docs/PLAYABLE_ROOM.md) para arquitetura, migração adicional, execução, testes e limites, e [LPC_ASSETS](docs/LPC_ASSETS.md) para as fontes/atribuições dos sprites. **Projetos Supabase existentes precisam aplicar `202610210001_playable_room.sql` após a migração de fundação.** Sem backend, a exploração local continua explicitamente separada do progresso na conta.

**Seu foco. As histórias deles.** / Your focus. Their stories.

Crie. Viva. Continue. Pomins é o aplicativo; **The Pomins** é o universo narrativo. Cada personagem é um Pomin.

Esta é a implementação inicial da **Entrega 1**, desenvolvida a partir de um repositório vazio. Não inclui a vida completa da Entrega 2 nem o universo social da Entrega 3.

## Executar

Requer Node.js 24 LTS e npm.

A versão de referência está em `.nvmrc` (Node 24.14.0), com npm 11.9.0 indicado em `package.json`. Consulte [a consolidação da base](docs/BASELINE_CONSOLIDATION.md) para as verificações desta entrega e suas limitações.

```sh
npm ci
npm run dev
```

Abra http://localhost:3000. Sem configuração externa, a exploração local permite criar humano/alienígena, personalizar o bebê, ler o nascimento, guardar a primeira memória e experimentar o temporizador. **Exploração local não concede XP e não simula autenticação.** O personagem e a memória ficam neste navegador; sessões locais não sobrevivem ao recarregamento.

## Conectar o backend real

1. Crie um projeto gratuito no Supabase.
2. Copie `.env.example` para `.env.local` e preencha a URL do projeto e a **publishable key**. Nenhuma service role é necessária.
3. Aplique, em ordem e apenas se ainda não aplicadas, `supabase/migrations/202610160001_foundation.sql`, `supabase/migrations/202610210001_playable_room.sql` e `supabase/migrations/20261022021139_baby_care.sql`. No desenvolvimento atual, as duas primeiras estão no lote `20261021201224` e a terceira já foi aplicada. Confira/reconcilie o histórico antes de executar SQL ou `supabase db push`; não reaplique esses arquivos nesse projeto.
4. Em Authentication, habilite e-mail/senha e confirmação de e-mail. Defina a Site URL e autorize `http://localhost:3000/auth/callback` e `https://seu-dominio/auth/callback`, incluindo a variante de recuperação com `?next=/auth?mode=update`.
5. Reinicie o servidor. Crie uma conta, confirme o e-mail e entre. O personagem da exploração local não é importado automaticamente para a conta.

O backend valida intervalos e concede recompensas em transação. As tarefas são privadas e há uma única sessão de foco aberta por usuário. O fluxo antigo limita o personagem legado ativo; o modelo LPC possui moradores vinculados à família. Consulte [DEPLOYMENT](docs/DEPLOYMENT.md) antes de publicar.

## Verificação

```sh
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Para verificar o build em produção, execute `npm run build` e depois os E2E com `POMINS_TEST_SERVER_MODE=production`. No PowerShell: `$env:POMINS_TEST_SERVER_MODE='production'; npm run test:e2e`. `POMINS_TEST_PORT` permite escolher uma porta livre; os testes usam contextos de navegador isolados. O CI inclui lint e E2E em produção.

`npm test` usa PostgreSQL real em WASM (PGlite), com um esquema Auth mínimo **somente nos testes**, para executar migração, RLS e RPCs. Não exige um Supabase de produção. Os testes E2E exploram a interface sem backend; não substituem os testes reais de e-mail/SSR nem os testes físicos no iPhone.

## O que já existe

- App Router, React, TypeScript strict, Tailwind e botão com primitivas shadcn/Radix.
- Interface em português, temas claro/escuro, layout responsivo, safe areas, redução de movimento.
- Cadastro, login, confirmação por PKCE, recuperação/redefinição, logout e exclusão de conta integrados ao Supabase.
- Humano/alienígena, oito tons por espécie, cabelos, olhos, mantas, acessórios, antenas e marcas por camadas SVG originais.
- Nascimento com duas primeiras memórias, persistência e escolhas idempotentes.
- Foco estrito: 2/5/10/15/25/50 min e personalizado até 120; primeiro passo, pausa automática, retomada manual, heartbeats de 5s, lease por aba, recuperação e expiração em 24h.
- Tempo do servidor, recompensas atômicas e únicas, limite diário de 240 minutos premiados, histórico recente e XP.
- Manifest, ícones PNG/maskable/apple-touch, service worker, fallback offline e aviso de atualização.

**Pendências de ativação:** credenciais, aplicação da migração no projeto Supabase, testes de e-mail/SSR em ambiente real, publicação HTTPS e validação física de Safari/PWA/Wake Lock. Consulte [IMPLEMENTATION_STATUS](docs/IMPLEMENTATION_STATUS.md).

## Próximas entregas

**Entrega 2 — Primeira vida completa:** motor narrativo declarativo versionado, capítulos, NPCs, afinidade, marcos de idade e aparência por fase, carreira, família opcional, herança e sucessão. **Entrega 3 — Universo social e expansão:** amizades, perfis, rankings/ligas/temporadas, desafios, novas histórias e cosméticos. Não há telas com rankings ou relações inventadas nesta versão.

Documentação: [arquitetura](docs/ARCHITECTURE.md), [banco](docs/DATABASE.md), [foco](docs/FOCUS_ENGINE.md), [segurança](docs/SECURITY.md), [direção de arte](docs/ART_DIRECTION.md), [iPhone](docs/IOS_TEST_CHECKLIST.md).

Referências técnicas consultadas: [Next.js 16](https://nextjs.org/docs/app/guides/upgrading/version-16), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [publishable keys](https://supabase.com/docs/guides/api/api-keys).
