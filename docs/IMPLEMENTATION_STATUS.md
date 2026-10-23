# Estado de implementação

## Entrega 5E — menu, regras e configurações

Base `49ce61e8e47f2ce77e771af43ecd528e5fce2604`, commit 5D `feat: add multi-save management`, criado após nova rodada de 211 testes e árvore limpa. 5E local sem commit: menu autenticado, tutorial curto, preferências globais no Auth, avatar, tema/sistema, redução de movimento e duração inicial para novas sessões. Troca de e-mail exige senha atual e confirmação, senha usa a recuperação existente e logout respeita foco ativo. Painel legado de privacidade/dados preservado por link. Nenhuma migração ou dependência nova.

233 testes locais aprovados (174 + 11 PostgreSQL + 48 navegador), lint, TypeScript e build aprovados. Sete grupos reais validaram metadados/SSR/novo login, restaurando integralmente as preferências de teste; nenhuma mudança de e-mail/senha ou envio de links. Build 5E em 3000, com 12 tabelas e sessão pausada preservadas após atualização controlada. Confirmação de e-mails e Safari físico continuam pendentes. [Arquivos, decisões e limites](MAIN_MENU.md).

## Entrega 5D — gerenciador de partidas local

Base `c2bb553`. Lista de saves por conta, criação transacional/idempotente, residência independente, retomada do nascimento existente e arquivamento/restauração com revisão implementados. Protagonista pendente continua explícito e o foco continua global. Uma partida com foco pendente não é arquivada. 211 testes locais aprovados (160 + 11 PostgreSQL + 40 navegador), lint, TypeScript e build aprovados. Migração `20261022202113_save_manager.sql` **aplicada ao desenvolvimento após autorização específica**, backup/restauração de 44 tabelas e preflight. Oito grupos de Auth/SSR/RLS reais aprovaram duas histórias, nascimento/memórias e arquivamento/restauração; ambas as histórias de teste ficaram arquivadas. Servidor 3000 atualizado com build 5D após reinício controlado; comparação de 12 tabelas preservou sessão pausada e dados persistidos. Sem commit/push. [Relatório, arquivos e plano](SAVE_MANAGER.md).

## Entrega 5C — carregamento por save — desenvolvimento

Base `964537a`. Rota `/game/[saveId]`, endpoint autenticado, escolha explícita de protagonista pendente, estado temporário por conta/save e remontagem de cenas implementados. Bebê/nascimento/quarto/editor reaproveitados. Foco e créditos globais preservados. 182 testes locais aprovados (138 + 8 nativos + 36 navegador), lint, TypeScript e build aprovados. **Migração `20261022191724` aplicada ao desenvolvimento após autorização, backup cifrado e restauração de 44 tabelas.** Sete grupos reais de Auth/RLS/SSR aprovados, sem gastos ou escolha de protagonista. Save pendente e sessão pausada preservados. Consolidação: os 182 testes, lint, TypeScript e build foram repetidos e aprovados; servidor de produção atualizado na porta 3000 após reinício controlado. Sete grupos reais repetidos; 12 tabelas críticas preservadas. Migração não reaplicada. Seleção humana positiva ainda pendente. Commit local autorizado, sem push. Relatório: [EXPLICIT_GAME_CONTEXT.md](EXPLICIT_GAME_CONTEXT.md).

## Entrega 5A + 5B — partidas e compatibilidade — 22/10/2026

Base `6bbf3aa`, consolidação local autorizada em `feat: add game saves foundation and compatibility`, sem push. Modelo `game_saves`, backfill por residência, protagonistas auditáveis, FKs de propriedade/save e revisões separadas de mundo/créditos implementados e ensaiados localmente. As rotas antigas recebem contexto interno; há adaptadores compatíveis com RPCs/clientes anteriores e com o banco ainda não migrado. Sem mudança visual, novas fases ou seletor de slots. Nova rodada de consolidação com 164 testes aprovados (125 + 7 nativos + 32 E2E), lint, TypeScript e build aprovados. SQL registrado e catálogo remoto comparados com a migração local e o backup restaurado, sem drift. Comparação de 14 tabelas preservou integralmente colunas originais e IDs. O motor SQL de foco original permanece idêntico.

**Migração `20261022134830` aplicada ao desenvolvimento após autorização.** Backup cifrado e restauração local de 42 tabelas reais aprovados; pós-migração preservou todas as colunas anteriores, saldo e sessão pausada. Dois saves criados, um com protagonismo pendente para preservar adulto/bebê juntos. Seis grupos com Auth real aprovaram contexto/RLS, quarto/aparência, bebê e cookies SSR nas rotas antigas para duas contas. Sem gasto ou nova sessão de foco. Porta 3000 preservada com o build anterior compatível; versão nova validada em produção isolada. Relatório/recibo e limites de backup/validação: [GAME_SAVES_FOUNDATION.md](GAME_SAVES_FOUNDATION.md).

## Entrega 4A — bebê e cuidados — 21/10/2026

Seis reações gratuitas no bebê original; registro opcional com minutos do saldo existente, necessidades, histórico, potenciais neutros e anúncio de prontidão configurável. Nenhum envelhecimento, deterioração por ausência ou dependência nova. Commit e envio ao repositório autorizados em 22/10/2026. Migração `20261022021139_baby_care` aplicada no desenvolvimento após autorização; migrações/funções antigas preservadas. 133 testes locais aprovados. Auth, restauração do estado inicial após novo login, isolamento e escrita direta bloqueada validados com as duas contas reais. Criado Bento Bebê na conta de teste B, sem alterar seu adulto ou gastar minutos. Cuidado remoto com minutos e iPhone físico pendentes. Relatório: [BABY_CARE.md](BABY_CARE.md). Resultados: [TEST_RESULTS.md](TEST_RESULTS.md).

## Entrega 3 atual — personalização LPC — 21/10/2026

Implementada sobre `55f9497adf89641ac2f94d90876543bcd174402b`, com consolidação local autorizada em `feat: expand LPC character customization`, sem push. Esta numeração segue a sequência técnica atual; as seções antigas de expansão narrativa abaixo são o roteiro original.

- Editor de adulto humano com 7 penteados, 3 camisas, 5 categorias de cores e prévia imediata em 3 poses/4 direções.
- Composição central compartilhada com Phaser; 24 PNGs originais preservados e 18 novos licenciados, incluindo partes traseiras dos cabelos.
- Aparência v2 compatível com o JSONB e as migrações existentes; salvamento e restauração após novo login verificados no Supabase real.
- Modelo preparado para 5 fases e 2 espécies, com suporte visual explicitamente limitado ao adulto humano disponível.
- 109 testes locais aprovados, lint, TypeScript e build aprovados. Sem dependências novas ou alterações no foco, distribuição, quarto ou nascimento.
- Pendências: arte e encaixes das outras fases/espécies, Safari/iPhone físico e HTTPS. Relatório: [CHARACTER_VISUALS.md](CHARACTER_VISUALS.md); evidências: [TEST_RESULTS.md](TEST_RESULTS.md).


## Validação Supabase de desenvolvimento — 21/10/2026

**Entrega 2 de persistência validada no desenvolvimento.** URL e chave pública configuradas; confirmação de e-mail obrigatória. Migrações autorizadas no lote `20261021201224`: 13 tabelas com RLS, 7 RPCs, 4 triggers e 14 políticas. Auth/recovery, personagem/aparência, foco, distribuição e restauração após sair/entrar foram conferidos. Corrigidos callback para endereço interno, heartbeat inicial precoce e mensagens de redefinição. Duas contas comuns aprovaram 11 grupos remotos de isolamento/RLS, repetição, rollback, concorrência, posse entre conexões e interrupção sem crédito. Estado final: 2 sessões concluídas e 1 de teste cancelada, nenhuma aberta; 4 minutos elegíveis, 2 distribuídos e 2 disponíveis em A; B separado, com saldo zero. O histórico remoto registra um lote com dois arquivos locais: reconciliar antes de usar a CLI em mudanças futuras. Produção HTTPS, iPhone físico e demais limites constam em [SUPABASE_DEVELOPMENT_VALIDATION.md](SUPABASE_DEVELOPMENT_VALIDATION.md).

## Consolidação da base — 21/10/2026

Esta entrega preserva as duas experiências existentes, sem novas mecânicas nem mudanças de design. Configuração de lint, dependências de desenvolvimento explícitas, execução E2E contra produção e regras de exclusão do Git foram consolidadas. Resultados históricos e limites: [BASELINE_CONSOLIDATION.md](BASELINE_CONSOLIDATION.md). Supabase real foi validado posteriormente conforme a seção acima; iPhone físico continua pendente.

## Atualização de 21/10/2026 — quarto adulto LPC

Nova Etapa 1 implementada em `/play`: renderer Phaser, quarto pixelado/Tiled, adulto personalizável, navegação por obstáculos, estudar/ler/dormir, foco existente, créditos de minutos, distribuição transacional/idempotente, progresso e restauração. O fluxo anterior em `/` foi preservado. A migração adicional é `202610210001_playable_room.sql`.

Consulte `PLAYABLE_ROOM.md` para critérios, módulos, limitações, testes e próxima etapa; `LPC_ASSETS.md` e `/credits` registram licenças e atribuições. O estado histórico abaixo refere-se à primeira versão de 16/10 e não substitui as novas regras de pixel art, adulto inicial e distribuição voluntária de minutos.

Data de referência do projeto: 16/10/2026. Base: repositório GitHub vazio, clonado em `D:\Pessoal\The Pomins`.

## Entrega 1 — implementada localmente; ativação externa pendente

- [x] Next.js/React/TypeScript, lockfile, design tokens e interface PT-BR.
- [x] PWA: manifest, ícones PNG, apple-touch, maskable, worker, offline e aviso de atualização.
- [x] Integração Supabase Auth: cadastro/login/logout/confirmação/recuperação/redefinição/exclusão.
- [x] Privacidade e sessão SSR com cookies; operações protegidas e sem service role.
- [x] Migração SQL, RLS/grants, perfis, carteira, personagens, sessões, eventos, recompensas e memórias.
- [x] Criador humano/alienígena, personalização modular e prévia do bebê.
- [x] Nascimento original, variantes por origem, duas memórias e escolha única persistida.
- [x] Foco estrito, tarefa e primeiro passo, durações/customização, pausa, retomada e recuperação.
- [x] Heartbeat de servidor, sequência, lease, deduplicação, expiração e recompensa atômica.
- [x] Histórico recente, XP de vida e temas claro/escuro.
- [x] Exploração local explicitamente sem recompensa; personagem/memória no dispositivo.
- [x] Configurar Supabase real e aplicar as duas migrações iniciais com autorização; catálogo remoto conferido.
- [ ] Testar e-mail, PKCE, cookies/SSR e PostgREST no Supabase real.
- [ ] Publicar no Vercel com HTTPS.
- [ ] Validar instalação, suspensão e Wake Lock em iPhone físico.

## Verificação

Execuções e resultados finais são registrados em `docs/TEST_RESULTS.md`. `npm test` executa PostgreSQL em WASM, não um banco fake de runtime. E2E cobre a interface local em Chromium desktop e viewport iPhone; o teste físico não foi executado. Screenshots são artefatos locais ignorados em `test-results/`.

## Entrega 2 — próxima fase

- [ ] Motor JSON tipado, validador de grafo, catálogo versionado e publicação de conteúdo.
- [ ] Capítulos desbloqueados por foco, condições/efeitos server-side e retomada de cenas.
- [ ] Conteúdo de uma vida completa, NPCs, escolhas e afinidade.
- [ ] Marcos de idade/visual por fase e memória permanente.
- [ ] Carreira e família opcional, descendência/adoção/herança.
- [ ] Conclusão de vida, árvore real e sucessor jogável; testes de repetição e concorrência.

## Entrega 3 — expansão

- [ ] Busca/solicitações/bloqueios de amizade, perfis com consentimento.
- [ ] Ranking balanceado, temporadas/ligas, desafios cooperativos.
- [ ] Loja/inventário/consumo de moedas, novas profissões e personalização.
- [ ] Metas flexíveis, estatísticas por período e paginação de histórico.

Não há anúncios de vida completa, ranking ativo ou segunda geração nesta versão. As respectivas telas comunicam a próxima entrega. Não envelhecer por tempo real nem punir ausência.
