# Estado de implementação

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
