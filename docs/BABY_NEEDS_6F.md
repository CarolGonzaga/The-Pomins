# Entrega 6F — necessidades e apresentação

## Diagnóstico antes de alterar o banco

`characters.needs` é JSONB (cinco valores inicialmente 75). No bebê, os seis
cuidados só adicionam valores e limitam em 100. Não há clock, último desgaste,
decay offline, timer de redução ou cron nas funções existentes. A redução lenta
relatada não corresponde a uma taxa baixa configurada: não há redução temporal
no caminho auditado. Trocas de snapshots/personagem não são passagem de tempo.

`baby_state_for_save` lê o estado; `baby_state` é compatibilidade. A API `/api/baby`
chama essas leituras e, para cuidados, `purchase_baby_care` ou o encaminhador
histórico `baby_care_for_save`. A função paga autentica, bloqueia conta, valida
save, bloqueia bebê e créditos FIFO; usa o catálogo versionado (2 minutos), aplica
efeitos, grava distribuições, recibo e evento atomicamente. Repetições históricas
não cobram novamente. O quarto LPC usa outro executor e não habilita esses
cuidados para adultos. Suas atividades adicionam energia/habilidades, não
reduzem necessidades por hora. A exploração local usa localStorage/Web Locks,
sem relógio de servidor e sem poder representar persistência confiável offline.

Leituras brutas de `characters` e o carregador de save transportam o baseline
armazenado, não uma projeção de necessidades em tempo real. A tela bebê busca o
DTO próprio de cuidados; essa será a fonte dos valores efetivos. O nascimento,
XP, habilidades, potenciais, prontidão para crescer e constância são separados.

## Primeira parte visual

Setas SVG estáticas e não interativas (`pointer-events:none`) indicam a borda
girante sem alterar medidas, gesto ou motor. A dica visível desaparece enquanto
a duração está bloqueada. Teclado, +/−, centro e descrição acessível permanecem.
Não há movimento adicional que precise ser desativado por preferência reduzida.

As barras têm limites 60/40 comuns, números e descrições Adequado/Atenção/Crítico,
com cores próprias para claro/escuro e pseudos nativos Safari/Firefox. O humor
é derivado dos valores não arredondados: média >=60 feliz, >=40 insatisfeito,
abaixo de 40 triste; qualquer valor <20 impede feliz. Não existe coluna de humor.
Somente olhos, sobrancelhas e boca variam no SVG existente. Aparência humana e
alienígena, cores, acessórios, roupas e antenas são preservados. Uma reação
gratuita é temporária; ao terminar retorna ao humor geral, sem comprar progresso.

## Backend e persistência

Migração local `20261029195215_elapsed_time_baby_needs.sql`, criada pela CLI.
Não aplicada remotamente. Acrescenta `characters.needs_settled_at` inicialmente
nulo e duas tabelas privadas com RLS e sem acesso de anon/authenticated:
`baby_need_rule_versions` e `baby_need_release`. A release nasce com ativação
nula e a versão candidata não tem effective_at. Portanto aplicar o SQL, por si
só, não ativa desgaste. Nenhum registro histórico é recalculado ou regravado.

A função privada pura `project_baby_needs` recebe um registro e um instante.
Os únicos chamadores públicos usam `clock_timestamp()`; nenhum payload permite
timestamp, preço, quantidade ou taxas. A âncora é o maior instante entre ativação,
nascimento e última liquidação. Valores são JSONB numeric, mantendo frações;
arredondamento só acontece na exibição, sem cruzar artificialmente 20/40/60.
Limites são 0–100. Versões publicadas são imutáveis e aplicadas por intervalos
efetivos, sem recalcular horas antigas pela taxa nova. A ativação não pode ser
movida para reiniciar o relógio. Administração futura exige operação autorizada.

`baby_state_for_save` passa a devolver valores efetivos em stats/character e um
`needs_clock` com horário do servidor, ativação e versão. A projeção não grava
desgaste ao ler. `baby_state` continua encaminhando pela compatibilidade. A API
existente ainda pode atualizar o metadado last_used_at ao resolver o save; isso
é comportamento anterior, separado da projeção. Não usar visitas como relógio.

`purchase_baby_care` mantém assinatura, autorização, validação de intenção,
ordem conta → personagem → créditos FIFO, catálogo e recibo. Acrescenta somente
projeção antes dos efeitos, adição numeric e gravação conjunta do novo baseline
e timestamp no UPDATE já existente. Débito/efeitos/histórico/liquidação têm o
mesmo commit ou rollback. O snapshot de distribuição registra o clock usado.
Replay retorna o recibo antigo e uma leitura atual; não liquida novamente nem
gera outro efeito. Caminhos antigos continuam bloqueados/encaminhados pela 6D-B.

O frontend aceita `needs_clock` opcional (compatível com o banco atual), rejeita
snapshots mais antigos mesmo com revisão igual, consulta a cada minuto visível
e ao reconectar/retornar. Não projeta tempo do dispositivo, não persiste humor,
não cobra em background e não troca keys do timer/Phaser. Offline, conserva a
última informação e a marca como não confirmada. Uma resposta iniciada antes
da queda não pode apagar esse aviso enquanto navigator continua offline.
Exploração local permanece sem autoridade temporal: não simula decay offline
com Date.now e informa essa limitação. Contas recuperam o tempo real no servidor.

Na futura 7A, preservar baseline fracionário e timestamp ao mudar de fase e
decidir explicitamente quais taxas serão infantis. Esta projeção é usada apenas
por bebês legacy. Não habilitar child com RPCs adultas que ainda convertem energia
para integer sem revisar esse contrato. Crescimento voluntário e requisitos de
30 minutos/quatro cuidados/nascimento não foram alterados pela 6F.

## Taxas candidatas e simulações

Não aprovadas para ativação remota. Simulação contínua, sem cuidados durante a
ausência, condições iniciais 75 (padrão existente), seguindo saciedade/higiene/
energia/afeto/diversão. Recuperação para **pelo menos 60 em cada necessidade**,
com o cuidado correspondente mais eficiente, custo de dois minutos. Fralda dá
24 pontos de higiene contra 20 do banho; os dois continuam disponíveis.

| Ausência | Saciedade | Higiene | Energia | Afeto | Diversão | Cuidados / foco |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 h | 70 | 72 | 71,4 | 72,4 | 71 | 0 / 0 min |
| 8 h | 55 | 63 | 60,6 | 64,6 | 59 | 2 / 4 min |
| 12 h | 45 | 57 | 53,4 | 59,4 | 51 | 5 / 10 min |
| 24 h | 15 | 39 | 31,8 | 43,8 | 27 | 8 / 16 min |
| 48 h | 0 | 3 | 0 | 12,6 | 0 | 14 / 28 min |
| 7 dias | 0 | 0 | 0 | 0 | 0 | 15 / 30 min |

Se começar em 100, ausência de 2/8/12 horas não exige recuperação até 60;
24 horas deixam 40/64/56,8/68,8/52 e exigem 3 cuidados/6 minutos;
48 horas deixam 0/28/13,6/37,6/4 e exigem 11 cuidados/22 minutos;
sete dias exigem 15 cuidados/30 minutos. Isso não promete retorno imediato a 100.
Esses custos supõem saldo já disponível e cuidados consecutivos. Necessidades
continuam evoluindo enquanto se conquista foco; perto de uma fronteira, o tempo
adicional pode exigir outro cuidado (por exemplo, o afeto após 48 horas).

| Necessidade | Pontos/h | Amarelo a partir de 75, após | Vermelho, após |
| --- | ---: | --- | --- |
| Saciedade | 2,5 | 6 h | 14 h |
| Higiene | 1,5 | 10 h | 23 h 20 min |
| Energia | 1,8 | 8 h 20 min | 19 h 26 min 40 s |
| Afeto | 1,3 | cerca de 11 h 32 min | cerca de 26 h 55 min |
| Diversão | 2,0 | 7 h 30 min | 17 h 30 min |

Os limites são estritos: exatamente 60 continua verde e exatamente 40 continua
amarelo. Os instantes da tabela representam a fronteira; a faixa seguinte começa
imediatamente depois. Recuperar um dia comum partindo de 75 custa menos que uma
sessão de 25 minutos; partindo de 100 custa seis minutos. Ausência longa converge
a 30 minutos para voltar às faixas adequadas. Recomenda-se validar esses valores
com sessões reais de uso autorizadas antes de aprovar a ativação, especialmente
o balanço entre saciedade, diversão e a vantagem da fralda sobre o banho.
Necessidades em zero só afetam apresentação; não causam morte, punição de
habilidades, exclusão ou encerramento. Constância permanece independente/inativa.

## Plano coordenado e recuperação

1. Revisar/aprovar o SQL e o balanceamento. Não fazer push ou deploy nesta tarefa.
2. Após autorização específica: confirmar projeto/histórico; preflight, snapshot
   cifrado atualizado e restauração isolada. Não testar gastos em contas reais.
3. Aplicar **somente** esta migração, com release inativa; verificar hashes dos
   dados anteriores, RLS/grants e compatibilidade das RPCs, sem db reset/replay.
4. Só então publicar os dois commits por avanço normal da main, após autorização
   de push. Validar o deployment correto; nenhum frontend exige uma RPC nova.
5. Aprovação separada das taxas/ativação: em transação administrativa, capturar
   uma única variável com clock_timestamp(), atribuir o mesmo instante a
   effective_at da versão 1 e activation_at da release, com guards de nulidade
   e versão. Não usar data de cadastro nem uma data anterior de implantação.
   Verificar primeiro que a release segue inativa. Não oferecer endpoint ao jogador.
6. Conferir ausência de retroatividade, privacidade, saldos e sessão pausada.
   Testes de compra só em contas dedicadas com autorização específica.

Se a migração falhar, seu BEGIN/COMMIT faz rollback completo. Antes de ativação,
republicar a versão anterior do app continua compatível; não remover colunas ou
tabelas com dados. Depois de ativar, preferir correção incremental. Uma versão
de taxas zero com novo effective_at pode suspender desgaste futuro sem apagar
intervalos anteriores; isso também exige autorização. Não mover a ativação,
regravar históricos ou restaurar banco real automaticamente. Recuperação integral
usa o backup verificado e um plano explícito, primeiro em instância isolada.

## Testes e limitações

Validação final em 29/10/2026: **477 casos aprovados**, sem contar repetições:
264 Vitest, 88 PostgreSQL nativos (28 da 6F, 24 fundação/constância, 25 cuidados
pagos e 11 concorrência), 125 Playwright em Chromium desktop/iPhone simulado.
Um caso de toque é ignorado no desktop e executado no mobile. As quatro suítes
PostgreSQL opcionais (88 casos) ignoradas no comando Vitest padrão foram
executadas separadamente nos clusters descartáveis. A execução completa final
do navegador terminou com 125 aprovados/um ignorado, após corrigir as falhas
descritas abaixo. Lint, TypeScript e build webpack isolado aprovados.

Dump/restauração comparados com sucesso: 33 tabelas na nova suíte e 31 em cada
uma das suítes anteriores de economia/cuidados. O servidor real da porta 3000
não foi reiniciado. A cópia em `.cache/ux-6c` usou gateway sintético em 3181 e
app em 3192, sem credenciais reais. O aviso de múltiplos lockfiles vem dessa
cópia de testes. Nenhuma evidência temporária integra os commits.

Os testes nativos
da nova migração incluem snapshot de todas as tabelas públicas antes/depois,
cuidados históricos, seis ações, intervalos 2/8/12/24/48/168 h, fusos, precisão,
compra após oito horas, requests concorrentes/repetidos, rollback injetado,
isolamento, rejeição de timestamps/preços enviados e versões imutáveis.
Dump/restauração local compara dados completos, incluindo as duas tabelas novas.
O teste de compra com ausência usa um clock histórico construído e revertido
somente na transação descartável; não existe override temporal na RPC pública.

Safari/PWA físico novo: conferir setas e giro sem alterar o tamanho; VoiceOver,
+/−/teclado quando disponível; claro/escuro e movimento reduzido; humano e
alienígena com os três humores; retorno após horas fora com perda de rede e
relógio do aparelho adulterado; reação gratuita voltando ao humor geral; compra
autorizada de dois minutos uma única vez; consistência em duas abas e saves.
A constância e o timer que a usuária já validou fisicamente devem ser rechecados
como regressão, sem declarar Chromium simulado como Safari físico aprovado.

Não houve acesso de escrita ao Supabase remoto. O backup remoto cifrado atualizado
e sua restauração continuam pré-requisitos pendentes da aplicação autorizada;
a restauração validada nesta entrega é dos bancos locais descartáveis.

## Revisão visual e segurança

A captura em 320 px revelou sobreposição do rótulo novo de humor com o texto
existente; foi corrigida reutilizando a linha de feedback original. O teste
offline encontrou uma corrida com respostas em andamento; o aviso agora segue
o estado de conexão até nova confirmação. A primeira versão do teste consultava
aria-valuenow como atributo explícito do meter nativo; a asserção foi corrigida
para value, preservando a semântica HTML e aria-valuetext.

O teste iPhone de duplo clique também expôs uma mudança de alvo: a confirmação
deslocava o layout e o segundo clique atingia Agora não. Preço e débito não eram
afetados, mas a confirmação desaparecia. Os comandos de aceitar/cancelar agora
ignoram a segunda parte do mesmo duplo toque; teclado e toques separados continuam
válidos. O rastreamento e o caso isolado comprovaram a correção.

Em 320 px ainda há pouco espaço entre os rótulos Moradores/Mais opções da barra
inferior existente. A estrutura/estilos dessa barra não foram alterados nesta
entrega; fica registrado para uma revisão de navegação específica. Os controles
e rotas continuam cobertos pela regressão e não há rolagem horizontal.

Os arquivos privados, backups, builds e screenshots continuam fora dos commits.
`.env.example` e os quatro documentos pendentes anteriores foram preservados.
Nenhuma migração anterior, asset LPC, dependência ou configuração remota mudou.

## Arquivos e consolidação

Interface: `src/features/focus-engine/focus-duration-dial.{tsx,css}`,
`src/components/characters/pomin.tsx`, `src/features/baby-care/baby-care.{tsx,css}`,
`presentation.ts`. Integração: `model.ts`, `needs-simulation.ts` na mesma feature,
a migração incremental e `scripts/compare-economy-restore.mjs`. Cobertura:
`tests/unit/baby-presentation.test.ts`, `baby-expression.test.ts`,
`elapsed-needs.test.ts`, `tests/integration/elapsed-needs-postgres.test.ts`,
`tests/e2e/baby-needs.spec.ts` e `tests/support/save-fixture.mjs`.
Documentação: este relatório e README. Nenhuma outra área de produto foi alterada.

Primeiro commit local: `102c3a9` —
`ui: clarify focus dial rotation and baby mood indicators`.
Segundo commit: `feat: add elapsed-time baby needs`, com migração, integração e
correções identificadas na regressão. Ambos aguardam autorização para publicação.
