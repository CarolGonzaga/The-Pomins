# Entrega 5D — gerenciador de partidas

Base: `c2bb55336dbbfecd253f9a5914ed3bb72453df36`, branch `codex/consolidacao-base`. Implementação sem commit ou push. **Migração 5D aplicada ao desenvolvimento após autorização específica, backup cifrado atualizado e restauração validada.** Build 5D disponível em `http://localhost:3000/saves` após reinício controlado.

## Aplicação e validação reais — 22/10/2026

Versão `20261022202113` aplicada às 20:39:44 UTC, pela conexão PostgreSQL fornecida, com CA oficial e verificação SSL. Histórico anterior, SQL 5A/5B e funções 5C conferidos; ausência de foco ativo e comparação de todas as tabelas com o snapshot do backup exigidas antes do commit. SQL e histórico registrados em uma única transação, com timeout/bloqueios e atualização do cache PostgREST. As migrações antigas não foram alteradas ou reaplicadas.

Backup de `public`, `auth`, `supabase_migrations` e `game_private`: **44 tabelas**, cifrado em AES-256-GCM com chave Windows DPAPI CurrentUser recuperada e restauração local comprovada. Ensaio da 5D sobre essa cópia e comparação remota pós-aplicação preservaram todos os dados anteriores. Arquivo cifrado, chave e manifesto estão em `secrets/backups/save-manager-5d-20261022`, ignorados pelo Git. Dependem do perfil Windows atual; cópia portátil/off-site continua pendente. O backup anterior 5C também foi preservado.

Corpos/SQL e grants das três RPCs correspondem ao arquivo. Nenhuma execução anônima, nenhuma permissão direta nova de escrita em saves, tabela privada com RLS e sem acesso direto; nenhuma FK inválida. Motor de foco idêntico. Antes/depois da implantação: uma sessão pausada, quatro minutos elegíveis e dois distribuídos; um save pronto e outro com protagonista pendente.

`scripts/validate-save-manager-development.mjs` aprovou **oito grupos com Auth real**: duas contas/cookies, listas e SSR, dois saves/residências com criação repetida concorrente, nascimento/aparências/memórias separados, RLS e referências incompatíveis, arquivamento/restauração, novo login e preservação dos mundos/foco originais. Foram criadas duas histórias identificadas como “Validação 5D”, com Brisa 5D e Luar 5D e memórias diferentes; ambas ficaram **arquivadas e recuperáveis**, sem exclusão. Nenhum gasto, distribuição ou comando de foco; protagonista pendente real não escolhido. Login/logout SDK com escopo local preservou o navegador do jogador.

O SSR real foi validado primeiro em produção isolada 3183, encerrada ao terminar. O build da raiz passou e foi disponibilizado em 3000 após conferir a sessão pausada e preservar o build anterior localmente. A primeira tentativa do validador real esperava redirecionamento HTTP 307; foi ajustada para aceitar o marcador de redirecionamento por streaming do Next com `loading.tsx`, e a rodada completa passou. Um build auxiliar restrito ficou parado na compilação; somente esse processo identificado foi encerrado e o build repetido com subprocessos permitidos passou.

Conferência adicional autenticada da versão em 3000 aprovou oito grupos de leitura, incluindo `/saves`, `/saves/new`, listas ativas/arquivadas, `/game/[saveId]`, `/` e `/play`. Comparação antes/depois do reinício: **12 tabelas críticas idênticas**, desconsiderando apenas a última utilização dos saves. Sessão pausada preservada; nenhum início, conclusão ou cancelamento de foco. [Recibo real sanitizado](deployments/2026-10-22-save-manager-development.json).

Advisors de segurança: sem erros; 22 RPCs autenticadas `SECURITY DEFINER` intencionais, incluindo as três novas; proteção de senhas vazadas desativada, preexistente; informação sobre RLS sem políticas na tabela privada, cujo acesso direto é bloqueado intencionalmente. Nenhuma configuração Auth alterada. Referências: [RPCs autenticadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS sem políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Experiência implementada

- `/saves`: partidas da conta autenticada, nome, protagonista e aparência existente, fase, geração, última visita e estado. Listas separadas de partidas em andamento e arquivadas; estados vazios, carregamento, erro e nova tentativa.
- `/saves/new`: nome de 2–80 caracteres, criação transacional de save e residência e encaminhamento para `/game/[saveId]`. Partidas vazias reutilizam `Game`, `Creator`, `Birth`, aparência e cuidados existentes. Uma criação interrompida fica em `draft`, com “Retomar criação” na lista; após criar o bebê, o nascimento pode ser retomado em Histórias.
- Continuar abre a rota explícita 5C. A última utilização segue a regra existente de atualização no máximo uma vez por minuto ao carregar o contexto; listar não altera datas, protagonista ou progressão. Links da lista não fazem prefetch da partida.
- Arquivar exige confirmação na própria ficha, preserva todos os personagens e o histórico e permite restauração. Não existe exclusão definitiva. A ação muda apenas `archived_at`, revisão do mundo e um evento narrativo.
- Protagonista pendente continua com seleção explícita 5C; nenhum morador é escolhido pela listagem, removido ou associado a parentesco inventado. A primeira criação de um bebê em um save vazio mantém a regra já existente de torná-lo protagonista.
- Aparências de bebê e adulto são renderizadas pelos componentes existentes `Pomin` e `SpritePreview`; dados ausentes mostram uma indicação de indisponibilidade, sem personagem fictício. Não há novos assets ou licenças.
- Navegação “Minhas partidas” nas áreas autenticadas existentes, sem reformulação do layout interno. O login aceita retorno apenas aos caminhos exatos `/saves` e `/saves/new`; o comportamento padrão e a recuperação de senha permanecem iguais.

## Idempotência, isolamento e foco

O formulário guarda `{requestId, name}` antes do envio, em `pomins:<conta>:new-save-request`. Falhas, timeout ou recarga mantêm o UUID e o payload exatos; o nome fica bloqueado enquanto há pedido pendente. A confirmação remove somente esse pedido e abre o save retornado. Se o armazenamento não puder ser usado, a criação não é enviada. O bloqueio síncrono por `ref` evita cliques repetidos antes da atualização visual do botão. Pedidos distintos e explícitos podem criar partidas de mesmo nome; o nome não é uma chave única.

No banco, o registro de pedido tem chave `(user_id, request_id)` e vincula nome e save. O mesmo pedido retorna o mesmo save, inclusive se posteriormente arquivado; payload diferente é recusado. Criação do save, residência, recibo e evento é atômica. Não se altera `compatibility_save_id`, não se copia mundo e não se cria personagem ou crédito automaticamente.

Todas as mutações bloqueiam primeiro o perfil da conta, na ordem dos comandos existentes; arquivamento também verifica a revisão do mundo e o proprietário. Repetir o estado já alcançado não incrementa revisão nem duplica evento. Uma alteração concorrente em personagens invalida a revisão antiga. As FKs existentes impedem referências entre mundos incompatíveis.

Foco e créditos continuam globais, com as mesmas RPCs transacionais anteriores. Criar, listar, arquivar e restaurar não chamam comandos de foco ou distribuição. Uma partida com sessão ativa, pausada ou interrompida não pode ser arquivada; o jogador deve continuar pelos controles existentes. A regra é verificada no servidor, incluindo a origem e o personagem da sessão. Links de gerenciamento durante foco ativo pedem uso dos controles, sem pausar/cancelar automaticamente.

## Migração e plano executado após autorização

Arquivo gerado pela CLI Supabase 2.121.0: `supabase/migrations/20261022202113_save_manager.sql`.

1. Acrescenta `game_private.save_creation_requests`, com RLS habilitada, sem acesso direto por `anon`/`authenticated`, PK de idempotência e FKs de conta/save. Não expõe a tabela na Data API.
2. Acrescenta `list_game_saves(boolean)`, `create_game_save(uuid,text)` e `set_game_save_archived(uuid,boolean,bigint)`. Seguem o padrão transacional das RPCs existentes: `SECURITY DEFINER`, `search_path` vazio, proprietário identificado por `auth.uid()` e autorização explícita em todas as operações. `EXECUTE` revogado de `PUBLIC`/`anon` e concedido somente a `authenticated`.
3. Não substitui funções antigas, não faz backfill, não modifica personagens existentes e não recalcula saldos. SQL testado em PGlite e PostgreSQL nativo descartáveis.
4. Autorização específica recebida conforme item 9 da Entrega 5D; backup cifrado atualizado com recuperação testada, histórico/versões e preflight concluídos sem interromper sessões reais. SQL e histórico aplicados atomicamente; cache PostgREST atualizado e funções/grants/RLS/dados anteriores conferidos. **Não reaplicar ao desenvolvimento.**
5. Auth/SSR real com duas contas repetido, dois saves de teste com nascimentos e memórias criados e arquivados/restaurados sem tocar na sessão real existente. Saldo/histórico global preservados. Servidor habitual atualizado após reinício controlado e conferência do foco.

Falha antes do commit SQL resulta em rollback transacional. Após uso, manter tabela/recibos e preferir correção incremental ou retorno do aplicativo 5C: apagar recibos permitiria duplicações em retries antigos. Não existe rollback destrutivo automático.

## Validação e reprodução

Consolidação Git solicitada em 22/10/2026: os 30 arquivos foram revisados; nova rodada com **160 + 11 + 40 = 211 testes distintos aprovados**, lint, TypeScript e build isolado aprovados. SQL registrado, três funções, colunas/FKs/RLS e permissões da tabela privada conferidos por leitura no desenvolvimento. Nenhuma migração reaplicada, sessão de foco reiniciada ou dado remoto alterado nesta consolidação. Commit local autorizado em `feat: add multi-save management`, sem push. Credenciais e backups privados excluídos do índice Git.

Rodada de 22/10/2026: **211 testes distintos aprovados** — `npm test` com **160 aprovados** e 11 nativos ignorados nesse comando; PostgreSQL nativo descartável com **11 aprovados** em 1,41s; Playwright completo com **40 aprovados** em aproximadamente 1,6 minuto. Lint sem avisos, TypeScript explícito da raiz e build de produção da cópia isolada aprovados. Capturas desktop/mobile conferidas; lista sem overflow e auditoria WCAG A/AA sem violações nos dois projetos. Portas auxiliares 3181/3182 encerradas ao terminar; servidor 3000 preservado.

[Recibo desta rodada local](deployments/2026-10-22-save-manager-local.json). Arquivos alterados e novos conferidos sem correspondências com credenciais locais ou formatos de tokens; arquivos privados e backups permanecem ignorados.

Tentativas incompletas não contadas: o primeiro build detectou duas consultas de teste sem tipo de linha; corrigidas. Dois cenários de erro de navegador encontraram o alerta do Next além do alerta da página; o seletor foi limitado a `main`. A porta PostgreSQL 55447 já estava ocupada; nenhum processo existente foi encerrado, e a suíte completa passou em um cluster novo na porta 55549. Regressão completa e lint repetidos após as correções.

Comandos: `npm run lint`, `npm test`, TypeScript explícito e build em cópia isolada, `node scripts/validate-explicit-saves-local.mjs`. A suíte nativa usa exclusivamente um PostgreSQL descartável chamado `pomins_test`, com `POMINS_TEST_DATABASE_URL`; nunca apontar essa variável para o desenvolvimento remoto.

Testes novos de SQL/servidor cobrem lista vazia, proprietário, primeiro/segundo save, mesmo nome, repetição e conflito de payload, nascimento/memória existentes, aparência, referências incompatíveis, arquivamento/restauração/revisões, foco pendente, permissões e isolamento das chaves locais. Três cenários nativos adicionais disputam o mesmo pedido, criam/arquivam saves distintos e concorrem arquivamento com nascimento.

O validador real exige `POMINS_REMOTE_TESTS=development-only`, correspondência de URL com o projeto autorizado e servidor SSR isolado 3183. Usa as duas contas já configuradas no arquivo privado, sem imprimir credenciais, e guarda os UUIDs de pedido em `.cache/save-manager-development/runtime-requests.json` para repetir sem duplicar mundos. Não executar contra produção. Seu resultado é separado da suíte local e registra as duas histórias de teste arquivadas.

Navegador: dois cenários novos em Chromium desktop e viewport/toque de iPhone. O fluxo completo deixa o SQL confirmar a criação e descarta a resposta, recarrega e recupera exatamente um save; cria duas histórias com bebês/memórias diferentes; arquiva com confirmação, restaura, remove/restaura cookies e recarrega cuidados; compara saldo e sessão global; verifica ausência de overflow e auditoria automatizada WCAG A/AA. O outro cenário recusa arquivamento de outra conta e simula falha de conexão. Os testes 5C existentes continuam cobrindo seleção positiva de protagonista e Phaser.

**Identidade/Auth no gateway de navegador são simulados; SQL e HTTP/SSR locais são reais.** Remover/restaurar cookies nesses testes não comprova novo login com senha no Supabase. A rodada real separada acima executou novo login com senha e persistência no desenvolvimento; não é somada aos 211 testes locais. Nenhum resultado remoto antigo é contado como aprovação desta entrega. Safari/iPhone físico permanece pendente.

## Limitações e próximos passos

Sem menu principal definitivo, fullscreen, botão giratório, novas fases ou ramificação. A lista carrega todos os saves da conta; paginação pode ser acrescentada quando o volume justificar. O histórico das partidas segue o carregamento integral 5C.

Arquivar o save de compatibilidade é permitido quando não há foco pendente. Seu ponteiro é preservado: `/` e `/play` não selecionam silenciosamente outra história e indicam indisponibilidade, com acesso a “Minhas partidas” para restaurar ou continuar por ID. Acesso ao save arquivado por `/game/[saveId]` é recusado até restauração.

Pedidos interrompidos dependem do armazenamento deste navegador para repetição direta; o save confirmado continua recuperável pela lista mesmo em outro dispositivo. Não há quota de slots, exclusão definitiva ou sincronização de rascunho de aparência ainda não enviado. A aparência já salva, necessidades, atributos, memórias e identidade permanecem no banco.

Arquivos principais novos: `app/saves/{page,loading,error}.tsx`, `app/saves/new/page.tsx`, `app/api/game-saves/route.ts`, `features/game-saves/{manager.ts,manager-client.ts,new-save-form.tsx,save-manager.tsx,manager.module.css}`, migração 5D e testes de integração/endpoint/navegador. Adaptados: `SavePlayer`, `Game`, `RoomApp`, retorno restrito no `AuthForm`, links de recuperação de `/game/[saveId]`, fixtures SQL/HTTP e testes nativos. Nenhuma dependência, asset LPC, motor Pomodoro ou migração anterior alterada.
