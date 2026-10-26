# Entrega 6D-B — cuidados pagos de preço fixo

## Situação

Implementação sobre a fundação 6D-A. O usuário informou a aplicação manual de
`20261026183003_fixed_price_baby_care.sql`. A conferência somente leitura em
26/10/2026 às 19:45 UTC confirmou os corpos das cinco funções, seis preços ativos
de dois minutos, constraints validadas e trigger de imutabilidade correspondentes
ao arquivo local. O catálogo autenticado está disponível.

O histórico foi regularizado pela CLI, com autorização específica, usando apenas
`migration repair 20261026183003 --status applied`. A listagem confirmou a versão
em LOCAL e REMOTE. Na consolidação, novas consultas somente leitura confirmaram
as assinaturas, grants autenticados, `search_path` vazio e bloqueios dos caminhos
antigos. O reparo não reaplicou o SQL e não executou `db push`. Não repetir o reparo.
O código está preparado para consolidação local; não houve push, deploy ou publicação no Preview.
Os testes de escrita usam dados descartáveis; nenhum minuto real foi consumido
pelo agente.

Antes da implementação, foram preservadas as alterações pendentes da 6D-A,
`.env.example` e `docs/VERCEL_PREVIEW_6B.md`. Nenhuma migração anterior foi editada.

## Preços e efeitos

| Atividade     | Comando             | Preço |
| ------------- | ------------------- | ----: |
| `baby_feed`   | Alimentar           | 2 min |
| `baby_bath`   | Dar banho           | 2 min |
| `baby_diaper` | Trocar fralda       | 2 min |
| `baby_play`   | Brincar             | 2 min |
| `baby_cuddle` | Dar carinho         | 2 min |
| `baby_sleep`  | Colocar para dormir | 2 min |

O catálogo recebe a versão 2, sem alterar os rascunhos inativos da versão 1.
Cada oferta guarda o snapshot dos efeitos e da versão das regras de cuidados.
Os efeitos atuais por minuto são aplicados por dois minutos por cuidado, uma
única vez. Por exemplo, alimentar parte de 75 de saciedade e chega a 99, com
dois minutos de progresso. Não se recalcula nenhum cuidado histórico.

Versões de cuidado publicadas são imutáveis em preço, identidade e efeitos,
inclusive depois de desabilitadas. Mudanças futuras exigem nova versão. Ofertas
podem ser desabilitadas sem reabrir os caminhos antigos de cobrança arbitrária.
RPC e catálogo escolhem a versão habilitada vigente, ignorando rascunhos futuros.
Nesta entrega, RPC e contrato do frontend exigem exatamente dois minutos. Um
preço diferente no futuro precisará de alteração coordenada desses contratos,
além de uma nova versão de oferta; não mudará silenciosamente por configuração.

## RPC, saldo e comprovante

`purchase_baby_care(p_save uuid, p_payload jsonb)` aceita apenas:

```json
{ "requestId": "UUID", "characterId": "UUID", "activity": "baby_feed" }
```

O cliente não escolhe preço, minutos, versão, proprietário ou sessões de origem.
Campos extras são rejeitados também pelo PostgreSQL, não apenas pelo formulário.

Na mesma transação:

1. Autentica por `auth.uid()` e bloqueia o perfil, como a economia existente.
2. Valida propriedade/save ativo e bloqueia o bebê elegível da partida.
3. Reconhece retries pelo identificador e compara a intenção original.
4. Obtém preço/efeitos no catálogo do servidor, exige preço de dois minutos e
   confere o saldo global em `focus_credits`.
5. Seleciona créditos disponíveis em FIFO por `created_at, session_id`, com locks;
   uma cobrança pode atravessar duas sessões e usar crédito vindo de outro save.
6. Registra `allocation_requests` e `focus_allocations`, com save/personagem de
   destino explícitos. Vincula `economy_purchase_requests` e
   `economy_purchase_sources` às mesmas alocações, sem criar carteira ou reserva.
7. Atualiza necessidades, habilidades, potenciais e progresso com os efeitos
   versionados; registra `BabyCare` no histórico e os snapshots das alocações.
8. Confirma a compra e retorna estado, saldo nos créditos e comprovante persistido.

O comprovante inclui compra/pedido, save/personagem, atividade, versão, dois minutos
cobrados, saldo após a compra, data e cada sessão/alocação que financiou o cuidado.
Em retry, o comprovante é o original e o estado/saldo retornados são atuais.

O lock externo de conta continua anterior aos locks de personagem e créditos.
Assim, distribuição adulta, cuidados em saves diferentes e retries disputam o
mesmo saldo sem gastar os mesmos minutos. Erros propagam e desfazem débito,
alocações, atributos, revisões, eventos e comprovante. Não há chamada de rede ou
efeito visual dentro da transação.

## Idempotência e caminhos antigos

- Unicidade por proprietário/request ID e lock de perfil serializam retries.
  Repetir a intenção retorna o comprovante original mesmo com saldo zero;
  reutilizar o mesmo ID com outra intenção é rejeitado.
- `baby_care_for_save` torna-se um adaptador para o mesmo executor. O wrapper
  anterior `baby_care` já passa por ele e não conserva uma cobrança independente.
- Novos pedidos com `lines` são bloqueados, mesmo oferecendo dois minutos.
  Um pedido histórico com `lines` só é reconhecido se o payload original, conta,
  save, personagem e alocações existentes conferirem. Esse caminho é só leitura.
- Distribuição adulta já exige personagem LPC e atividade compatível; não serve
  de caminho alternativo para persistir cuidados de bebê.
- O frontend conserva o request ID em `sessionStorage`, separado por conta/save/
  personagem. Ref síncrona e estado de processamento bloqueiam cliques duplicados.
  Recarregar ou perder a resposta não cria um novo pedido automaticamente.
- Falhas SQL definitivas retornam conflito e permitem atualizar o saldo. Falhas
  de rede/estado desconhecido retornam indisponibilidade e preservam o pedido
  para conferência. O cliente não presume rollback quando a confirmação se perde.

## Interface e compatibilidade antes da ativação

- Seis reações visuais continuam gratuitas e não alteram progresso persistido.
- As opções mostram o custo; o botão principal usa `Alimentar · 2 min`, sem campo
  numérico. O saldo permanece o mesmo da conta e do quarto.
- Primeiro gasto tem explicação e confirmação explícitas. A ciência do custo é
  lembrada localmente por conta após sucesso; ações seguintes são diretas, com
  preço no botão. Esse registro não define o preço nem autoriza débito no banco.
- Sem saldo, o botão de gasto fica desabilitado; a reação gratuita e o acesso ao
  painel de foco permanecem disponíveis. Abrir o painel não inicia ou retoma foco
  automaticamente. O cronômetro continua com sua lógica e controles existentes.
- A API só escreve se o catálogo novo existir e for válido. Antes da migração,
  mantém leitura/reações e mostra indisponibilidade do cuidado pago. Não faz
  fallback para a antiga RPC que permitiria um valor arbitrário.
- Exploração local usa o ledger local existente e simula a mesma cobrança fixa,
  com recibo e replay; não representa recompensa oficial do Supabase. Pedidos
  históricos locais são apenas conferidos, sem novas cobranças arbitrárias.

## Migração e segurança

A migração é incremental. Altera duas travas da fundação para permitir somente
ofertas de cuidados e compras de cuidados confirmadas por dois minutos. Acrescenta
seis ofertas, duas RPCs, um helper privado e um trigger de imutabilidade; adapta
o executor antigo e o diagnóstico de catálogo para refletir o preço ativo.

Não modifica schema de saves, RLS ou dados históricos. As permissões das tabelas
continuam somente leitura para clientes. RPCs novas são autenticadas, com
`search_path` vazio e autorização explícita por conta/save/personagem; `anon` não
as executa. Helper privado não é acessível aos clientes. O diagnóstico distingue
ofertas pagas de cuidados da constância, que permanece inativa.

Permanecem todas as travas de ativação da constância, ciclos, regressões,
encerramentos, publicação de memoriais, cosméticos e concessão de inventário.
Não há cron, segunda carteira, novo motor de foco ou alteração das datas de foco.

Pendências de segurança: revisar os Advisors após uma aplicação autorizada.
Os alertas anteriores sobre RPCs intencionais `SECURITY DEFINER` e proteção de
senhas vazadas estão no relatório da 6D-A e não foram modificados nesta entrega.
Não foram inseridas senhas/chaves em código, documentação ou commits.

## Verificação

`tests/integration/fixed-price-care-postgres.test.ts` aceita somente um banco vazio
`pomins_paid_care_test` em loopback. Aplica as migrações anteriores, cria um cuidado
histórico de um minuto e só depois aplica a migração nova. Testa todos os cuidados,
preço, insuficiência, saldo exato, FIFO, múltiplas sessões, retries, concorrência,
falha tardia e rollback, isolamento, caminhos antigos, histórico, restauração por
nova conexão, imutabilidade de preços e travas que devem continuar inativas.

Há concorrência real entre conexões PostgreSQL, inclusive contra a distribuição
adulta e entre dois saves. A falha injetada ocorre depois dos débitos e efeitos,
para comprovar a reversão transacional. Nenhum desses testes usa conta real.

O ensaio de dump/restore em PostgreSQL 17 compara dados, RLS, políticas, constraints,
funções, triggers e permissões. CI tem job separado para o banco de cuidados pagos,
evitando conflito com o bootstrap de papéis dos testes de fundação/concorrência.
Esse workflow não foi executado no GitHub, pois não houve push.

Testes de API simulam catálogo ausente, autenticação, manipulação de preços e
falhas ambíguas. Navegador cobre confirmação, duplo clique, resposta perdida,
retry, saldo zero, reações gratuitas, restauração e logout/login simulado,
incluindo viewport de iPhone. Isso não valida Safari em dispositivo físico.

### Resultados executados em 26/10/2026

- **216 testes locais** aprovados. As 53 verificações nativas omitidas por esse
  comando foram executadas separadamente, sem uso de banco remoto.
- **25 testes novos no PostgreSQL 17.11** aprovados, com conexões independentes,
  mais 17 da fundação e 11 de concorrência legada, também aprovados.
- Dump e restauração dos bancos descartáveis conferidos, incluindo dados,
  funções, constraints, RLS, políticas e permissões efetivas.
- **109 testes de navegador aprovados e um pulado** na regressão completa,
  Chromium desktop/iPhone simulado. O caso pulado depende de CDP touch no perfil
  desktop; a variante de toque roda no perfil iPhone. Total sem repetir execuções:
  **378 testes aprovados**.
- Depois de compactar os textos de preço e sucesso, oito testes focados de
  cuidados/retry foram novamente aprovados nos dois perfis; não entram novamente
  na soma. O comprovante completo permanece no retorno da API e no banco.
- A regressão encontrou e permitiu corrigir dois rótulos de foco em conflito:
  o atalho de cuidados não deve competir com `Iniciar foco` do cronômetro nem
  remover `Abrir foco` da experiência legada. Os testes antigos foram preservados
  nesse comportamento; só as expectativas de cobrança mudaram para dois minutos.
- Lint, TypeScript e build de produção webpack aprovados em cópia isolada. O
  aviso de múltiplos lockfiles decorre dessa cópia em `.cache`; o build original
  e o servidor principal não foram substituídos.
- Consulta remota anterior à aplicação manual, **somente leitura**: migração 6D-A idêntica ao arquivo
  local, migração 6D-B ausente; três contas, cinco saves, seis personagens, seis
  sessões, uma pausada, 11 distribuições, 36 minutos elegíveis e 34 distribuídos.
  Permanecem **dois minutos disponíveis**. Nenhum cuidado remoto foi executado.

Conferência posterior à aplicação manual (19:45 UTC): as 12 verificações de
integridade passaram; há sete sessões, uma pausada, 11 distribuições e **quatro
minutos disponíveis no total das contas do projeto** (38 elegíveis, 34 alocados).
Não há compras confirmadas, regressões, memoriais ou concessões de inventário;
a ativação da constância permanece nula. O saldo mudou por uso externo entre as
conferências, não por testes de cuidado executados pelo agente.

Arquivos específicos: `src/app/api/baby/route.ts`, os três arquivos TypeScript de
`src/features/baby-care/`, contrato do diagnóstico em
`src/features/economy-foundation/model.ts`, a nova migração, testes de API/domínio/
navegador/PostgreSQL, fixture e gateway de testes, comparador de restauração e
job de CI. As alterações pendentes anteriores permanecem separadas, sem staging.

## Consolidação local de 26/10/2026

Com autorização, a fundação 6D-A foi versionada separadamente em
`1126fc3f0c66ec42752f92d33f06ee534a8cf6e4`. A árvore candidata da 6D-B contém
somente seus 17 arquivos; `.env.example`, documentação de Vercel e planejamento
6D-C1 ficam fora desse commit. Segredos e backups permanecem ignorados.

As cópias exatas das árvores candidatas foram verificadas, sem substituir o build
do servidor principal. A 6D-A passou em 206 testes locais e 17 nativos; a 6D-B
passou em lint, TypeScript, build, 216 testes locais, 53 nativos (25 de cuidados,
17 de fundação e 11 legados) e 109 de navegador, com uma variante CDP pulada.
O total da validação 6D-B é 378 aprovados, sem somar execuções repetidas.
Uma primeira tentativa no navegador parou por timeout na fixture local;
reiniciá-la no mesmo contexto dos testes resolveu o transporte e a suíte completa
foi repetida com sucesso. Os ensaios de dump/restore também passaram.

O SQL aplicado não foi editado para eliminar uma linha vazia final; essa foi a
única exceção aceita na checagem de whitespace. O Git normaliza terminadores de
linha, sem alterar instruções. O arquivo de trabalho mantém seu SHA-256
`4cbc6c6738fcad71d1116e8db9044db5dd1e18b04d61da64c52992f383018fce`.

No remoto, só houve consultas: assinatura `purchase_baby_care(p_save uuid,
p_payload jsonb)`, execução para autenticados, bloqueio para anônimos,
`SECURITY DEFINER` com `search_path` vazio e adaptadores antigos confirmados.
Nenhum `repair`, `db push`, SQL de migração ou cuidado pago foi executado nesta
consolidação. Constância/penalidades continuam inativas e não há compras.

O saldo inicial era quatro minutos. Às 20:23:37 UTC foi registrada uma nova
conclusão válida de dez minutos (600 segundos, 600.000 ms validados) por atividade
externa a essas verificações. Na leitura final: **14 minutos disponíveis**, 48
elegíveis, 34 distribuídos, 11 distribuições e a mesma sessão pausada. As 12
checagens de integridade passaram. O novo crédito foi preservado integralmente.

## Plano de ativação no desenvolvimento — registro histórico, não reaplicar

1. Revisar o SQL local exato, história aplicada e Advisors. Não reaplicar a 6D-A.
2. Criar backup cifrado **atualizado**, validar restauração isolada e ensaiar esta
   migração sobre o estado real, verificando histórico, saldo e sessão pausada.
3. Obter autorização específica para `20261026183003_fixed_price_baby_care.sql`.
4. Repetir preflight e aplicar só essa migração, transacionalmente, com timeouts
   curtos e registro de versão. Nenhuma migração cobra minutos por si só.
5. Conferir as seis ofertas, bloqueio dos caminhos antigos, SQL, RLS, grants e
   preservação do saldo e sessões. Constância e demais consequências continuam
   inativas. Não testar gastos nos dois minutos reais sem autorização adicional.
6. Validar gravação numa conta de teste autorizada com saldo obtido pelo fluxo de
   foco válido. Combinar a migração com a disponibilização do novo frontend/API:
   antes dela o frontend novo falha fechado; depois dela o cliente antigo não
   consegue registrar cuidados arbitrários. Pode haver indisponibilidade de
   gravação de cuidados durante essa transição, sem perda de histórico.
7. A aplicação manual e o reparo do histórico já ocorreram; não repetir os passos
   de aplicação acima. A consolidação valida o estado existente somente por leitura.
   Publicação no Preview e consumo de saldo real exigem suas autorizações
   correspondentes; não estão incluídos nesta entrega. O servidor principal não
   foi reiniciado; os testes usaram um servidor isolado na porta 3192.

Se for necessário suspender cuidados, desabilitar as ofertas numa operação
autorizada e preservar os adaptadores que bloqueiam preços arbitrários. Não
reinstalar o executor antigo como rollback, nem recalcular compras históricas.
