# Entrega 5C — contexto explícito e carregamento seguro

Base: `964537a3ed2376049bf0939c5d57d2f01a54196b`, branch `codex/consolidacao-base`. **Migração 5C aplicada ao desenvolvimento após autorização, novo backup cifrado e restauração comprovada.** Consolidação local autorizada com a mensagem `feat: add explicit game save context`, sem push.

## Consolidação e servidor local — 22/10/2026

Nova rodada: **182 testes distintos aprovados** (138 Vitest, 8 PostgreSQL nativo descartável e 36 Playwright com dois workers), lint, TypeScript e build de produção da raiz aprovados. A suíte de navegador usa dados locais descartáveis e Auth simulado; sete grupos separados com Auth real foram repetidos contra a porta 3000, cobrindo `/`, `/play` e `/game/[saveId]` para duas contas.

Antes do reinício havia uma sessão pausada e nenhuma ativa. O processo anterior foi identificado e encerrado de forma controlada; o novo build está disponível em `http://localhost:3000`. Comparação antes/depois de 12 tabelas críticas confirmou dados persistidos inalterados, descontando apenas a data de última utilização dos saves. Nenhuma sessão foi criada, concluída ou cancelada, e nenhum personagem ou protagonista foi alterado automaticamente.

SQL registrado, corpos e permissões das duas RPCs conferidos novamente por leitura, sem reaplicar a migração. Backup cifrado, chave de recuperação e manifesto preservados e ignorados pelo Git; integridade do arquivo cifrado reconferida. A seleção positiva e concorrente foi validada nos testes descartáveis; o save real continua pendente de escolha humana. [Recibo desta consolidação](deployments/2026-10-22-explicit-save-consolidation.json).

## Aplicação real autorizada — 22/10/2026

Versão `20261022191724`, aplicada às 19:54:43 UTC pela conexão PostgreSQL fornecida, com CA oficial e verificação SSL. SQL e registro de histórico executados em uma única transação, com locks/timeout, recusa de foco ativo e `NOTIFY` para atualizar o cache PostgREST. A migração 5A/5B armazenada foi comparada integralmente ao arquivo local; os três registros de migração anteriores foram preservados.

Novo backup dos schemas `public`, `auth`, `supabase_migrations` e `game_private`: **44 tabelas**. Inclui os helpers privados necessários à restauração da base 5A/5B. Arquivo custom cifrado antes de gravação com AES-256-GCM; chave protegida por Windows DPAPI CurrentUser e recuperação verificada. A restauração local e a aplicação 5C sobre os dados restaurados preservaram todas as colunas originais. Cópia privada em `secrets/backups/explicit-save-5c-20261022`, ignorada pelo Git; **não apagar**. Depende do perfil Windows desta máquina; não é uma cópia portátil/off-site nem restaura configurações externas da plataforma.

Pós-migração, antes dos logins SDK, comparação de 44 tabelas sem divergências; histórico comparado pelas três versões anteriores, além da nova entrada. Continuam um save `ready` e outro `pending_selection`, uma sessão pausada, quatro minutos elegíveis e dois distribuídos. FKs validadas, RLS/grants da base preservados, motor de foco idêntico. Os corpos das duas funções novas e o SQL registrado coincidem com o arquivo local; execução anônima negada, autenticada concedida e `search_path` vazio.

`scripts/validate-explicit-saves-development.mjs` aprovou **sete grupos com Auth real A/B**: login/cookies; carregamento de residência/moradores/histórico; adultos e bebê existentes; RLS e seleção cruzada recusados; endpoint e páginas SSR por save com `/` e `/play`; URL de personagem incompatível; sessões/saldo/revisões/protagonistas inalterados. Não criou personagens, sessões, distribuições ou gastos. Não selecionou protagonista no save pendente. Login/logout alteram somente as sessões Auth próprias do teste; `get_game_context` pode atualizar última utilização, sem mudar revisão do mundo. Logout SDK com escopo local preserva o navegador do jogador.

Na aplicação inicial, SSR foi validado em produção isolada na porta 3183, encerrada ao terminar. Na consolidação acima, o servidor habitual foi atualizado e a validação real repetida na porta 3000. A escolha positiva do protagonista real continua com o jogador; idempotência/concorrência positivas foram validadas localmente e não foram simuladas como sucesso remoto.

Advisors sem erros, com avisos de 19 RPCs `SECURITY DEFINER` autenticadas (intencionais, incluindo as duas novas) e proteção de senha vazada desativada, pré-existente. Referências: [RPCs autenticadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [proteção de senha](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Nenhuma configuração Auth alterada. Lint repetido com o validador novo: aprovado. [Recibo sanitizado](deployments/2026-10-22-explicit-save-development.json).

## Rotas e serviço

- `/game/[saveId]`: Server Component com parâmetros assíncronos do Next.js 16. Recebe contexto autorizado e monta os componentes existentes com chave de conta/save/personagem.
- `/api/game-saves/[saveId]` GET: carregamento autenticado, `private, no-store`. POST: seleção de protagonista com personagem e revisão esperada; valida origem/host e sessão antes da RPC. Não aceita proprietário fornecido pelo navegador.
- `src/features/game-saves/loading.ts`: identifica o usuário por `getUser`, valida UUID e contrato da resposta, proprietário, save/residência, referências de personagens/memórias/eventos, protagonista e sessões globais. Erros não se transformam em exploração local nem em outro save.
- `load_game_save(uuid)`: lê perfil, residência principal, personagens (incluindo arquivados para preservar referência histórica), memórias, eventos, progressão, quarto e foco global sob bloqueio compartilhado da conta. Reutiliza `checked_save`, `get_game_context` e `room_state_for_save`. Saves arquivados, inexistentes e alheios são recusados com mensagem genérica.

O perfil é global à conta; a progressão do mundo permanece em `context.save.progression`. Aparência, atributos, necessidades, habilidades e histórico permanecem nos registros existentes, sem conversão ou recálculo. Créditos e histórico de sessões continuam globais. O endpoint GET retorna 401/404/503 conforme autenticação, disponibilidade e falta de migração. A página mostra uma tela simples sem dados do save quando o carregamento é negado; não é uma rota visitante.

## Reutilização das telas

`SavePlayer` usa o protagonista como morador inicial. Links da própria residência permitem abrir outro morador por `?character=UUID`; referências fora da lista elegível são bloqueadas. Isso não altera o protagonista persistido. Adultos usam `RoomApp`, editor LPC, Phaser e atividades existentes. Bebês usam `Game`, nascimento, `Birth` e `BabyCare` existentes. A seleção de protagonista é uma tela mínima com os nomes e botões existentes; nenhum novo menu de partidas ou layout mobile foi criado.

O fluxo do bebê permanece contextual após o foco e ao abrir o quarto. `/` e `/play` continuam usando o save de compatibilidade e suas experiências anteriores. Nenhum asset, CSS, biblioteca ou motor Pomodoro foi alterado. Em `RoomCanvas`, apenas o callback de chegada passa a ignorar cenas já desmontadas.

## Protagonista pendente

`select_save_protagonist(save, character, expected_revision)` permite resolver `draft`/`pending_selection` com um morador **não arquivado, da mesma conta/save e residência principal**, com renderização já disponível: bebê legado ou adulto LPC. Não pressupõe parentesco, espécie ou que adulto e bebê são a mesma pessoa. Outras fases aguardam recursos validados.

A seleção atualiza protagonista, geração e revisão do mundo e registra um único evento `ProtagonistSelected`. Não altera personagens, aparência, necessidades, saldo ou sessões. Conta bloqueada primeiro com `FOR UPDATE`, na ordem já adotada. Duas escolhas diferentes concorrentes: somente uma vence. Repetir o mesmo alvo já escolhido retorna o estado sem duplicar evento ou revisão; revisão antiga para outra escolha é recusada. Trocar um protagonista já definido pertence à futura sucessão, não está habilitado por esse endpoint.

## Isolamento e continuidade

Chaves temporárias centralizadas em `saveStorageKey`: `pomins:conta:save:tipo`, com o personagem nos cuidados. Pedidos antigos mantêm UUID e payload exatos e são movidos para a chave contextual quando recuperados com contexto válido; não se recalcula assinatura. As FKs e RPCs existentes continuam autorizando o destino e o crédito.

Conta/save/personagem compõem as chaves React; a cena Phaser é destruída e criada novamente ao trocar de morador/contexto. Respostas antigas ficam na instância desmontada e o callback de chegada ignora cenas encerradas. Respostas de quarto/cuidados continuam verificando revisões independentes de mundo e foco. Nenhum cache de jogador é compartilhado; sprites LPC continuam podendo compartilhar assets públicos.

Abrir/trocar uma partida não monta `Focus`, não chama `start`, `recover`, `pause`, `cancel` ou `complete`. O foco global existente aparece como continuidade, com link ao save/personagem de origem. Um morador diferente não pode recuperar a sessão com o retrato errado nem iniciar outra em paralelo. Abrir os controles de foco continua sendo uma ação explícita e usa o motor original. Os links de moradores não permitem sair da tela enquanto o foco está ativo; pausa/retomada permanecem nos controles existentes. Navegação externa, ocultação e desconexão continuam com as regras anteriores do temporizador.

## Migração proposta e segurança

Arquivo local novo: `supabase/migrations/20261022191724_explicit_save_protagonist.sql`, criado com a CLI oficial. Acrescenta somente as duas RPCs; não altera migrações anteriores, tabelas, índices, políticas existentes ou créditos. Funções `SECURITY DEFINER` têm `search_path` vazio, autorização por `auth.uid()` e execução concedida somente a `authenticated`; sem grant anônimo ou escrita direta adicional.

**Plano executado após autorização específica para 5C.** A autorização da 5A/5B não foi reutilizada. Backup consistente novo e restauração do estado pós-5A/5B, preflight/histórico/sessões e conferência das funções foram concluídos. O registro de protagonista real deve ser uma escolha explícita do jogador, não uma decisão do deploy. Em falha na transação, rollback; após sucesso, preferir correção incremental ou retorno à aplicação anterior, mantendo a base 5A/5B. Não reaplicar esta migração ao desenvolvimento.

Em ambientes ainda sem essas RPCs, `/game/[saveId]` informa que a atualização não foi aplicada. No desenvolvimento autorizado elas já estão disponíveis. `/` e `/play` continuam preservados.

## Testes executados

- Vitest: **138 aprovados**, oito nativos ignorados nesse comando e executados separadamente. Inclui sete testes de carregamento/SQL e seis de endpoint novos.
- PostgreSQL nativo descartável: **8 aprovados**, incluindo concorrência de protagonistas com conexões independentes, repetição vencedora, foco único e disputa do saldo global. Recusas SQL de conflito/saldo são esperadas.
- Playwright: **36 aprovados** (Chromium desktop e viewport/toque de iPhone). Inclui quatro execuções novas para partidas independentes, seleção, cookies removidos/restaurados, morador incompatível, outra conta, recarga Phaser e ausência de comandos de foco. Os 32 cenários anteriores foram executados novamente.
- **182 testes distintos**, lint, TypeScript explícito e build aprovados. Navegador contra produção em cópia isolada; na consolidação, build da raiz também aprovado após parada controlada do servidor.

Os 36 testes de navegador usam um gateway HTTP local com PGlite, dados descartáveis e identidade Auth simulada. Não usam senhas nem contas Supabase reais. A validação real separada está descrita acima; não substitui uma escolha humana positiva no save pendente nem Safari físico. Comando reproduzível local (portas 3181/3182 livres):

```sh
node scripts/validate-explicit-saves-local.mjs
```

O script copia fontes/configuração para `.cache/explicit-save-validation`, usa chave fictícia exclusiva do backend de teste, compila, executa os 36 cenários com dois workers e encerra os auxiliares. A rodada final passou em aproximadamente 1,1 minuto. Uma repetição com seis workers teve timeout em caminhada de um cenário antigo; o comando passou a limitar a contenção de CPU, sem alterar a animação. Não copia `.env` nem modifica a configuração do aplicativo. O `npm run test:e2e` normal ignora os quatro casos que exigem esse gateway; eles só contam como aprovados quando executados pelo comando acima. Concorrência nativa exige `POMINS_TEST_DATABASE_URL` apontando exclusivamente para banco descartável chamado `pomins_test`, conforme a proteção já existente.

Problemas encontrados e corrigidos: tipos incompletos no contrato do bebê, comparação de origem com o bind interno do Next, sobreposição dos links de moradores com a sidebar e seletor de teste ambíguo com o anunciador de rotas do Next. O build isolado emite aviso de múltiplos lockfiles por estar aninhado; compilação e testes concluíram. Nenhum desses problemas exigiu nova dependência ou alteração do layout antigo.

## Arquivos

Novos: página e endpoint de `game-saves`, `features/game-saves/{loading.ts,save-player.tsx}`, migração 5C, `tests/integration/explicit-saves.test.ts`, `tests/unit/explicit-save-routes.test.ts`, `tests/e2e/explicit-saves.spec.ts`, fixtures em `tests/support/`, comando de validação e este relatório.

Adaptados: `app/{page,play/page}.tsx`, `components/game.tsx`, `features/game-saves/model.ts`, `features/baby-care/baby-care.tsx`, `features/room/{room-app,room-canvas}.tsx`, testes nativos de concorrência e documentação de estado/testes/publicação. Validação real nova em `scripts/validate-explicit-saves-development.mjs` e recibos sanitizados. Consolidação local autorizada, sem push; arquivos privados e backups continuam ignorados.

## Limites e Entrega 5D

Sem criação/seleção pública de slots, novas fases ou transferência de protagonista já escolhido. Interface atual usa a residência principal; outras residências aguardam organização própria. Históricos ainda são carregados integralmente; paginar conforme o volume crescer, preservando autorização e revisão. API não retorna os atributos de outro mundo, exceto o foco/perfil globais intencionais.

Próximo passo: o jogador escolher o protagonista pela interface e conferir a restauração dessa escolha após novo login, sem gastar foco automaticamente. Depois, a 5D pode adicionar seleção/criação controlada de slots, paginação e navegação de retorno baseada em save, reutilizando esse carregador. Safari/iPhone físico e backup portátil/off-site continuam pendentes.
