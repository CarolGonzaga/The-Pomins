# Resultados de validação · Entrega 1

## Entrega 5E — validação nova, 22/10/2026

**233 testes distintos aprovados:** 174 unidade/integração, 11 PostgreSQL descartável (835ms) e 48 Playwright em produção isolada (rodada final aproximadamente 1,5 minuto, dois workers, Chromium desktop e viewport/toque de iPhone). Lint sem avisos, TypeScript explícito e build da raiz aprovados. Os 11 nativos ignorados em `npm test` foram executados separadamente. Menu/configurações conferidos em capturas; auditoria WCAG A/AA sem violações nas telas novas testadas; largura e botões mobile verificados.

Cobertura: autenticação e destinos internos, seis etapas e pular tutorial, menu/saves, persistência de preferências, temas/sistema/movimento, avatar, valor inicial de novas sessões, acesso ao painel antigo de privacidade, reautenticação/MFA verificados para e-mail, recuperação existente, logout/login e preservação do foco. As primeiras tentativas corrigiram rotulagem de rádio e a simulação Auth (callback, assinatura JWT fictícia e recuperação anônima); tentativas incompletas não contam como aprovação.

**Supabase real separado:** sete grupos aprovaram login A/B, SSR, conta/contexto verificados, salvar preferências/avatar, novo login, restauração integral dos metadados originais e comparação dos mundos/foco. Nenhum e-mail, senha ou protagonista alterado; zero links enviados e zero migrações executadas. Em 3000, oito verificações reais adicionais preservaram as rotas de saves/jogo/legadas. Comparação de 12 tabelas após atualização do servidor preservou a sessão pausada e todos os dados, exceto o timestamp permitido de última utilização. Confirmação real de e-mail/recuperação e Safari físico exigem validação humana. 5D commitada em `49ce61e`, 5E consolidada localmente, sem push. [Relatório](MAIN_MENU.md).

## Entrega 5D — validação local nova, 22/10/2026

**Consolidação Git 5D:** rodada repetida antes do commit `feat: add multi-save management`: 160 unidade/integração, 11 PostgreSQL nativo descartável e 40 Playwright (2,1 min), **211 distintos**, lint, TypeScript e build isolado aprovados. Criação/continuação/arquivamento/restauração exercitados no navegador. Conferência remota somente por leitura: SQL e três funções idênticos, tabela privada com colunas/FKs/RLS/grants esperados. Nenhuma migração reaplicada nem alteração nas sessões/dados remotos. Os grupos reais da implantação abaixo não foram repetidos como mutações nesta consolidação.

**Validação real posterior à autorização:** migração `20261022202113` aplicada após backup cifrado/restauração de 44 tabelas e preflight sem foco ativo. Comparação pós-aplicação sem divergência nos dados anteriores. Oito grupos com Auth real aprovaram duas partidas/residências, criação concorrente repetida, nascimento/aparências/memórias, RLS, arquivamento/restauração e novo login. As duas histórias de teste ficaram arquivadas e recuperáveis; personagens e protagonista pendente anteriores intactos, sem gasto ou comando de foco. Build da raiz aprovado e disponibilizado em 3000 após reinício controlado, com oito conferências reais adicionais de leitura/SSR e 12 tabelas críticas preservadas. Lint e TypeScript repetidos e aprovados. [Recibo real](deployments/2026-10-22-save-manager-development.json).

**211 testes distintos aprovados:** 160 unidade/integração (`npm test`), 11 PostgreSQL nativo descartável com conexões independentes (1,41s) e 40 Playwright contra produção isolada (aproximadamente 1,6 minuto, dois workers). Os 11 nativos ignorados em `npm test` foram executados separadamente. Lint sem avisos, TypeScript explícito e build aprovados.

Casos novos: lista vazia/isolada, múltiplos saves/residências, pedido repetido e payload conflitante, nascimento/memórias reaproveitados, aparência persistida, arquivos sem exclusão, restauração/revisões, acesso alheio negado, foco pendente, grants/RLS, disputa de criação e arquivamento versus nascimento. Navegador descartou a resposta após SQL confirmado e recuperou um único save após recarga; criou duas histórias, preservou personagens/memórias e saldo global, arquivou/restaurou e removeu/restaurou cookies. Capturas desktop/mobile conferidas, sem overflow ou violações WCAG A/AA nas listas testadas. Auth do gateway é simulado; SQL e HTTP/SSR são locais reais. Não comprova login remoto nem Safari físico.

Primeiras tentativas locais encontraram tipos ausentes no teste e seletor ambíguo com o anunciador Next; corrigidos, com repetição completa aprovada. Porta PostgreSQL anterior ocupada: usado cluster descartável em outra porta, sem encerrar o processo existente. Essa fase usou apenas dados descartáveis. A validação real posterior está identificada acima; não altera configurações Auth nem contabiliza testes antigos como evidência nova. Sem commit/push. [Relatório e limites](SAVE_MANAGER.md).

## Consolidação Git da Entrega 5C — 22/10/2026

Rodada nova antes do commit local: **138 Vitest + 8 PostgreSQL nativo descartável + 36 Playwright = 182 testes distintos aprovados**. Playwright com dois workers, aproximadamente 1,4 minuto, Chromium desktop e viewport/toque de iPhone, Auth simulado e dados locais descartáveis. Lint repetido após o ajuste do validador para aceitar a porta 3000, TypeScript explícito e build de produção da raiz aprovados.

Sete grupos com Auth real A/B repetidos contra o servidor atualizado na porta 3000: cookies SSR, carregamento isolado, adulto/bebê, RLS, páginas e endpoints, referências incompatíveis e ausência de mudanças no progresso/foco. As rotas / e /play também responderam HTTP 200. Comparação de 12 tabelas críticas antes/depois do reinício preservou os dados, exceto a data esperada de última utilização dos saves. Uma sessão pausada permaneceu intacta; nenhuma ativa no preflight. Nenhuma criação, conclusão ou interrupção de foco.

Migração registrada e corpos/grants das funções conferidos por leitura, sem reaplicação; migrações anteriores preservadas. Backup cifrado, chave DPAPI e manifesto continuam locais, ignorados, com hash do arquivo cifrado conferido. Protagonista real continua pendente; seleção positiva e concorrência comprovadas nos testes descartáveis. Safari físico e cópia portátil/off-site do backup permanecem pendentes. Sem push. [Recibo desta rodada](deployments/2026-10-22-explicit-save-consolidation.json).

## Entrega 5C — contexto explícito

**Validação real autorizada:** migração `20261022191724` aplicada após backup cifrado e restauração de 44 tabelas, incluindo helpers privados. Pós-migração sem divergências nos dados anteriores; sessões, créditos e protagonistas preservados. Corpos/SQL/grants das duas funções conferidos, sem execução anônima. `scripts/validate-explicit-saves-development.mjs` aprovou sete grupos de Auth real, carregamento/RLS, bebê/adulto, endpoints e SSR em `/game/[saveId]`, `/` e `/play`. Sem foco iniciado, minutos gastos ou protagonista escolhido. Seleção positiva e concorrência continuam comprovadas localmente; a escolha do save real permanece com o jogador. Servidor auxiliar 3183 encerrado; servidor original preservado. Lint repetido e aprovado. [Recibo real](deployments/2026-10-22-explicit-save-development.json).

Rodada nova sobre `964537a`: **138 testes Vitest aprovados**, oito nativos ignorados nesse comando; **8 aprovados** em PostgreSQL descartável (incluindo disputa de protagonista) e **36 aprovados** em navegador contra produção isolada, Chromium e viewport/toque de iPhone. Total **182 distintos**. Lint, TypeScript e build aprovados. O comando `node scripts/validate-explicit-saves-local.mjs` executa o backend PGlite/Auth simulado e todos os 36 cenários sem usar o Supabase remoto. Novos testes cobrem seleção/repetição/conflito, acesso negado, outro save da mesma conta, residência/personagem incompatíveis, aparência/bebê, saldo global, sessão pausada, recarga Phaser, cookies restaurados e regressão de `/` e `/play`.

A primeira rodada de navegador encontrou a comparação de origem com o bind interno e uma sobreposição da navegação com a sidebar. Corrigidas, com regressão nova; um seletor foi limitado ao alerta principal para excluir o anunciador do Next. Uma repetição com seis workers teve timeout em caminhada do cenário antigo; o comando final usa dois workers e passou nos 36 casos em aproximadamente 1,1 minuto, sem mudar a animação. Não se contam as tentativas incompletas como aprovação. A restauração de cookies dessa suíte é simulada e distinta da rodada real acima. Sem mudanças no cronômetro, créditos, migrações antigas, dependências ou assets. [Relatório e limites](EXPLICIT_GAME_CONTEXT.md).

## Consolidação Git da Entrega 5A + 5B — 22/10/2026

Rodada executada antes do commit `feat: add game saves foundation and compatibility`: `npm test` **125 aprovados** (sete nativos ignorados nesse comando e executados separadamente); PostgreSQL descartável **7 aprovados em 1,24s**; Playwright contra build isolado **32 aprovados em 48,4s**. Total **164 testes distintos**. Lint, TypeScript explícito e build aprovados. Sem alterações de código após os testes.

Nova restauração local do backup cifrado e comparação de catálogo com Supabase somente por leitura: SQL do histórico idêntico ao arquivo, esquema de `public`/`game_private` equivalente, migrações antigas preservadas e sessão pausada intacta. Tratada no comparador a representação adicional de `NOT NULL` no catálogo PostgreSQL 18; nulabilidade comparada em ambos. Backup/chave/manifesto preservados fora do Git; credenciais e arquivos privados excluídos. Auth real não repetido nesta consolidação; sua evidência é a rodada de aplicação abaixo. Sem push. [Recibo atual](deployments/2026-10-22-game-saves-consolidation.json).

## Entrega 5A + 5B — partidas — 22/10/2026

**Validação remota após autorização:** migração `20261022134830` aplicada em 22/10/2026. Backup cifrado de 42 tabelas (`public`, `auth`, `supabase_migrations`), decriptação e restauração local comprovados. Ensaio sobre dados reais e comparação pós-migração preservaram todas as colunas anteriores/IDs, os dois registros anteriores de migração, saldos e sessão pausada. RLS/grants/FKs e motor de foco conferidos. Seis grupos de Auth real com duas contas aprovaram contexto, isolamento, quarto/aparência, bebê e cookies SSR de `/` e `/play` em servidor isolado 3156; sem gastos ou criação de foco. Sessões SDK desconectadas com escopo local; navegador e servidor 3000 preservados. Lint repetido com o script novo e aprovado. Advisors sem erros, com avisos documentados de RPCs autenticadas intencionais e proteção de senha pré-existente. Recibo: [aplicação real](deployments/2026-10-22-game-saves-development.json). Os itens abaixo registram a rodada local e o preflight anteriores; não indicam que a aplicação remota ainda esteja pendente.

Verificações novas sobre `6bbf3aa`, não reaproveitando aprovações históricas:

- `npm test`: **125 aprovados**, sete ignorados por dependerem de PostgreSQL nativo e executados separadamente.
- PostgreSQL nativo descartável: **7 aprovados**, última rodada em 845ms; concorrência real entre conexões, mesma requisição, bebê/adulto e saves disputando o último minuto, uma sessão aberta por conta. Mensagens de saldo insuficiente/índice `one_open_session` são recusas esperadas. Banco encerrado e auxiliar finalizado com saída zero.
- Playwright em build de produção isolado na porta 3155: **32 aprovados em 57,5s**, desktop e viewport/toque de iPhone. Rotas antigas, nascimento, quarto, LPC, cuidados, persistência e foco local preservados. Não representa Safari físico ou autenticação real pós-migração.
- **164 testes distintos aprovados**. `npm run lint`, `npm run typecheck` e build Next.js aprovados. TypeScript e build na cópia de fontes/configuração `.cache/game-saves-validation`; nenhuma compilação na pasta `.next` do servidor real. Aviso benigno de múltiplos lockfiles na cópia aninhada. A execução inicial restrita do lint não retornou prontamente; execução completa com acesso ampliado terminou com saída zero.
- Ensaio PGlite: quatro personagens (incluindo arquivado), adulto/bebê, memória, cuidados, recompensas, créditos, pedidos antigos e sessão pausada. Três saves novos; todos os IDs/colunas anteriores das **14 tabelas** idênticos. Motor SQL de foco comparado integralmente. Testes novos de RLS/grants, isolamento entre contas e saves, FKs, rollback, repetição de pedidos antigos, aparência/restauração, revisão de foco separada e exclusão de conta.
- Preflight remoto exclusivamente de leitura: nove verificações de vínculos sem falhas e hashes de 11 funções compatíveis com as migrações locais. Não se aplicou a migração, não se fez login SDK nem consumo de minutos no remoto. Uma sessão pausada foi preservada; o navegador real não foi manipulado.

Recibos: [ensaio local](deployments/2026-10-22-game-saves-local.json), [preflight remoto](deployments/2026-10-22-game-saves-preflight.json). Relatório, limitações e arquivos: [GAME_SAVES_FOUNDATION.md](GAME_SAVES_FOUNDATION.md). Base 5A/5B e compatibilidade autenticada validadas localmente e no desenvolvimento. Cuidado pago/concorrência comprovados localmente; sem novos gastos remotos. iPhone físico pendente. Sem dependências novas, migrações antigas alteradas, commit ou push.

## Entrega 4A — bebê e cuidados — 21/10/2026

Base `cd47161b780032c100e8c19535b1a64987899409`. Verificações novas desta implementação:

- `npm test`: **97 aprovados**, quatro testes nativos ignorados nesse comando. Inclui estado inicial, seis cuidados, limites de necessidades, regras configuráveis, persistência local/SQL, ano de ausência, saldo compartilhado, repetição, rollback e isolamento por usuário/residência.
- `node .cache/run-pg-race.mjs`: **4 aprovados**, PostgreSQL nativo descartável encerrado ao final. Duas novas provas com conexões independentes: repetição simultânea de cuidado e disputa bebê/adulto pelo mesmo último minuto. As mensagens SQL de saldo insuficiente são recusas esperadas.
- A repetição após espelhar o arquivo da migração encontrou a porta anterior ocupada; essa tentativa não foi contada como aprovação. Ajustado apenas o helper ignorado para a porta 55447: os quatro testes completos passaram novamente, em 2,64s.
- `npm run typecheck`, `npm run lint` e `npm run build`: aprovados. O primeiro lint detectou um import de tipo sem uso no teste novo; removido e lint repetido com sucesso.
- Playwright completo contra build de produção local, porta 3102: **32 aprovados em aproximadamente 1,1 minuto**, Chromium desktop e viewport/toque de iPhone. Seis execuções novas cobrem reações gratuitas, acessibilidade a 320px, sessão local completa pelo Pomodoro existente, cuidado salvo/recarga/repetição de pedido e rejeição de origem/autenticação no endpoint.
- **133 testes distintos aprovados** nesta rodada: 97 + 4 + 32. Capturas locais ignoradas em `test-results/baby-care-{chromium,iphone}.png`.

Os testes SQL executam as duas migrações originais e a migração nova em bancos locais. A fixture de sessão concluída não representa foco real no Supabase. O E2E controla o relógio do navegador e usa exploração local sem XP oficial. Depois de espelhar o nome atribuído pelo servidor no arquivo SQL, Vitest e PostgreSQL nativo foram repetidos para conferir os caminhos atuais.

**Aplicação remota autorizada:** `20261022021139_baby_care`, após preflight real de estrutura/histórico. RLS ativo, seis atividades, RPCs sem execução anônima e com `search_path` vazio; escrita direta de regras negada. Saldo agregado preservado pela implantação: 4 elegíveis, 2 distribuídos. As migrações e funções anteriores não foram substituídas.

**Validação remota nova, sem minutos gastos:** `node scripts/validate-baby-care-development.mjs` aprovado com Auth normal de A/B. Criado Bento Bebê em B somente porque não havia bebê legado. Estado inicial restaurado após novo login SDK; personagem e histórico isolados; cuidado cruzado e escrita direta negados; crédito inexistente recusado com rollback integral do estado. Não é uma simulação SQL de JWT. Não foi lido o nascimento nem escolhida uma memória pelo script. O adulto B foi preservado. **Cuidado pago remoto não concluído**: B sem saldo; os ensaios positivos de cuidado e concorrência continuam sendo locais. Recibo e hashes: [2026-10-21-baby-care.json](deployments/2026-10-21-baby-care.json). A sessão do navegador não foi encerrada; apenas sessões SDK de teste foram desconectadas.

Inspeção manual final no navegador integrado: `/` autenticado restaurou Bento Bebê; **Meu Pomin** carregou necessidades reais pela nova API SSR, saldo zero e histórico vazio. Carinho gratuito mostrou a reação sem custo. Captura em `.cache/baby-care/authenticated-desktop.png`. Build atualizado disponível em `http://localhost:3000`; a aba de cuidados foi mantida aberta para revisão.

Não há testes físicos de Safari/iPhone. Nenhuma dependência, asset LPC, migração antiga ou lógica do Pomodoro foi alterada. Plano e limitações: [BABY_CARE.md](BABY_CARE.md).

## Consolidação Git da Entrega 3 — 21/10/2026

Rodada nova antes do commit `feat: expand LPC character customization`:

- `npm run lint`, `npm run typecheck` e `npm run build`: aprovados.
- `npm test`: 81 aprovados; 2 testes nativos ignorados nesse comando e executados separadamente.
- `node .cache/run-pg-race.mjs`: 2 aprovados em PostgreSQL descartável; servidor encerrado ao final. A mensagem SQL `Insufficient minutes` é a recusa esperada no teste de disputa do saldo.
- E2E completo contra o build de produção local na porta 3101: 26 aprovados em 58,9s, Chromium desktop e viewport/toque de iPhone. Total desta rodada: **109 testes distintos aprovados**.
- As primeiras execuções restritas de PostgreSQL/navegador não concluíram e foram interrompidas. A primeira repetição nativa encontrou a porta ainda ocupada e não foi contada como aprovação; após liberação, a execução completa acima passou. Os processos auxiliares foram executados com permissão ampliada, sem acesso a banco remoto.
- Revisados os 44 arquivos alterados/adicionados, créditos, licenças e hashes dos assets. Sem achados de credenciais ou arquivos privados; `.env.local` e `.env.supabase-test.local` continuam ignorados.
- Migrações, Auth/SSR, endpoints, Pomodoro, persistência/distribuição de minutos e dependências sem alteração em relação à base `55f9497`. Sem push. A verificação Supabase remota da implementação abaixo não foi repetida nesta consolidação.

## Entrega 3 — personalização LPC — 21/10/2026

Rodada atual, sobre a base `55f9497adf89641ac2f94d90876543bcd174402b`, sem reutilizar aprovações antigas:

- `npm test`: **81 aprovados**, 2 testes nativos ignorados por esse comando.
- `node .cache/run-pg-race.mjs`: os **2 testes nativos aprovados** em PostgreSQL local descartável, encerrado ao final.
- `npm run lint`, `npm run typecheck` e `npm run build`: **aprovados**, repetidos após os ajustes finais de código.
- Playwright completo contra o build de produção: **26 aprovados em 53,8s**, Chromium desktop e viewport/toque de iPhone. Inclui quatro cenários novos de personalização, poses/direções, animação, salvamento local, recarga, acessibilidade e largura mobile de 320px.
- Total: **109 testes locais distintos aprovados**. Os testes de persistência em PGlite usam identidades simuladas e as migrações originais; não são testes do Supabase remoto.
- Os 24 PNGs originais mantiveram seus hashes; os 42 recursos atuais têm dimensões, hashes e licenças verificados. Os 18 novos sprites foram recoloridos nas três poses preservando o canal alfa. Catálogo, ordenação das camadas traseiras/dianteiras, compatibilidade legada e fases sem arte têm testes próprios.

**Verificação efetiva no Supabase de desenvolvimento:** a conta B salvou pelo aplicativo cabelo ondulado, camisa sem mangas e novas cores. `node scripts/verify-lpc-persistence.mjs` autenticou com senha normal, leu o quarto, encerrou apenas sua própria sessão SDK e autenticou novamente em outro cliente. Resultado: `remote_appearance_restored`, `layers_preserved`, `progress_balance_activity_unchanged` e `fresh_password_login` verdadeiros; **zero escritas de banco pelo script**. SHA-256 do script executado: `a52941933eb08b4a980db89ff0c9c6ce7074c30c6ce7da2146e7444e9e76c5c7`. A gravação foi feita pela interface real, não pelo script. A seleção também apareceu no Phaser após recarga; depois foi escolhida a atividade estudar para inspeção visual. Nenhum minuto foi distribuído nesta verificação.

Não foram repetidos os ensaios remotos de foco, concorrência e recuperação de senha da Entrega 2; eles permanecem evidência histórica. Não houve alterações nessas regras, endpoints, persistência do quarto, migrações ou dependências. A prova atual de persistência remota não substitui um novo ensaio completo desses fluxos.

Capturas locais ignoradas: `.cache/character-visuals/editor-desktop.png`, `.cache/character-visuals/phaser-study.png` e `test-results/visual-editor-iphone.png`. Mobile foi verificado em Chromium; Safari/iPhone físico e produção HTTPS continuam pendentes. Detalhes e limites: [CHARACTER_VISUALS.md](CHARACTER_VISUALS.md).

## Consolidação Git da Entrega 2 — 21/10/2026

Verificações repetidas para o commit local `chore: validate supabase development integration`:

- `npm test`: **53 aprovados**, 2 nativos ignorados nesse comando.
- PostgreSQL local descartável (`node .cache/run-pg-race.mjs`): os **2 testes nativos aprovados separadamente**; banco encerrado ao final.
- `npm run lint`, `npm run typecheck` e `npm run build`: aprovados.
- Playwright completo contra `npm run start`, com contextos anônimos: **22 aprovados em 44,6s**, Chromium desktop e viewport/toque de iPhone. Total desta consolidação: **77 testes distintos aprovados**.
- Primeira execução E2E: 20 aprovados e 2 falhas no cenário de blur/offline, cujo início havia sido recusado por falta das condições de visibilidade/conexão. O teste agora garante conexão e página em primeiro plano e aguarda `Pausar` antes de emitir os eventos, inclusive após retomar. A suíte completa repetida passou; nenhum comportamento do produto foi alterado nessa correção do teste.
- Varredura dos arquivos candidatos contra valores locais de credenciais e padrões de tokens/chaves privadas: sem achados. `.env.local` e `.env.supabase-test.local` ignorados e não rastreados; somente `.env.example` vazio é incluído.
- Migrações existentes, dependências e recursos públicos comparados com `82e35eb`: sem alterações. Sem push, reset ou reescrita de commits.

Os 11 grupos remotos documentados abaixo foram executados na validação anterior da mesma implementação. Não foram repetidos nesta consolidação Git, pois o ensaio de concorrência consome minutos reais e seus pré-requisitos mudaram. Não são contados nos 77 testes locais desta rodada.

## Entrega 2 — preparação Supabase e verificações de 21/10/2026

### Resultado final — execução remota autenticada com duas contas

**Aprovados 11 grupos no Supabase real**, usando Auth normal e JWTs distintos: 8 no script principal (login, RLS/atividade cruzados em ambos os sentidos, crédito alheio, repetição de alocação, escrita direta bloqueada, conclusão repetida, rollback integral e disputa do último minuto) e 3 adicionais de foco (início idempotente/pausa/retomada, posse entre conexões/isolamento e lacuna real/conclusão antecipada/cancelamento sem crédito). Ambas as execuções terminaram com código 0. Não houve impersonação SQL como prova de RLS, credenciais privilegiadas, alteração de timestamp ou dependência instalada.

Conferência agregada posterior: 2 contas confirmadas, 2 sessões concluídas, 1 cancelada de teste, nenhuma aberta; 2 créditos e 2 recompensas; 4 minutos elegíveis, 2 alocados, 2 disponíveis; 2 pedidos e 2 alocações, sem saldo excedido ou divergência. A disputa conservou um minuto adicional de estudo em Aurora (conhecimento 4, autonomia 2); B possui Bento Teste com progresso e saldo zero, observado após recarga. A sessão do usuário no navegador continuou ativa após o encerramento das conexões Auth do teste.

Recibo sem credenciais e com hash do script: [2026-10-21-supabase-runtime-validation.json](deployments/2026-10-21-supabase-runtime-validation.json). Script verificado com `node --check` e ESLint. A última execução local após mudanças no produto continua sendo 53 Vitest aprovados/2 nativos ignorados, lint e build com TypeScript aprovados. Os dois E2E de regressão do início tardio passaram anteriormente no build com a correção do timer; a suíte local completa não foi repetida apenas por esta conferência remota/documental.

Limites: conexões independentes verificam protocolo de posse; não representam interação de duas abas físicas. A espera real de 8,5 segundos verifica ausência de heartbeat, sem desligar Wi-Fi. Expiração prolongada de JWT, SMTP próprio, iPhone físico/Safari e produção HTTPS não foram ensaiados. O histórico cronológico abaixo contém pendências que foram resolvidas por esta rodada final; não descreve o estado final.

### Atualização após cadastro e correção do callback

**Confirmação final do recovery pelo usuário:** senha antiga recusada, nova senha permitiu login. Navegador observado na página inicial autenticada; senhas não coletadas. RLS/concorrência remotas ainda não aprovadas: preparado `scripts/validate-supabase-development.mjs`, com sintaxe e lint verificados, aguardando segunda conta confirmada e configuração local ignorada. A execução poderá distribuir 1 minuto de teste na conta A e criar um adulto em B se ausente; não exclui dados nem modifica migrações.

**Recovery após senha diferente:** usuário relatou sucesso; navegador voltou da redefinição à página inicial autenticada. `/play` manteve Aurora, conhecimento 2, autonomia 1, 4 minutos confirmados, 1 distribuído e 3 disponíveis. O formulário só realiza esse retorno após sucesso de `updateUser`. Senha não lida nem registrada; novo login com a senha alterada ainda pendente. Consulta aos nomes de eventos de auditoria pesquisados retornou vazio e não foi tratada como prova. Nesta rodada houve conferência de interface e documentação, sem código ou repetição da suíte.

**Recuperação de senha, rodada mais recente:** e-mail recebido pelo usuário e aba em `/auth?mode=update`. O usuário tentou a mesma senha e relatou rejeição genérica; código remoto não capturado, sem afirmar causa definitiva. Corrigida mensagem para distinguir `same_password`, senha fraca e sessão indisponível, preservando login/cadastro. Executados nesta rodada: **53 Vitest aprovados, 2 nativos ignorados**, lint e build/TypeScript aprovados. Três testes novos cobrem mensagens por códigos simulados; alteração real para senha diferente ainda pendente. E2E não repetidos para esta correção de mensagens.

**Jornada principal remota aprovada após novo login:** o usuário entrou novamente após o logout executado nesta validação. `/play` restaurou Aurora estudando, conhecimento 2, autonomia 1, energia 75, histórico de 4 minutos confirmados, 1 distribuído e 3 disponíveis. O registro da alocação permaneceu visível. Cadastro confirmado, login, criação, foco real, distribuição, logout e restauração foram observados no ambiente de desenvolvimento. Recuperação de senha, isolamento com segunda conta e testes adversariais de repetição/concorrência/rollback remotos permanecem pendentes. Nenhum código alterado ou suíte automatizada repetida para esta conferência de interface.

Atualização mais recente, após retomada pelo usuário: banco remoto confirmou **2 sessões concluídas de 120.000 ms**, 2 créditos e 2 recompensas, somando 4 minutos elegíveis. Distribuição real pela interface: 1 minuto para estudar, com um pedido e uma linha de alocação; 3 minutos restantes, conhecimento 2 e autonomia 1. Recarga restaurou personagem, aparência, atividade, atributos e histórico. Excesso de 3 minutos em uma sessão com 2 disponíveis foi rejeitado no cliente; não é prova de rollback remoto. Logout/novo login e testes adversariais remotos seguem pendentes. Nenhum código foi alterado nesta rodada; não foi repetida a suíte automatizada por essa verificação apenas de dados/interface.

Logout também foi executado e observado: início sem conta; `/play` passou à exploração local, mostrando o personagem e saldo locais preexistentes, sem Aurora ou seu saldo remoto. Novo login ainda depende da entrada de senha pelo usuário.

Rodada posterior ao login do usuário: conta mantida após recarga de `/` e `/play`; adulto Aurora criado pela API autenticada, aparência e atividade persistidas e restauradas. Identificado e corrigido heartbeat inicial precoce (intervalo montado antes do início): o efeito reinicia ao mudar o estado da sessão. Após essa alteração foram executados novamente **50 testes Vitest aprovados, 2 nativos ignorados**, lint e build com TypeScript aprovados; **2 E2E de foco/distribuição local aprovados** em produção (desktop/viewport iPhone), agora com início atrasado em 4,5 segundos. Não são testes de distribuição remota.

No Supabase real: sessão de 120 segundos iniciou, foi recuperada e pausada/retomada. Demoras excederam timeout de requisição/limite entre confirmações; estado final `interrupted`, 72.910 ms validados, sem créditos, recompensas ou distribuições. Sem aceleração ou ajustes de timestamps. Conclusão, alocação remota, logout/novo login, recovery de senha e isolamento com segunda conta ainda pendentes. Mais detalhes no relatório de desenvolvimento.

Consulta agregada real confirmou uma conta com e-mail validado, perfil e carteira. O link recebido já retornava `otp_expired`; login e sessão SSR ainda não aprovados. Corrigido retorno indevido para `0.0.0.0` usando a origem `NEXT_PUBLIC_APP_URL`, sem mudar o visual ou destinos permitidos. O alias Vitest passou a usar `fileURLToPath` para resolver espaços no caminho do workspace.

Executados novamente após a correção: **50 testes Vitest aprovados, 2 nativos ignorados**, lint e build (incluindo TypeScript) aprovados. Cinco testes novos de callback usam troca Auth simulada; não validam PKCE remoto. Não foram repetidos os E2E nem os testes nativos nesta rodada. HTTP local real: callback sem código 307 para `localhost:3000/auth?error=callback`, `/` e `/play` 200. O navegador confirmou o retorno local corrigido. Os dois callbacks autorizados estão salvos no Dashboard. Nenhum push.

### Histórico anterior ao cadastro

**Aplicação remota autorizada concluída:** integração Supabase retornou sucesso para o lote `20261021201224` (`initial_pomins_foundation_and_playable_room`), contendo as duas migrações originais em ordem. Preflight real: 0 tabelas do Pomins, 0 contas Auth, sem histórico. Pós-aplicação: 13 tabelas com RLS, 7 RPCs com `EXECUTE` negado a anon e permitido a authenticated, `search_path` vazio, 4 triggers e 14 políticas. As três atividades foram verificadas. As 6 sondagens HTTP anônimas posteriores retornaram 401/42501. Nenhuma conta foi criada; testes de login, e-mail, sessão e alocação autenticada continuam pendentes. Não foi repetida a suíte local completa neste passo apenas documental/remoto. Recibo e hashes em `docs/deployments/2026-10-21-supabase-initial.json`.

Histórico anterior à aplicação: o JSON fornecido pelo usuário mostrou ausência das 13 tabelas e do histórico. O lote inicial foi preparado e ensaiado localmente antes da autorização. Os resultados abaixo identificam essas execuções anteriores, sem presumir uma nova rodada completa a cada atualização documental.

Relatório atual: [SUPABASE_DEVELOPMENT_VALIDATION.md](SUPABASE_DEVELOPMENT_VALIDATION.md). **A jornada autenticada remota ainda não foi aprovada.**

- Vitest: **45 aprovados**, 2 de concorrência nativa ignorados sem URL; os 2 foram executados separadamente e aprovados em PostgreSQL descartável, encerrado ao final.
- Lint, TypeScript e build com configuração pública real: aprovados. O teste de inspeção SQL também foi repetido e aprovado após ajustar a consulta para retornar um único resultado no SQL Editor.
- E2E contra produção: **22 aprovados em 33,3s**, com contextos anônimos; não foram criadas contas nem enviados e-mails. Chromium desktop e viewport/toque de iPhone, sem Safari físico.
- Total: **69 testes distintos aprovados nesta tarefa**, incluindo 6 novos de diagnóstico/configuração. Isso não equivale a aprovação de Auth/SSR/RLS remoto.
- Sondagem HTTP real: Auth settings retornou **200**, com e-mail habilitado, confirmação obrigatória e cadastro permitido. As **13 consultas anônimas** de tabelas com `limit=0` retornaram **404/PGRST205**; isso não determina sozinho o histórico/esquema.
- Contas de teste, confirmação/recuperação de e-mail, login/logout/cookies, sessão Pomodoro e alocação remotas: **não executados**. A aplicação das migrações foi concluída e verificada conforme a atualização acima.

Uma chave privilegiada detectada durante o preenchimento foi rejeitada antes de requisições/build e removida do campo público, depois substituída pelo usuário por `anon`. A proteção de configuração impede esse erro nos próximos builds; valores não foram registrados. Migrações existentes, código de jogo, estilos e recursos LPC foram preservados. Nenhuma dependência instalada ou alteração enviada ao remoto.

## Consolidação da base — execução atual de 21/10/2026

Esta seção registra execuções realizadas na tarefa de consolidação, independentemente dos resultados históricos abaixo. Relatório e reprodução: [BASELINE_CONSOLIDATION.md](BASELINE_CONSOLIDATION.md).

- `npm ci --prefer-offline --no-audit --no-fund`: aprovado; instalação pelo lockfile.
- `npm run lint`: aprovado, zero erros/warnings, com exceções pontuais documentadas para os comportamentos existentes de hidratação/imperatividade e navegação completa.
- `npm run typecheck`: aprovado após instalação e correções.
- `npm test`: 39 aprovados, 2 de concorrência nativa ignorados sem URL.
- `node .cache/run-pg-race.mjs`: os 2 testes nativos executados separadamente e aprovados em PostgreSQL descartável; banco encerrado ao final.
- `npm run build`: aprovado após os ajustes finais de código, sem trocar Next.js/Turbopack.
- `POMINS_TEST_PORT=3100 POMINS_TEST_SERVER_MODE=production npm run test:e2e`: 22 aprovados em 35,2s contra o build atualizado. A sintaxe de variáveis no PowerShell está no relatório.

**63 testes distintos aprovados nesta tarefa.** E2E: 11 desktop Chromium + 11 viewport/toque de iPhone em Chromium. Rotas `/` e `/play`, nascimento, Pomodoro, PWA, recoloração LPC, renderização Phaser, caminhada, atividades e restauração foram exercitados. Os 24 PNGs do manifesto foram conferidos por HTTP nos dois projetos; sem falhas de carregamento LPC ou erros JavaScript no percurso completo do quarto. Capturas foram inspecionadas nesta tarefa.

Nenhum Supabase real foi conectado ou modificado. Cadastro/e-mail, cookies SSR/PostgREST reais, publicação HTTPS e Safari/iPhone físico permanecem **não executados**. Nenhuma execução remota de CI foi presumida. As migrações existentes foram preservadas.

## Atualização de 21/10/2026 — quarto LPC

**63 testes distintos aprovados:** 39 de regras/contratos/PNG/migrações/RLS/RPC em Vitest + 2 de concorrência em PostgreSQL nativo + 22 E2E (11 desktop Chromium, 11 viewport/toque de iPhone em Chromium). Typecheck e build Next.js aprovados, com `/play`, `/api/room` e `/credits` adicionados.

O `npm test` comum retorna 39 aprovados e 2 ignorados se `POMINS_TEST_DATABASE_URL` não estiver definido. Os mesmos 2 testes ignorados foram executados separadamente e **aprovados** em um PostgreSQL nativo 18.4 descartável, instalado apenas no cache da tarefa e encerrado após a execução. O CI está preparado para executá-los com serviço PostgreSQL 17; não foi afirmado que um run remoto do GitHub Actions já aconteceu.

Cobertura adicional: corpo/camadas LPC com hashes e créditos; alteração real dos pixels de pele/olhos/cabelo/roupa; aparência persistida; caminhos cardinais por objetos Tiled; mudanças de destino sem salto; estudo/leitura/repouso e restauração; migração preservando bebê/XP/sessão concluída anterior; crédito único de conclusão; ausência de crédito de sessão interrompida; saldo separado; divisão entre dois moradores; rollback de todas as linhas; repetição de UUID; disputa pelo último minuto; recuperação de pedido já aplicado; rejeição de excesso sem bloquear o formulário; necessidades sem deterioração por ausência.

Os cenários E2E completos validaram o fluxo anterior de nascimento, PWA, Auth sem backend, temporizador estrito e o quarto novo. As capturas `room-chromium.png` e `room-iphone.png` foram conferidas; testes automatizados em 320px não encontraram transbordamento nem violações WCAG A/AA no quarto.

Os 6 cenários do quarto também foram repetidos e aprovados no servidor de **produção** (`npm run start`). Uma falha interna do cache do Turbopack no ambiente Windows foi resolvida isolando somente o cache gerado dentro de `.cache/` e reconstruindo; não houve troca de framework ou de bundler. O build final de produção foi aprovado.

Ainda não executado: Supabase Auth/GoTrue/PostgREST reais, aplicação da migração em projeto externo, deploy HTTPS, Safari/WebKit físico, instalação iOS, Wake Lock físico e VoiceOver. Só `.env.example` está presente; não há credenciais conectadas. Consulte `PLAYABLE_ROOM.md` e `IOS_TEST_CHECKLIST.md`.

## Histórico de 16/10/2026

Ambiente: Windows, Node.js 24.14.0, npm 11.9.0. Referência do projeto: 16/10/2026. Nenhuma credencial Supabase foi utilizada ou inventada.

| Verificação                                          | Resultado                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------ |
| TypeScript strict                                    | Aprovado                                                                 |
| Build de produção Next.js 16.4.2                     | Aprovado                                                                 |
| Vitest: regras e contratos                           | 7 testes aprovados                                                       |
| Vitest: migração, RLS e RPCs PostgreSQL/PGlite       | 11 testes aprovados                                                      |
| Playwright: desktop Chromium                         | 8 testes aprovados                                                       |
| Playwright: viewport/toque de iPhone 13 em Chromium  | 8 testes aprovados                                                       |
| axe WCAG A/AA: início, auth, criador e foco a 320px  | Sem violações detectadas nos cenários automatizados                      |
| Inspeção visual de screenshots                       | Início desktop/iPhone; criador e foco a 320px conferidos                 |
| Smoke test no servidor de produção (`npm run start`) | HTTP 200; criação/nascimento/foco aprovados em desktop e viewport iPhone |

Total final: **34 testes aprovados**, além do build e typecheck. A verificação automática de acessibilidade usa movimento reduzido para medir cores finais sem capturar o fade entre telas. Não equivale a certificação nem substitui VoiceOver.

## Cenários verificados

Criação de humano/alienígena e contrato de aparência; persistência local de personagem/memória; nascimento e escolha; recarga; início, pausa e encerramento; interrupção por eventos de perda de foco/conectividade; sessão local completa de dois minutos com relógio controlado pelo Playwright e sem XP; limite de largura em 320px; erros de formulário; rejeição de origem externa/sem autenticação; manifest/ícones; instalação do worker e navegação offline; cache sem API/Auth/HTML pessoal.

No banco isolado: leitura própria e bloqueio de leitura cruzada, proibição de escrita direta de XP/carteira/sessões, uma vida e uma sessão aberta, escolhas idempotentes, sequência/frequência/lease, ausência de crédito após lacuna, retomada manual, conclusão atômica e duplicação, limite diário, expiração, cancelamento e exclusão isolada de conta.

Testes de tempo no banco ajustam timestamps pela conexão privilegiada do ambiente efêmero. Usuários reais não têm permissão para isso. O aplicativo de produção não tem mecanismo de acelerar o tempo. O relógio do Playwright existe apenas no processo de teste.

## Não executado

- Cadastro real com entrega de e-mail, confirmação/recovery PKCE e cookies SSR contra Supabase.
- Contrato HTTP PostgREST num projeto real (RPCs retornam uma linha, consumidas com `.single()`).
- Publicação Vercel, domínio/HTTPS ou deploy da migração externa.
- Safari/WebKit real, iPhone físico, bloqueio de tela, ligações, Wake Lock físico, instalação iOS e VoiceOver.
- Entregas 2 e 3: ainda não implementadas, portanto sem afirmação de testes de vida completa/social.

A suíte completa gera `test-results/home-chromium.png`, `home-iphone.png`, `creator-320-chromium.png`, `focus-320-chromium.png` e equivalentes de iPhone; pasta ignorada pelo Git e substituída em execuções subsequentes, inclusive parciais. CI em `.github/workflows/ci.yml` reproduz a suíte sem credenciais externas.
