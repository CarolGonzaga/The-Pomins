# Aplicação 6D-A — Supabase de desenvolvimento

## Identificação e escopo

- Projeto autorizado: `ogzgfkxhxdrwemdzxskg`, PostgreSQL 17.11, conexão Session
  Pooler com validação TLS e conferência estrita do identificador do projeto.
- Única migração aplicada: `20261026173537_economy_continuity_foundation.sql`.
- Identificador registrado: `20261026173537`, nome `economy_continuity_foundation`.
- Aplicação: **26/10/2026 18:21:03 UTC** (15:21:03 em São Paulo).
- SHA-256 do arquivo e do SQL registrado:
  `c73f2a2865e05bbedfc46a0087b485256d7478cddc31d06521f945bbf510e83b`.
- SQL e histórico registrados atomicamente, com reload de schema do PostgREST.
  DDL até commit: 3.409 ms. Nenhuma migração anterior foi modificada ou reaplicada.
- Sem reset, commit Git, push, deploy ou alteração de outro projeto.

## Backup cifrado e ensaio de recuperação

Backup válido em pasta privada ignorada pelo Git:
`secrets/backups/economy-6da-2026-10-26T18-18-22.733Z/`.

Contém `backup.dump.aes`, `key.dpapi`, `manifest.json`, prova do ensaio, catálogo
esperado, recibo de aplicação e postflight. Nenhum valor de credencial está neste
relatório. A pasta possui ACL restrita ao usuário Windows que executou o backup
e SYSTEM. Não publicar esses arquivos ou o cluster de restauração local.

- Escopo: **45 tabelas** de `public`, `auth`, `game_private` e
  `supabase_migrations`, incluindo histórico de Auth e de migrações.
- Snapshot transacional consistente exportado para `pg_dump -Fc`.
- Cifra AES-256-GCM; chave protegida por Windows DPAPI CurrentUser. Recuperação
  da chave testada antes da restauração; IV e tag ficam no manifesto privado.
- SHA-256 do ciphertext:
  `42476c5e4a686d562aba9c64358c7d26e09c00c015a7d24b44449c754652f2ea`.
- Decriptação autenticada em stream para `pg_restore --single-transaction
--exit-on-error`, sem dump plaintext intermediário.
- Destino exclusivamente local e isolado: PostgreSQL 17.11 na interface loopback,
  banco `pomins_6da_restore`; o cluster foi parado após o ensaio.
- As 45 tabelas tiveram contagens e fingerprints de todas as colunas conferidos.
  Colunas, constraints, índices, RLS, políticas, funções, triggers e permissões
  efetivas também conferiram.
- A primeira tentativa de comparação rejeitou a numeração física interna de
  colunas removidas anteriormente. O verificador foi corrigido para comparar
  ordem lógica e definição. Um **novo backup e ensaio completo** passaram antes
  de qualquer aplicação remota. Não se alterou o schema para acomodar o teste.
- A migração exata foi ensaiada sobre essa restauração real, preservando os dados
  e objetos anteriores e produzindo o catálogo usado para comparar o remoto.

O backup é lógico e tem o escopo acima; não representa cópia de arquivos do
Storage, funções Edge ou configurações do Dashboard. A migração não altera esses
recursos. DPAPI exige o mesmo contexto de usuário Windows para recuperação; uma
cópia em outra máquina sem material de recuperação do usuário não é suficiente.

## Preflight e preservação

Foram aprovadas **12 verificações de integridade**, repetidas imediatamente antes
da aplicação e depois dela: vínculo perfil/Auth; propriedade do save; residência
principal; protagonista; contexto da residência; contexto do personagem; contexto
da sessão; validade dos créditos; créditos ausentes; contexto das distribuições;
soma das distribuições por crédito; constraints não validadas. Todas retornaram
zero inconsistências.

As cinco versões anteriores do histórico permaneceram intactas. A migração de
bebê antiga difere do arquivo local somente por uma quebra de linha final; as
demais versões incrementais comparadas são idênticas. Isso não motivou alteração
de arquivos, reparação de histórico ou reaplicação.

| Estado existente     | Antes | Depois |
| -------------------- | ----: | -----: |
| Contas               |     3 |      3 |
| Saves                |     5 |      5 |
| Personagens          |     6 |      6 |
| Sessões de foco      |     6 |      6 |
| Sessões ativas       |     0 |      0 |
| Sessões pausadas     |     1 |      1 |
| Distribuições        |    11 |     11 |
| Minutos elegíveis    |    36 |     36 |
| Minutos distribuídos |    34 |     34 |
| Minutos disponíveis  |     2 |      2 |

Além das contagens, todas as linhas antigas foram comparadas por fingerprint,
inclusive a sessão pausada, datas históricas, créditos, alocações, atributos,
aparências, necessidades e histórico dos personagens. Não houve chamada de
início, retomada, pausa, cancelamento ou conclusão de foco.

## Objetos criados e correspondência

**13 tabelas, 12 políticas SELECT, 34 índices, 108 constraints, quatro funções e
um trigger**, todos correspondentes ao catálogo produzido pela migração local
sobre o backup restaurado. As 13 tabelas têm RLS habilitada. A tabela privada
usa negação por padrão, sem acesso de cliente ou política de leitura.

As tabelas e responsabilidades estão no
[modelo da fundação](../ECONOMY_CONTINUITY_FOUNDATION.md#modelo-incremental).
Funções: `get_economy_foundation`, `valid_skill_snapshot`, `preview_inactivity` e
`validate_purchase_source`. O trigger pertence somente à tabela nova de fontes
de compras planejadas. Nenhuma função, trigger, índice, constraint ou permissão
das tabelas anteriores mudou.

SHA-256 do catálogo novo normalizado:
`a926794b96b56e138eeed2fe721659b62a80fd5b520756cf745d9d2a0932cbf0`.

## Testes remotos somente leitura

- SQL registrado no histórico idêntico ao arquivo local, inclusive SHA-256.
- Catálogo remoto novo idêntico ao ensaio: estrutura, índices, constraints,
  definições, owners, RLS, políticas e grants.
- Todas as 45 tabelas anteriores e linhas antigas do histórico de migrações
  preservadas; funções e permissões antigas idênticas.
- Leitura com papel `authenticated` e contexto JWT das **três contas reais**:
  cada conta enxerga sua observação e seus saves; consultas às nove tabelas de
  proprietário não expõem registros de outras contas. Não foram feitos novos
  logins nem criadas contas, sessões, compras ou dados de teste.
- RPC nova retorna saldo e última conclusão válida próprios, `active: false`,
  ativação nula e seis ofertas de 2 minutos desabilitadas.
- Grants verificados: clientes não podem inserir, atualizar ou excluir nas
  tabelas novas. `anon` não lê as tabelas nem executa a RPC. Helpers privados
  não são executáveis por `anon` ou `authenticated`.
- Endpoint HTTPS real `/rest/v1/rpc/get_economy_foundation` reconhecido pelo
  PostgREST: chamada anônima retorna HTTP 401 e código PostgreSQL `42501`, como
  esperado para execução não autorizada. Não foram expostas chaves nem criado
  login de teste para essa verificação.
- 12 itens cosméticos legados continuam gratuitos.
- Baselines, ciclos, eventos, memoriais, compras, fontes e inventário vazios.
  Todos os saves preparatórios estão abertos e sem marco inicial ou ativação.
- Nenhum cron instalado e zero jobs. Nenhuma consequência foi ativada.

Não foram feitos testes remotos de escrita ou concorrência sobre dados reais.
Esses casos já foram exercitados nos bancos descartáveis da entrega local. Os
testes desta aplicação verificam RLS, leitura, catálogo e preservação efetiva;
não equivalem a um novo teste ponta a ponta no Safari ou a uma suíte de login.

## Advisors e pendências

O Security Advisor do Supabase foi executado por leitura após a aplicação:

- INFO para RLS sem política em duas tabelas privadas: `economy_release` (nova)
  e `save_creation_requests` (anterior). É a negação por padrão esperada; acesso
  direto de clientes foi conferido como bloqueado.
- WARN para 23 RPCs `SECURITY DEFINER` executáveis por autenticados, incluindo
  `get_economy_foundation`. A nova RPC é intencional, somente leitura, com
  `search_path` vazio, identidade por `auth.uid()` e filtro explícito por conta;
  passou na verificação das três contas. As outras RPCs foram preservadas.
- WARN de proteção contra senhas vazadas desativada no Auth. Não foi alterada,
  pois a autorização recebida cobre apenas esta migração.

Não houve alerta ERROR nessa resposta do Advisor. Os avisos não foram ocultados
ou corrigidos com mudanças fora do escopo. Revisar a proteção de senhas em uma
etapa específica de segurança da conta.

A fundação continua sem integração nas telas e sem ativação. Cobranças, efeitos
por compra, constância automática, recuperação de regressão, encerramento e
memoriais consultáveis exigem etapas posteriores. A ausência de servidor local
na porta 3000 registrada na entrega anterior não foi tratada nesta aplicação.

## Recuperação se houver falha futura

1. Preservar este pacote privado inteiro, especialmente ciphertext, manifesto e
   `key.dpapi`; não substituir por um backup posterior ao incidente.
2. No mesmo contexto Windows, recuperar a chave via DPAPI CurrentUser, conferir
   o SHA-256 do ciphertext e autenticar a decriptação AES-GCM usando IV/tag do
   manifesto. Não imprimir nem colocar chave ou credenciais em comandos Git.
3. Criar **outro banco isolado vazio**, inicializar os papéis necessários descritos
   no manifesto e restaurar em transação única. Comparar todas as tabelas e o
   catálogo com os fingerprints do manifesto antes de considerar recuperação.
4. Se a aplicação falhasse antes do commit, o próprio runner executaria rollback;
   nenhum reset ou restore remoto seria necessário. Isso não ocorreu: aplicação
   e postflight passaram.
5. Após commit, manter a fundação inativa permite preservar a compatibilidade com
   o aplicativo anterior. Não excluir tabelas nem remover o histórico para
   simular rollback. Uma restauração remota ou migração corretiva exige plano e
   **nova autorização**, pois pode sobrescrever progresso posterior ao backup.

Nenhuma operação de recuperação destrutiva foi executada no Supabase.
