# Entrega 4A — bebê e cuidados

Base preservada: `cd47161b780032c100e8c19535b1a64987899409`. Consolidação e envio da Entrega 4A ao repositório autorizados pelo usuário em 22/10/2026. Nenhuma biblioteca nova, sprite LPC ou recurso externo. O bebê usa o componente SVG original `Pomin`; o criador e o nascimento continuam iguais.

## Como testar

Em `/`, crie o bebê pelo fluxo existente, leia o nascimento e guarde a primeira memória. Use **Cuidar do meu bebê** no início ou **Meu Pomin** na navegação. Nome, espécie humana/alienígena, aparência, primeira memória, XP e identidade permanecem os mesmos.

Os seis botões — alimentar, banho, fralda, brincar, carinho e dormir — selecionam o cuidado e mostram uma reação **gratuita e temporária**. Não mudam saldo, atributos ou histórico salvo. **Registrar cuidado com minutos** é uma escolha separada: informa explicitamente o custo, aplica necessidades/atributos e registra o histórico. Sem minutos ainda é possível brincar com as reações. Não há necessidades que caem por relógio, punição por ausência, notificações, doença ou morte.

Cinco indicadores: fome (`100 - saciedade`, menos é melhor), higiene, energia, afeto e diversão. As quatro últimas usam valores maiores como bem-estar maior. Todos começam com 75 de bem-estar (fome 25) em bebês novos; necessidades já existentes são preservadas.

| Cuidado | Bem-estar por minuto | Desenvolvimento por minuto | Potencial futuro |
| --- | --- | --- | --- |
| Alimentar | Saciedade +12 | Bem-estar +1 | — |
| Banho | Higiene +10 | Bem-estar +1 | — |
| Fralda | Higiene +12 | Bem-estar +1 | — |
| Brincar | Diversão +12 | Criatividade +1 | Curiosidade +1 |
| Carinho | Afeto +12 | Sociabilidade +1 | Sociabilidade e vínculo seguro +1 |
| Dormir | Energia +12 | Bem-estar +1 | — |

Necessidades limitadas a 100; não há efeitos negativos. Os potenciais só armazenam contadores positivos para regras futuras. Não definem personalidade nem preferência permanente e não afetam narrativa ou custo.

## Foco e saldo único

O Pomodoro não foi alterado. Sessões reais concluídas continuam gerando `focus_credits` pelo trigger existente. Cuidados gastam esses mesmos créditos, registram cada linha em `focus_allocations` e compartilham `allocation_requests` com `/play`. Nenhuma carteira nova. Sessões podem financiar outros moradores; não há reserva exclusiva do bebê. Sessões interrompidas/canceladas não geram créditos novos.

A nova função trava perfil, personagem e créditos, na mesma ordem de `room_command`. O bloqueio por perfil serializa foco e distribuição, inclusive pedidos concorrentes entre bebê e adulto. O pedido tem UUID e assinatura com namespace `babyCare`: repetição idêntica retorna o estado, payload diferente é rejeitado. Todas as linhas, necessidades, atributos, potenciais, evento e revisão são uma transação; qualquer erro desfaz o conjunto. O cliente guarda a intenção em `sessionStorage` antes do envio e oferece conferir o mesmo pedido após timeout/recarga. Uma resposta recusada de forma definitiva permite novo pedido; erro de rede mantém a intenção. Não há repetição automática de gastos.

Exploração local usa o **mesmo arquivo de armazenamento e a mesma transação com Web Locks** do quarto. A conclusão de foco do fluxo antigo agora registra também minutos de exploração nesse registro já existente, sem mudar cálculo de tempo ou conceder XP oficial. Esses minutos não são enviados/importados para a conta. Sem Web Locks, as operações síncronas funcionam na aba, mas a atomicidade entre abas antigas não é garantida; a proteção efetiva multiusuário e concorrente é a transação PostgreSQL.

## Persistência e migração aplicada

Arquivo: `supabase/migrations/20261022021139_baby_care.sql`. **Aplicado ao Supabase de desenvolvimento após autorização explícita nesta tarefa**, pelo MCP `apply_migration`. A versão `20261022021139` foi atribuída pelo servidor e espelhada no nome local; não foi inventada uma versão. O SQL é o mesmo arquivo aprovado originalmente em `supabase/proposals/baby_care.sql`, com seus comentários históricos de proposta. A CLI não estava instalada/cacheada; nenhuma dependência foi instalada para isso. Não reaplicar esta migração no desenvolvimento. Antes de futuras operações CLI, reconciliar o lote inicial conforme `SUPABASE_DEVELOPMENT_VALIDATION.md`.

Alterações aplicadas, depois das duas migrações existentes:

1. Acrescentar `characters.care_traits`, com contadores neutros, sem modificar identidade/aparência/atributos existentes.
2. Criar `baby_care_config` com regras globais versionadas e leitura autenticada; escrita reservada ao operador do banco. Adicionar as seis atividades ao catálogo existente e índice parcial de histórico em `game_events`.
3. Criar `baby_state(uuid)` e `baby_care(jsonb)`, com `search_path` vazio, verificação de `auth.uid()`, residência, bebê não arquivado e renderer legado. Reutilizam a mesma tabela de personagens, créditos, pedidos, alocações e eventos. Nenhuma função antiga é substituída.
4. Negar privilégios por padrão e conceder apenas leitura das regras e execução das duas RPCs a `authenticated`; sem acesso anônimo ou escrita direta.
5. Conferir esquema/RLS/grants e ensaiar com duas contas de desenvolvimento. Pós-aplicação: RLS ativo, seis atividades, funções com `search_path` vazio, execução negada a anon e permitida a authenticated, sem escrita direta nas regras. A aplicação conservou 4 minutos elegíveis e 2 distribuídos no agregado.

Em ambientes sem essa migração ou sem conexão, nascimento, Auth, foco e quarto continuam funcionando. As reações gratuitas permanecem disponíveis; o painel informa a indisponibilidade do salvamento. Não faz fallback de dados autenticados para uma simulação local nem anuncia um salvamento fictício.

Verificação remota por `scripts/validate-baby-care-development.mjs`: Auth normal das contas A/B, criação do bebê de teste **Bento Bebê** em B somente porque estava ausente, leitura e restauração idêntica após logout local do SDK/novo login, isolamento de personagem/histórico, recusa de cuidado cruzado, bloqueio de escrita direta e rejeição de crédito inexistente sem mudança de estado. O bebê mantém o nascimento não lido para que a primeira memória seja escolhida pelo jogador. Não foi alterado o adulto Bento Teste. **Zero minutos gastos; cuidado remoto com minutos ainda não concluído**, pois B não tem saldo. A prova de cuidado pago, repetição/concorrência e rollback de múltiplas linhas é local, não remota. Recibo sem credenciais: `docs/deployments/2026-10-21-baby-care.json`.

Advisors: as duas novas RPCs aparecem no aviso de execução autenticada de `SECURITY DEFINER`, assim como as sete RPCs anteriores. A execução é intencional: elas exigem identidade/residência, validam os dados e concentram a transação; conceder escrita direta para usar `SECURITY INVOKER` retiraria essa proteção. Conferidos grants e isolamento real/local. Referência: [aviso 0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). A proteção contra senhas vazadas continua desabilitada como antes; não alteramos a configuração Auth: [documentação](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

O endpoint `/api/baby` usa o cliente SSR existente, `getUser`, origem no POST, limite de payload, validação Zod e respostas `private, no-store`. SQL verifica usuário e residência além do cliente. O histórico usa `game_events` com tipo `BabyCare`, versão e snapshot dos efeitos aplicados. A interface mostra os 50 eventos mais recentes; totais e diversidade de cuidados consideram todo o histórico. Regras globais atualizadas afetam novos cuidados; eventos antigos mantêm versão/efeitos.

## Preparação para infância

Configuração inicial: **30 minutos de cuidados, quatro tipos diferentes e primeira memória guardada**. Os requisitos vêm de `baby_care_config.rules.growth`; a exploração usa os mesmos padrões de `model.ts`. Alterações de regra no banco são tarefa do operador e devem incrementar `version`, ser documentadas e testadas. O teste de banco compara os padrões TS e SQL para evitar divergência inicial.

Cumprir os requisitos só anuncia prontidão. Não há botão/endpoint de envelhecimento, exigência de tempo de calendário ou troca visual automática. A transição futura deverá preservar o mesmo `characters.id`, família/residência, nome, espécie, aparência compatível, memórias, atributos, potenciais e histórico, após validar recursos infantis.

## Verificação e limites

Resultados desta rodada em `TEST_RESULTS.md`. Testes SQL usam PGlite com identidades Auth simuladas; concorrência usa PostgreSQL nativo local com conexões independentes. E2E usa Chromium desktop e viewport/toque de iPhone, com relógio controlado no cenário de foco. Nada disso é prova de e-mail/Auth real ou de minutos efetivamente focados no Supabase remoto.

Safari/iPhone físico e um cuidado remoto concluído com minutos permanecem pendentes. Para essa última verificação, entrar em B, concluir foco normal, escolher o cuidado e registrar um minuto; então recarregar e sair/entrar para conferir necessidades e histórico. Não foi criada uma sessão artificial nem alterado o relógio do Supabase. Limite atual: um bebê legado ativo por conta, conforme índice existente; sem NPCs, filhos novos, evolução para criança ou substituição do adulto de `/play`. Texto de infância/vida completa em telas históricas não representa implementação dessas fases.

## Arquivos

- Novos: `src/features/baby-care/{model,persistence}.ts`, `baby-care.tsx`, `baby-care.css`; `src/app/api/baby/route.ts`; `supabase/migrations/20261022021139_baby_care.sql`.
- Integração: `src/components/game.tsx`; `src/features/room/domain.ts` aceita IDs de cuidado no histórico; `persistence.ts` preserva o bloco de cuidados e expõe a transação compartilhada; `room-app.tsx` lê rótulos de cuidado no histórico compartilhado. Editor/renderer LPC e regras de alocação adultas intactos.
- Testes: `tests/unit/baby-care.test.ts`, `tests/integration/baby-care-database.test.ts`, `tests/integration/postgres-concurrency.test.ts`, `tests/e2e/baby-care.spec.ts`.
- Prova remota: `scripts/validate-baby-care-development.mjs` e `docs/deployments/2026-10-21-baby-care.json`.
- Documentação: este arquivo, `README.md`, `DEPLOYMENT.md`, `IMPLEMENTATION_STATUS.md` e `TEST_RESULTS.md`.
