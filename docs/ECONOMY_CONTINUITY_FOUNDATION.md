# Entrega 6D-A — fundação inativa de economia e constância

## Escopo e situação

Implementação local de 26/10/2026, posterior à consolidação 6C no commit
`587aeeab510c0333a8176688568f726402432225`
(`feat: improve game navigation and readability`).

A migração `20261026173537_economy_continuity_foundation.sql` foi aplicada
**somente ao Supabase de desenvolvimento** em 26/10/2026 às 18:21:03 UTC,
após autorização específica, backup cifrado, restauração e preflight aprovados.
O histórico contém a versão exata; não reaplicar. A fundação permanece inativa.
A consolidação local da fundação é separada da entrega de cuidados pagos 6D-B.
Não houve push, deploy ou mudança no servidor real da porta 3000. Consulte o
[relatório remoto](deployments/2026-10-26-economy-foundation-development.md).

Nenhum fluxo atual importa o módulo novo. Autenticação, saves, editor, Phaser,
Pomodoro, cuidados e distribuição continuam usando as implementações existentes.
Não há dependências adicionais, outra carteira, cron, observador automático,
notificação, regressão, encerramento ou cobrança nova.

## Modelo incremental

| Estrutura nova                   | Responsabilidade                                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `economy_rule_versions`          | Regras versionadas: obrigatório; 72/168/720 horas; 5%, teto 5 por habilidade; recuperação por foco válido. |
| `game_private.economy_release`   | Versão vigente e datas planejada/efetiva de ativação; efetiva obrigatoriamente nula na 6D-A.               |
| `account_continuity`             | Observação global por proprietário, última sessão válida, versão e revisão.                                |
| `save_continuity`                | Marco próprio da jornada, versão, revisão e preparação de encerramento.                                    |
| `inactivity_cycles`              | Identidade do ciclo por conta, versão, sessão de origem e pedido idempotente.                              |
| `character_continuity_baselines` | Futuro retrato das cinco habilidades na ativação, vinculado a conta/save/personagem.                       |
| `continuity_events`              | Aviso, regressão, recuperação e encerramento; contexto e ajustes separados do histórico original.          |
| `character_memorials`            | Futuro retrato consultável do personagem associado ao evento de encerramento da mesma conta e partida.     |
| `cosmetic_catalog`               | Metadados de recursos existentes gratuitos e extensão para recursos futuros.                               |
| `economy_offer_versions`         | Preços e efeitos versionados, sem oferta habilitada.                                                       |
| `economy_purchase_requests`      | Intenção, versão/preço referenciados ao catálogo, contexto e recibo futuro.                                |
| `economy_purchase_sources`       | Fontes propostas no ledger existente, com sessão e futura alocação; nunca um saldo.                        |
| `account_inventory`              | Item por proprietário e origem da compra, sem concessão efetiva na 6D-A.                                   |

São 13 tabelas novas, incluindo a tabela privada. Todas têm RLS; clientes
autenticados recebem somente leitura, filtrada por `auth.uid()` nas entidades
individuais. Catálogos podem ser lidos por qualquer conta autenticada. Nenhuma
permissão de escrita é concedida aos clientes. Funções privadas têm EXECUTE
revogado. A RPC pública de diagnóstico valida a identidade autenticada e nunca
recebe um identificador de conta do cliente.

Chaves estrangeiras compostas impedem misturar proprietários, saves, personagens,
sessões, eventos ou itens de compras incompatíveis. Pedidos têm unicidade por
conta e request ID; eventos têm unicidade por ciclo/contexto/tipo, inclusive com
campos nulos. Revisões e snapshots permitem futura aplicação com concorrência
controlada. As tabelas preparadas não criam um serviço de compra nesta etapa.

## Garantias de inatividade e compatibilidade

- Constraints bloqueiam datas efetivas de ativação, início de relógio, aplicação
  de eventos, fechamento, publicação de memoriais, habilitação de ofertas,
  confirmação de compras e concessão de inventário. Uma etapa futura precisará
  retirar explicitamente essas travas por migração autorizada.
- As contas existentes recebem uma **observação** da última sessão concluída,
  com `validated_ms >= planned_seconds * 1000` e `ended_at` não nulo. Não há
  reescrita de datas históricas nem consequência por sessões antigas.
- Saves existentes recebem um registro aberto com datas de ativação e início
  nulas. Baselines, ciclos, eventos, compras e memoriais permanecem vazios.
- Novas contas e saves não recebem observadores nesta etapa. A futura ativação
  deverá inicializá-los transacionalmente; não se deve tratar a ausência do
  registro preparatório como penalidade ou erro da experiência atual.
- `get_economy_foundation()` é somente leitura: retorna `active: false`, saldo
  calculado de `focus_credits`, ofertas inativas e última conclusão válida lida
  diretamente do histórico. Assim, o cache observacional inicial nunca é usado
  para decidir efeitos. O serviço TypeScript falha de forma fechada se o esquema
  não existir e não é chamado pelas telas atuais.
- Existem seis ofertas de cuidado a **2 minutos**, ainda desabilitadas. Os efeitos
  atuais por minuto estão identificados como rascunho, não como efeitos finais por
  compra. O fluxo antigo continua aceitando sua distribuição atual, inclusive um
  minuto: não houve ativação indireta de preços.
- Os 12 registros legados cobrem sete penteados, três roupas, cores RGB livres e
  personalização de bebê. Todos continuam gratuitos; não há assets novos ou
  exigência de possuir inventário para usar o editor existente.
- Fontes de compra são **planos sem reserva**, não comprovação de pagamento. A
  validação usa o mesmo bloqueio externo de perfil e depois o pedido, verifica
  proprietário, soma e eventual proveniência, sem atualizar créditos. Pedidos
  distintos podem planejar os mesmos créditos: a compra futura deverá revalidar
  o saldo real sob os locks existentes e registrar o consumo numa única transação.

## Projeções puras, sem efeitos

O módulo `src/features/economy-foundation/model.ts` valida contratos e contém
somente projeções para testes e para a futura política de servidor:

- limites exatos em segundos decorridos: 259.200, 604.800 e 2.592.000;
- sem ativação ou marco da jornada, nenhum tempo é projetado;
- âncora da jornada = maior instante entre ativação, marco próprio e foco válido;
  criar uma partida não redefine a âncora global das outras partidas;
- perda projetada = `min(5, floor(max(0, atual - baseline) * 5 / 100))` por habilidade.

O arredondamento para baixo é conservador e está explícito nos testes. Projeções
não são autorização, não alteram habilidades e não devem usar o relógio do browser
como autoridade. Recuperação, comunicação e aplicação real ficam para outra etapa.

## Verificação reproduzível

Os testes nativos recusam hosts externos, outro nome de banco e banco não vazio.
Executar somente em cluster PostgreSQL descartável, com papéis `anon` e
`authenticated` ainda inexistentes no cluster:

```powershell
# Defina POMINS_FOUNDATION_TEST_DATABASE_URL localmente para o banco descartável
# pomins_foundation_test. Não use credenciais ou URLs de desenvolvimento remoto.
npx vitest run tests/integration/economy-foundation-postgres.test.ts --maxWorkers=1
```

A suíte aplica as seis migrações anteriores, cria duas contas, múltiplos saves,
adultos, bebê, nascimento, créditos, alocação e sessão pausada. Só então aplica a
migração nova. Compara todas as linhas antigas, definições das funções e grants;
testa RLS, integridade, limites, idempotência, concorrência, rollback, gratuidade,
travas e contratos legados.

O ensaio local usa `pg_dump -Fc` e `pg_restore --exit-on-error` do PostgreSQL 17.11
em um segundo banco vazio, `pomins_foundation_restore`. O comparador
`scripts/compare-economy-restore.mjs` verifica as 31 tabelas, RLS, políticas,
constraints, funções, triggers e permissões efetivas. A ordem interna textual das
ACLs é normalizada; permissões diferentes continuam causando falha.

O workflow possui um job separado de PostgreSQL 17 para essa suíte e restauração,
evitando conflito de bootstrap com o cluster dos testes antigos. O workflow não
foi executado no GitHub nesta entrega, pois não houve push.

Para regressão no navegador, a fixture PGlite pode aplicar a migração após o seed
com `POMINS_TEST_ECONOMY_FOUNDATION=1`. Continua sendo Auth simulado e banco local,
sem equivalência a validação remota nem a Safari físico.

### Resultados efetivamente executados

- Consolidação 6C: lint, TypeScript e build aprovados; 193 testes locais e
  107 testes de navegador aprovados antes do commit (uma variante CDP pulada).
- Fundação 6D-A: suíte local com 206 testes aprovados. Os 28 testes que exigem
  PostgreSQL nativo são omitidos nesse comando e foram executados separadamente:
  17 da fundação em PostgreSQL 17.11 e 11 de concorrência legada em PostgreSQL 18.4,
  todos aprovados.
- Migração executada sobre dados representativos: todas as linhas antigas,
  definições de funções e permissões preservadas. Créditos, sessão pausada e
  revisões não são alterados pela migração ou por planos de compra.
- Dump e restauração PostgreSQL 17.11 aprovados, incluindo as 31 tabelas,
  políticas/RLS, constraints, funções, triggers e permissões efetivas.
- Lint sem avisos, Prettier, TypeScript e build de produção webpack aprovados.
  TypeScript/build usaram cópia isolada em `.cache`, sem substituir o `.next` do
  servidor real. O aviso de múltiplos lockfiles decorre dessa cópia isolada.
- Regressão final no navegador com a migração na fixture: **107 aprovados e um
  pulado**, em Chromium desktop e iPhone simulado (5,3 minutos). A variante pulada
  é o gesto CDP sem suporte no perfil desktop; o caso correspondente de toque
  executou no perfil iPhone. Inclui saves, sessão pausada, saldo, navegação,
  cuidados, LPC, seletor circular, limpeza de listeners Phaser e layouts 320–1280 px.
- Total final: **341 testes aprovados**, somando 206 locais, 28 PostgreSQL nativos
  e 107 de navegador, sem contar execuções repetidas.
- Os testes remotos somente leitura posteriores estão no relatório de aplicação.
  O workflow novo ainda não rodou no GitHub.
- Na checagem final, `http://localhost:3000/` recusou conexão. O servidor principal
  não foi iniciado, parado ou reiniciado nesta entrega. O build original foi
  preservado; a regressão usou servidor isolado na porta 3192, encerrado ao terminar.
  Disponibilizar novamente a porta 3000 permanece uma pendência operacional.

## Plano de aplicação em desenvolvimento — executado com autorização específica

1. Revisar o SQL e conferir o histórico remoto das seis migrações anteriores.
2. Repetir preflight somente leitura: schema, grants, créditos, alocações, sessões
   abertas/pausadas, saves e personagens. Não iniciar, terminar ou cancelar foco.
3. Criar backup cifrado atualizado, preservar material de recuperação fora do Git
   e validar restauração antes da mudança. O ensaio desta entrega usa apenas
   fixtures; não substitui backup atualizado do Supabase.
4. Obter autorização para esta migração exata (recebida e executada). Aplicar como migração única,
   transacional, com timeout curto de locks. Falha implica rollback; não forçar
   execução sobre bloqueios em sessões reais.
5. Comparar fingerprints dos dados antigos, saldo, sessões, funções, grants e
   estado dos saves. Verificar RLS com contas de teste e diagnóstico inativo.
6. Registrar versão aplicada e resultado. Não ativar regras, cron ou preços.

Não há down migration destrutiva. Antes de aplicar, a reversão segura é não
aplicar. Depois, manter estruturas inativas permite continuar usando a versão
anterior do aplicativo; qualquer remoção deve ser planejada separadamente,
preservando os registros eventualmente coletados.

## Próxima etapa: cuidados pagos

Preparar uma RPC autenticada de intenção, preço e efeitos de versão definidos no
servidor, FIFO dos créditos existentes e ordem de locks compatível. Na mesma
transação: validar conta/save/personagem, comparar payload de retries idempotentes,
revalidar saldo, registrar alocações e fontes, aplicar efeitos uma única vez e
emitir recibo. Testar concorrência contra cuidados e distribuição legados, falhas
transacionais e resposta perdida. Só depois planejar a ativação autorizada e fechar
os caminhos antigos que permitiriam contornar preços. Interações visuais gratuitas
continuam separadas da evolução persistente.

Constância, regressão recuperável, encerramento e consulta de memoriais exigem
etapas próprias, captura de baseline no instante de ativação e testes de acesso
a jornadas encerradas. Nenhuma delas está implementada ou ativa nesta entrega.
