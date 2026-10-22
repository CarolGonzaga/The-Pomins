# Resultados de validação · Entrega 1

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
