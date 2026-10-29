# Hotfix 6F/6G — necessidades decimais e compatibilidade de clientes

## Causa e contratos

A projeção PostgreSQL preserva frações em JSONB numeric, mas o frontend usava
`z.number().int()` nas necessidades do bebê e no contrato compartilhado do quarto.
`babyApi` validava a resposta com esse schema e rejeitava um DTO correto após
qualquer intervalo fracionário de desgaste. Os testes anteriores cobriam SQL
decimal e UI com snapshots inteiros separadamente, deixando essa ligação descoberta.

`features/character-needs/model.ts` centraliza valores finitos de 0 a 100.
Bebê, quarto, personagem carregado de save e o personagem incluído no DTO de
cuidados usam esse contrato. Inteiros antigos continuam válidos. Não há coerção,
clamp ou arredondamento no parser; negativos, valores acima de 100, strings,
null, NaN e infinitos são rejeitados. JSON transforma valores não finitos em
null, que também é rejeitado. O schema de criação não ganhou campos de estado.

Efeitos do catálogo, habilidades, traços, minutos, preços, revisões e contadores
continuam inteiros. Não se deve usar o schema decimal de estado para validar os
efeitos por minuto. Os efeitos existentes e o preço fixo de dois minutos não
mudaram. Pedidos continuam enviando somente identidade/atividade/request ID,
nunca o baseline, preço, quantidade, horário ou necessidade calculada no browser.

PostgreSQL continua como autoridade numeric. O frontend mantém números JavaScript
sem quantização adicional, dentro da representação IEEE-754/JSON existente;
não oferece precisão decimal arbitrária. A interface não reenvia esses números
para liquidar saldos ou necessidades. `needDisplay` arredonda somente rótulos;
média emocional, limiar individual de 20 e bandas 40/60 usam valores originais.

## Abas, PWA e deployments anteriores

Um deploy não substitui o JavaScript já carregado. O Service Worker existente
usa navegação pela rede e cacheia ícones, assets e chunks com URLs próprias.
Ele não cacheia APIs ou HTML autenticado. Chunks antigos continuam presentes
para abas antigas; instalar uma PWA tampouco garante que ela já foi reaberta.
Como o SW não mudou neste hotfix, não se depende do seu aviso de atualização.

A barreira preparada tem dois níveis:

1. `babyApi` envia `x-pomins-needs-version: 2`. O novo `/api/baby`, depois de
   autenticar e verificar origem de escritas, rejeita versão ausente/desconhecida
   com HTTP 426 **antes** de resolver o save ou chamar uma RPC. A resposta é
   `private, no-store` e explica atualizar, pausando manualmente o foco antes de
   recarregar. Não há reload, logout, cancelamento ou pausa automática.
2. O novo servidor envia o mesmo contrato ao PostgREST somente nos pedidos de
   cuidados. Na proposta SQL 6F, `require_baby_need_client` bloqueia leitura e
   compra incompatíveis **quando o desgaste estiver ativo**. Isso cobre chamadas
   encaminhadas por um deployment antigo, que não possui a barreira HTTP.
   Os aliases antigos chegam ao mesmo executor/estado e não escapam da proteção.

O header é negociação de formato, não autorização nem segredo. Auth, propriedade,
RLS, save/personagem, catálogo, saldo e idempotência mantêm suas validações.
O helper privado não concede execução direta a anon/authenticated.

O caller bloqueia primeiro a conta; o helper mantém um lock SHARE na release
até o fim da transação, antes do personagem e dos créditos FIFO. A ordem relativa
conta → personagem → créditos permanece. A ativação por UPDATE da release não
pode atravessar uma compra antiga aceita enquanto a release ainda era inativa.
Ela aguarda a conclusão ou falha por lock timeout, sem interromper o foco.
O teste nativo de concorrência confirma esse bloqueio e faz rollback das duas
transações artificiais. Não se bloqueia a conta depois de bloquear a release.

Sem ativação, a RPC mantém compatibilidade com servidores antigos e retorna
baseline inteiro. Depois da ativação, um servidor antigo não pode gastar e só
depois descobrir que o cliente não aceita a resposta. Uma aba antiga pode exibir
uma mensagem genérica de leitura, pois seu código não pode ser corrigido à
distância; deve terminar/pausar o foco explicitamente e recarregar/reabrir a PWA.
O novo cliente preserva a mensagem 426. Pedidos pendentes mantêm o mesmo ID e
podem ser conferidos após atualizar, sem duplicar um gasto anteriormente confirmado.

## Migração local

Foi revisado **somente** o arquivo ainda não aplicado
`20261029195215_elapsed_time_baby_needs.sql`, acrescentando o helper e suas chamadas
antes de qualquer débito. As taxas 2,5/1,5/1,8/1,3/2,0 não foram alteradas.
Release e effective_at continuam inicialmente nulos; aplicar o SQL não ativa
desgaste. Nenhuma migration já aplicada foi modificada, nenhum histórico remoto
foi reparado e não houve operação no Supabase remoto neste hotfix.

O conteúdo/hash da proposta mudou em relação à autorização anterior. Uma futura
execução deve revisar esta versão e seu hash, usando backup/preflight novos;
não reutilizar provas preparadas para o SQL anterior. Os três commits anteriores
permanecem intactos; a consolidação usa um quarto commit local separado.

## Plano de publicação revisado

1. Autorizar o conjunto de quatro commits e a proposta 6F revisada. Confirmar
   projeto de desenvolvimento, remoto e avanço direto, preservando pendências.
2. Refazer preflight de vínculos, saldo, distribuições e sessões. Não interromper
   sessões ativas para cumprir o procedimento; aguardar um momento apropriado.
3. Fazer backup cifrado atualizado, recuperar sua chave e restaurar em banco
   isolado. Comparar dados, funções, permissões e integridade. Qualquer falha para
   a execução. A restauração local de fixtures não substitui esse backup remoto.
4. Aplicar somente a proposta 6F revisada, com a release **inativa**. Comparar
   histórico, schema, RLS, grants e dados anteriores, sem compras em contas reais.
5. Publicar os quatro commits por push normal de main e aguardar Vercel Ready.
   Conferir SHA, domínio, Supabase de desenvolvimento e callbacks existentes.
6. Validar novos clientes contra a release inativa e verificar negociação de
   protocolo no BFF/PostgREST. Testar cabeçalhos ausentes em clientes antigos
   com contas próprias de teste. Não consumir créditos das contas existentes.
7. Em operação separada autorizada, gravar effective_at e activation_at no mesmo
   instante do servidor e na mesma transação, sem data retroativa. Confirmar as
   taxas aprovadas; não habilitar cron, regressão ou encerramento.
8. Verificar que abas antigas contra o novo servidor recebem 426; contra servidor
   antigo, a RPC deve rejeitar antes do débito. Usuários atualizam explicitamente,
   preservando o foco pausado e o pedido pendente. Revalidar saldos e sessões.

Depois da ativação, rollback para frontend antigo não restaura compatibilidade:
a barreira evita novos gastos, mas os cuidados podem ficar indisponíveis até
reimplantar o cliente compatível. Não resetar baseline ou retroceder activation_at
para mascarar isso. O marco é imutável; eventual recuperação exige plano próprio,
preservando gravações posteriores ao backup.

## Validação e limites

O cenário obrigatório usa as migrations reais e um banco PGlite descartável:
RPC → route handler Next → serialização JSON → `babyApi`/parser. Autenticação e
transporte são simulados; SQL, débito, efeitos, recibo, replay e restauração do
save são reais nessa fixture. PostgreSQL nativo cobre os mesmos DTOs, transações,
precisão, isolamento e concorrência, incluindo a disputa com ativação.

O navegador terá duas execuções distintas: regressão com release inativa e
cenário decimal em gateway local separado com ativação artificial. Nunca se
ativa o projeto real para testar. As capturas e logs ficam ignorados em `.cache`.

Resultados em 29/10/2026: **537 casos distintos aprovados**, sem somar repetições:

- `npm run lint` e `npm run typecheck`: aprovados.
- `npm test`: 298 aprovados. Os 90 casos PostgreSQL opcionais ignorados nesse
  comando foram executados separadamente, em quatro clusters descartáveis.
- PostgreSQL nativo: 30 necessidades/compatibilidade, 24 fundação/constância,
  25 cuidados e 11 concorrência; total 90. Backup/restauração das fixtures
  comparados: 33 tabelas na suíte 6F e 31 nas de fundação/cuidados.
- Playwright com release inativa: 145 aprovados. Os quatro casos decimais foram
  ignorados nessa execução e passaram depois em uma fixture separada ativa.
  Um caso de toque foi omitido somente no desktop e passou no mobile.
- Playwright com release ativa somente na fixture: quatro aprovados, cobrindo
  estado decimal real, API e UI, compra de dois minutos, replay, recarga e aviso
  426 sem substituir o timer, alterar saldo ou navegar automaticamente.
- Build Next.js webpack isolado: aprovado. O aviso de múltiplos lockfiles vem
  da cópia `.cache/ux-6c`, que usa gateway 3181 e app 3192 com credenciais falsas.

O teste inicialmente incompatível da publicação anterior foi transformado em
regressão versionada: agora o parser aceita tanto o DTO inativo quanto o ativo.
As fixtures explicitam o protocolo; os testes negativos omitem ou adulteram esse
header. O teste de ativação concorrente comprova que a release não muda no meio
de uma compra antiga já aceita. Não foi necessário criar nova biblioteca.

Nenhuma escrita ou consulta ao projeto Supabase remoto foi executada neste
hotfix. Os 15 minutos e as sessões existentes não foram usados pelos testes;
eventual uso humano simultâneo deve ser medido novamente no futuro preflight.

Safari/PWA físicos continuam pendentes: aba aberta antes do deploy, instalação
antiga, retorno após bloquear o aparelho, perda de rede, aviso 426 e atualização
explícita com foco pausado. Chromium simulado não comprova esses cenários no iOS.
Nenhuma taxa, penalidade, sessão ou crédito de conta existente foi alterado.

## Arquivos desta correção

- README.md
- src/app/api/baby/route.ts
- src/features/baby-care/baby-care.tsx
- src/features/baby-care/model.ts
- src/features/baby-care/persistence.ts
- src/features/game-saves/loading.ts
- src/features/room/domain.ts
- src/lib/supabase/server.ts
- supabase/migrations/20261029195215_elapsed_time_baby_needs.sql
- tests/integration/elapsed-needs-postgres.test.ts
- tests/support/save-fixture.mjs
- tests/support/save-gateway.mjs
- tests/unit/game-save-routes.test.ts
- tests/unit/paid-care-routes.test.ts
- docs/FRACTIONAL_NEEDS_HOTFIX.md
- src/features/character-needs/model.ts
- src/lib/needs-protocol.ts
- tests/e2e/fractional-needs.spec.ts
- tests/integration/fractional-needs-contract.test.ts
- tests/unit/fractional-needs.test.ts

SHA256 do SQL normalizado em LF: 58990743f59cc5efc2368cb22956f61c1e41656777b8919ee3e3793f0ebf1c00.
