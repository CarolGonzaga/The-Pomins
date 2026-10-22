# Entrega 5A + 5B — partidas e compatibilidade

Implementação de 22/10/2026 sobre `6bbf3aa67d715a05318c45a27dc81fb2e7e8096d`, branch `codex/consolidacao-base`. **Migração aplicada ao desenvolvimento após autorização, backup e restauração comprovados.** Consolidação local autorizada em `feat: add game saves foundation and compatibility`, sem push. Nenhuma sessão de foco real foi interrompida.

## Consolidação Git — 22/10/2026

Rodada nova: 125 testes de unidade/integração, sete de concorrência PostgreSQL e 32 de navegador aprovados (**164 distintos**); lint, TypeScript e build aprovados. Produção e TypeScript conferidos na cópia isolada para preservar o servidor da porta 3000. Não foram repetidos logins ou gastos no Supabase nesta consolidação.

Nova conferência remota somente de leitura: o SQL armazenado no histórico da versão `20261022134830` corresponde exatamente ao arquivo local. Backup cifrado, chave DPAPI e manifesto foram preservados e usados em nova restauração local. O catálogo dessa restauração com a migração aplicada coincide com o remoto: 136 colunas, 107 constraints, 38 índices, 17 políticas, 32 funções, nove triggers e acesso/RLS de 16 tabelas. `NOT NULL` foi comparado pela nulabilidade das colunas, pois PostgreSQL 18 também o representa em `pg_constraint`, diferentemente do remoto 17. Nenhuma alteração remota foi necessária. Uma sessão pausada preservada.

Credenciais/valores privados e padrões de tokens conferidos antes do commit; `.env` privados, backups, chave cifrada, manifesto e auxiliares continuam ignorados. Migrações anteriores intactas. Recibo da rodada: [2026-10-22-game-saves-consolidation.json](deployments/2026-10-22-game-saves-consolidation.json). Limites continuam: Safari físico, cuidado pago remoto nesta versão, backup portátil/off-site e seleção futura de protagonista/slots.

## Aplicação no desenvolvimento — resultado efetivo

Versão `20261022134830`, aplicada em 22/10/2026 às 18:38:20 UTC. O conector retornou erro de estado de requisição; uma leitura direta confirmou que nada havia sido aplicado. A execução usou a conexão PostgreSQL fornecida, com SSL `verify-full` e CA oficial obtida no painel, sem desativar a verificação. O SQL aprovado e o registro novo em `supabase_migrations.schema_migrations` foram executados numa única transação, com locks limitados e nova recusa se houvesse foco ativo. Os dois registros antigos de migração permaneceram idênticos. Cache PostgREST atualizado por `NOTIFY`.

Backup consistente dos schemas `public`, `auth` e `supabase_migrations`: **42 tabelas**, arquivo custom do `pg_dump` 17.11 cifrado por AES-256-GCM antes de tocar o disco. A chave foi protegida com Windows DPAPI CurrentUser e sua recuperação/decriptação foi verificada. Restauração em PostgreSQL local isolado comparou todas as linhas/colunas originais e também passou na aplicação da migração sobre os dados reais restaurados. A primeira comparação foi ajustada para UTC nos dois lados, eliminando diferenças de representação de datas. Docker instalado não iniciou; foram usados binários oficiais PostgreSQL/EDB em pasta temporária, sem instalar dependências da aplicação.

Cópia de recuperação conservada em `secrets/backups/game-saves-20261022`, ignorada pelo Git. **Não apagar essa pasta.** DPAPI depende do perfil Windows desta máquina; não é uma cópia portátil/off-site. O ensaio cobre os três schemas citados, não recria a plataforma inteira: configurações externas de Auth, JWT, SMTP, funções Edge e objetos Storage não estão nesse arquivo. Não houve restauração ou reset do projeto remoto.

Pós-migração, antes dos logins SDK, os hashes/contagens de todas as colunas originais das 42 tabelas coincidiram com o backup (histórico comparado pelas duas versões anteriores, além da nova entrada). Criados dois saves: um `ready`, outro `pending_selection`, com adulto e bebê juntos. Saldo preservado: quatro minutos elegíveis e dois distribuídos. Uma sessão pausada, nenhuma ativa; motor de foco original idêntico, todas as constraints validadas, RLS ativo e nenhuma permissão direta de escrita nos saves ou acesso a `game_private` concedida ao usuário.

`scripts/validate-game-saves-development.mjs` aprovou **seis grupos remotos com Auth real**: login A/B; contexto/proprietário; RLS e recusa de save alheio; quarto/aparência nas RPCs novas e antigas; bebê e isolamento; cookies SSR e `/` + `/play` para ambas as contas em produção isolada na porta 3156. Não criou personagens, foco, créditos, distribuições ou gastos. `get_game_context` atualiza somente a última utilização; login/logout alteram as próprias sessões Auth de teste. Logout limitado a essas sessões SDK, preservando o navegador do jogador. O servidor auxiliar foi encerrado; porta 3000 mantida com o build anterior compatível.

Advisors pós-migração: nenhum erro; avisos de 17 RPCs `SECURITY DEFINER` autenticadas (intencionais, proprietário validado, sem execução anônima) e proteção de senha vazada desativada (pré-existente). Referências: [RPCs autenticadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [proteção de senha](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Nenhuma configuração Auth foi alterada.

Recibo sanitizado: [2026-10-22-game-saves-development.json](deployments/2026-10-22-game-saves-development.json). Lint repetido com o script novo: aprovado. Os 164 testes locais anteriores continuam correspondendo ao mesmo código/SQL; consumo concorrente e cuidado pago pós-migração continuam comprovados localmente, sem novo gasto real nesta aplicação. Safari físico, cópia off-site portátil e futura seleção de protagonista/slots permanecem pendentes. Os preflights e o plano abaixo são o histórico anterior à execução, não pendências de autorização.

## Modelo preparado

`game_saves` contém UUID, proprietário, nome, protagonista, residência principal, geração atual, estado (`draft`, `pending_selection`, `ready`), versão 1, revisão do mundo, progressão JSON, criação, última utilização, arquivamento e referências de origem. `ready` exige protagonista e residência. A FK composta valida que ambos pertencem ao mesmo save e proprietário. `origin_save_id` aceita somente origem do mesmo usuário; `origin_snapshot_id` está reservado e limitado a nulo até existir um modelo validado de snapshots. Não há operação de ramificação.

Residências, personagens, memórias, eventos e distribuições recebem `save_id`. Sessões recebem `origin_save_id`, apenas como proveniência: crédito, carteira, XP, recompensas e limite de sessão aberta continuam globais por conta. Os atributos, aparência, necessidades, memórias e progresso continuam nas entidades existentes; não são clonados nem recalculados.

As chaves compostas usam índices únicos compatíveis nos destinos e impedem misturar `(personagem, residência, save, usuário)`, inclusive dentro da mesma conta. Crédito/sessão e distribuição/crédito/pedido também passam a validar proprietário por FK. Há índices de consulta por save e proprietário nas entidades associadas. As referências circulares de protagonista, residência principal e save de compatibilidade são diferíveis para permitir criação atômica e exclusão de conta com as cascatas existentes.

`profiles.compatibility_save_id` registra o contexto antigo explicitamente. Não se escolhe repetidamente o primeiro resultado de uma consulta. `profiles.focus_revision` acompanha mudanças nos créditos; `game_saves.world_revision` acompanha mudanças de personagens daquele mundo. As novas respostas carregam ambas: o cliente rejeita snapshots atrasados em qualquer uma e respostas de outro save. As RPCs antigas mantêm `revision = world_revision + focus_revision`, preservando o controle de respostas antigas dos clientes anteriores.

As distribuições novas registram versão e efeitos: no adulto, valores antes/depois de necessidades e habilidades; no bebê, regras por minuto e resultado agregado do pedido, identificado por `effect_scope: care_request_total`. Esse agregado não deve ser somado uma vez por linha. Distribuições anteriores ficam `legacy_unknown`, sem inventar o efeito histórico nem reaplicar progresso.

## Migração e protagonista

Arquivo novo: `supabase/migrations/20261022134830_game_saves_compatibility.sql`, criado com `supabase migration new` via CLI temporária. Nenhuma dependência do projeto foi acrescentada e os três arquivos anteriores permanecem intactos.

A transação cria um save por residência e associa todos os seus personagens, inclusive arquivados. IDs antigos não mudam. Memórias, eventos, alocações e origem das sessões seguem o personagem; eventos antigos sem personagem seguem o contexto de compatibilidade. Há preflight para residências ausentes/incompatíveis e `lock_timeout` de cinco segundos. Restrições antigas de uma residência por usuário e um personagem legado por conta são removidas somente na migração nova.

Seleção auditável em `game_save_migration_audit`:

| Candidatos não arquivados | Resultado |
| --- | --- |
| Um | Protagonista conhecido, geração preservada, `ready` |
| Mais de um | Protagonista nulo, `pending_selection` |
| Nenhum | Protagonista nulo, `draft` |

Adulto e bebê na mesma residência ficam juntos. Não se presume parentesco nem identidade compartilhada. A residência com ambos permanece com protagonismo pendente, mas os fluxos antigos seguem acessando seus personagens explícitos. A futura interface deverá resolver essa escolha; não foi criada nesta entrega.

## Segurança, funções e concorrência

RLS nas duas tabelas novas permite somente leitura do próprio usuário autenticado. Escrita direta não é concedida. As políticas anteriores das entidades existentes continuam vigentes; as FKs compostas acrescentam integridade entre saves. Contexto enviado pelo navegador não constitui autorização: todas as RPCs validam `auth.uid()`, proprietário e arquivamento. Os helpers ficam em `game_private`, sem uso do schema ou execução por `PUBLIC`, `anon` ou `authenticated`. RPCs públicas novas têm execução somente autenticada e `search_path` vazio.

Novas RPCs: `get_game_context`, `room_state_for_save`, `room_command_for_save`, `baby_state_for_save`, `baby_care_for_save`, `create_character_for_save`, `read_birth_for_save`, `start_save_focus`. As assinaturas antigas de quarto, nascimento, bebê e início de foco continuam como adaptadores de compatibilidade. `new_household` e `assign_household` passam a criar/validar o contexto. Triggers associam registros, atualizam revisões e preservam origem imutável de sessão.

O corpo validado de `focus_command` é movido para `game_private.focus_engine` sem alteração: heartbeat, pausa, retomada, recuperação, cancelamento e conclusão continuam no motor original. A fachada pública intercepta somente o início para resolver o save/personagem. O corpo anterior é comparado integralmente no ensaio. `credit_completed_focus` preserva cálculo e idempotência, direcionando a revisão aos créditos globais em vez de todas as residências.

Escritas de quarto/bebê/início obtêm primeiro o bloqueio da conta; consumo do crédito continua transacional. A unicidade `one_open_session` permanece global. Pedidos antigos conservam UUID e payload exatos; a repetição valida também o save das alocações existentes, sem reatribuir pedidos. Falhas revertem tanto o saldo quanto os efeitos. Não se criam créditos por trocar de contexto.

## Compatibilidade de aplicação

`src/features/game-saves/{model,server}.ts` centraliza contrato, revisão e resolução autenticada. `/` e `/play`, seus endpoints e componentes passam contexto explícito internamente. Sessões continuam sendo consultadas por conta. O início recebe save e personagem; os demais comandos do cronômetro não recebem nova consulta ou alteração de temporização.

Enquanto a migração não existir, somente o erro `PGRST202` da RPC de contexto, **sem um save explícito**, permite usar as RPCs antigas. Permissão negada, rede indisponível, resposta malformada ou contexto explícito inválido são erros; não viram exploração local nem selecionam outra partida silenciosamente.

No navegador visitante, a chave `pomins-room-local-v1`, o nascimento antigo e as assinaturas de pedidos são preservados. O identificador local fica em metadado separado. A leitura acrescenta contexto em memória sem sobrescrever o save antigo. Revisões de mundo/foco são atualizadas conforme o efeito da transação e repetições sem efeito não avançam revisões. O bloqueio entre abas continua usando Web Locks, quando disponível, como antes.

Não há alteração de CSS, editor adulto, assets/licenças LPC, Phaser, cenário, autenticação, configuração de build ou dependências. Não há seleção/criação pública de vários slots, novo menu, fases, parentesco ou ramificação. As RPCs atuais de cenário/cuidados trabalham com a residência principal; interface para residências secundárias fica para outra etapa.

## Evidências executadas nesta entrega

- `npm test`: **125 aprovados**, sete testes nativos ignorados nesse comando e executados separadamente.
- PostgreSQL nativo descartável, conexões independentes: **7 aprovados**, incluindo último minuto disputado por saves distintos, pedido simultâneo idempotente e duas partidas tentando abrir foco. Banco auxiliar encerrado.
- Playwright contra produção isolada na porta 3155: **32 aprovados**, em 57,5s, Chromium e viewport/toque de iPhone. Inclui `/`, `/play`, nascimento, LPC/Phaser, cuidados, recarga, acessibilidade e foco local. Não é Safari nem iPhone físico.
- Total: **164 testes distintos aprovados**. Lint, TypeScript e build aprovados. Build e navegador executados numa cópia exata de fontes/configuração em `.cache/game-saves-validation`, sem copiar arquivos `.env`, mantendo o servidor real da porta 3000 intacto.
- Ensaio SQL com PGlite e autenticação simulada: três contas/residências, quatro personagens incluindo arquivado, memória, cuidados anteriores, recompensas, créditos, distribuições e uma sessão pausada. **Todas as linhas e colunas originais de 14 tabelas permaneceram iguais**, IDs preservados e três saves criados. Recibo: [2026-10-22-game-saves-local.json](deployments/2026-10-22-game-saves-local.json).
- Isolamento RLS, grants, FK cruzada, exclusão de conta com FKs circulares, aparência/restauração, cuidados/atividades, repetição de pedidos pré-migração, rollback e sessão antiga pausada são testados localmente. Os ensaios SQL simulam JWT; não equivalem a login real pós-migração.
- Supabase remoto: somente histórico/catálogo/agregados de leitura. Dois perfis, duas residências, três personagens, quatro sessões (uma pausada), dois créditos, duas distribuições, duas recompensas, cinco eventos e nenhuma memória. Quatro minutos elegíveis, dois distribuídos; nove verificações de vínculos sem inconsistência. Nenhuma escrita ou sessão SDK de teste iniciada nesta entrega. Recibo: [2026-10-22-game-saves-preflight.json](deployments/2026-10-22-game-saves-preflight.json).

Problemas corrigidos durante o ensaio: a adição de FKs após backfill exigiu descarregar os eventos de constraints diferíveis (`SET CONSTRAINTS ALL IMMEDIATE`); uma referência ambígua de pedido foi qualificada; o controle de revisão dos clientes antigos foi mantido como soma das revisões novas. O build isolado emite aviso de múltiplos lockfiles por estar dentro do projeto; compilação e testes concluíram. O primeiro auxiliar nativo manteve handles depois de encerrar o banco; seu encerramento foi corrigido somente no helper ignorado e os sete testes foram repetidos com saída zero.

## Arquivos alterados

- Contratos/contexto: novos `src/features/game-saves/model.ts` e `server.ts`; tipos em `features/{room/domain,baby-care/model,character-creator/model,focus-engine/model}.ts`.
- Integração: `src/app/{page,play/page}.tsx`, `src/app/api/{game,room,baby}/route.ts`, `src/components/game.tsx`, `src/features/room/{room-app.tsx,persistence.ts}`, `src/features/baby-care/{baby-care.tsx,persistence.ts}` e contexto inicial em `src/features/focus-engine/focus.tsx`.
- Banco: migração nova e `supabase/diagnostics/preflight-game-saves.sql` (somente leitura).
- Testes: novos `tests/integration/game-saves-database.test.ts`, `tests/unit/game-saves.test.ts`, `tests/unit/game-save-routes.test.ts`; extensão de `tests/integration/postgres-concurrency.test.ts`.
- Validação remota: `scripts/validate-game-saves-development.mjs`, opt-in restrito ao desenvolvimento, leituras com Auth real e opção de SSR isolado; sem criação de progresso ou gasto de minutos.
- Documentação: este relatório, README, IMPLEMENTATION_STATUS, TEST_RESULTS, DEPLOYMENT e dois recibos sanitizados. Auxiliares e bancos descartáveis estão ignorados em `.cache`.

## Plano remoto para autorização

**Atualização após autorização (22/10/2026):** o usuário autorizou a aplicação no desenvolvimento condicionada aos pré-requisitos. Novo preflight remoto manteve as contagens e saldos acima, uma sessão pausada e nenhuma ativa; o histórico continua com somente as duas migrações anteriores. O painel de Backups informou que o plano Free não inclui backups. Não há conexão PostgreSQL de backup configurada neste ambiente. Foi preparado `.env.supabase-backup.local`, ignorado pelo Git, com o campo vazio `POMINS_BACKUP_DATABASE_URL`; é necessária a conexão do Session pooler com a senha existente do banco para produzir e ensaiar uma cópia restaurável. Não foi redefinida senha, contratado plano, criado backup nem aplicada migração. A autorização permanece válida; não é preciso solicitá-la novamente para a mesma migração depois de cumprir os pré-requisitos.

1. **Backup e acesso:** obter backup consistente e restaurável de dados públicos e Auth, com recuperação ensaiada em ambiente separado. Usar o mecanismo de backup/PITR disponível no plano ou dump lógico cifrado por operador autorizado. Um dump apenas de `public` não garante recuperação de Auth. Nenhum backup remoto foi criado nesta entrega; não aplicar sem verificar esse pré-requisito. Manter material privado fora do Git.
2. **Janela e preflight:** repetir `supabase/diagnostics/preflight-game-saves.sql`, conferir ausência de foco ativo sem interromper o jogador, e registrar contagens, saldos e hashes. A sessão pausada observada não deve ser cancelada/retomada pelo deploy. Se houver sessão ativa, aguardar conclusão ou pausa voluntária. Reconciliar o lote inicial remoto `20261021201224` (dois arquivos locais) e `20261022021139`; não executar `db push` às cegas nem reaplicar migrações antigas. Conferir ausência de drift nas funções antes de substituir adaptadores.
3. **Alteração prevista:** somente a migração nova. No estado observado, criar dois saves e duas linhas de auditoria; vincular duas residências, três personagens, quatro origens de sessão, duas distribuições e cinco eventos. Preservar integralmente saldos, IDs, aparência, história e status da sessão pausada. Uma residência será pronta; a residência adulto/bebê terá protagonista pendente. Reavaliar esses números se houver uso posterior.
4. **Execução:** autorização explícita para o desenvolvimento; uma transação com timeout de locks. Conflito/erro provoca rollback, sem reset ou exclusão de dados antigos. Registrar o histórico da migração com a ferramenta aprovada e atualizar o cache de esquema PostgREST após sucesso. Não alterar Auth nem URLs de redirecionamento.
5. **Pós-verificação:** comparar colunas anteriores e saldos por conta, contagens/IDs/hashes, status/eventos de sessões, vínculos, FK/RLS/grants e auditoria; validar `/` e `/play` autenticados, sessão/restauração, bebê/adulto e pedidos pendentes. Testes reais com duas contas, mudança explícita de save, consumo/idempotência/concorrência exigem ambiente de teste e saldo autorizado, distinguindo-os dos testes locais. Não reutilizar o script remoto antigo de validação, que cria personagens/gasta saldo sem conhecer slots.
6. **Recuperação:** falha dentro da transação não deixa backfill parcial. Após commit, preferir correção incremental; os adaptadores permitem voltar ao cliente anterior enquanto houver o contexto legado compatível. Não existe down automático destrutivo. Depois de dados em múltiplos saves, não recriar índices de unicidade antigos nem apagar saves para forçar downgrade. Restauração do backup exige autorização específica e consideração das escritas posteriores ao backup.

Riscos principais: bloqueios durante backfill, esquema remoto divergente, cache PostgREST desatualizado, clientes antigos abertos, pedidos em trânsito e futura ambiguidade de protagonista. A migração foi ensaiada com sessão pausada, mas **o comportamento real pós-migração, Auth e Safari físico ainda está pendente**. Aprovar a migração não substitui o backup e os preflights. Próxima etapa: aplicar este plano no desenvolvimento somente após autorização, validar fluxos reais e então planejar a seleção de slots.
