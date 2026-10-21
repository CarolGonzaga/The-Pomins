# Etapa 1 · The Pomins — o mundo dos Pomins

Implementação de 21/10/2026 baseada nas novas especificações em `docs/specs/`. A direção aprovada agora inclui um quarto em pixel art e adulto LPC. O aplicativo anterior de nascimento foi preservado em `/`; o protótipo está em **`/play`**, acessível pelo menu “Meu quarto · Etapa 1”.

## Análise e decisões

Base existente: Next.js 16 App Router, React 19, TypeScript strict, Supabase Auth SSR, PWA, criador de bebê humano/alienígena e foco estrito com heartbeats. Não havia Vite, Phaser, Tiled ou sprites LPC. A implementação acrescenta módulos, sem trocar framework, autenticação, cronômetro ou serviço de validação.

Phaser **3.90.0** é carregado dinamicamente somente no quarto, no navegador. Import ESM por namespace, compatível com Turbopack; não é executado no SSR. Canvas 2D, pixelArt/roundPixels, 30 FPS e controles HTML. Mouse, teclado e toque do motor ficam desabilitados porque não há movimentação manual; isso permite rolar e ampliar a página no iPhone. A cena dorme quando a página fica oculta. Não há som ou efeitos decorativos constantes.

## Módulos e arquivos

| Arquivo                                              | Responsabilidade                                                             |
| ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/app/play/page.tsx`                              | Identidade verificada, carregamento da casa, moradores e sessão pendente     |
| `src/features/room/domain.ts`                        | Aparência, fases, necessidades, habilidades, atividades, efeitos e validação |
| `navigation.ts`                                      | Busca em largura e navegação cardinal, retarget sem teletransporte           |
| `map.ts`, `public/assets/room/aurora.json`           | Importação de objetos Tiled, obstáculos e pontos de interação                |
| `scene.ts`, `room-canvas.tsx`                        | Quarto Phaser, movimento, poses e ciclo de vida do canvas                    |
| `sprites.ts`, `sprite-preview.tsx`                   | Composição LPC e recoloração de pixels reais                                 |
| `adult-editor.tsx`                                   | Nome, pele, cabelo, olhos, roupa e prévia                                    |
| `persistence.ts`, `room-app.tsx`                     | Comandos, exploração local, saldo, formulário de distribuição e histórico    |
| `src/app/api/room/route.ts`                          | Auth, origem, Zod, timeout no cliente e RPCs                                 |
| `src/app/credits/page.tsx`, `public/assets/lpc/`     | Atribuições e PNGs originais, revisão e hashes                               |
| `supabase/migrations/202610210001_playable_room.sql` | Extensão não destrutiva e operações transacionais                            |

Alterações na base: `/api/game` aceita o morador no início de foco; `Focus` ganha retrato/retorno/resumo opcionais, mantendo os padrões antigos. `/` passa a carregar somente seu personagem legado. O menu ganha acesso ao quarto. `.skip-link` usa foco visível; CSS do quarto mantém tipografia e poucos ícones. Playwright permite uma porta alternativa por `POMINS_TEST_PORT`.

Dependências de runtime adicionadas: `phaser`. Dependências de teste: `pg` e `@types/pg`. PGlite, Vitest e Playwright existentes foram reutilizados. Nenhum gerador de sprites GPL ou MCP foi adicionado ao runtime.

## O que funciona

1. Criar um adulto LPC, com nome e aparência independente da imagem; editar os cosméticos depois.
2. Escolher estudar, ler ou dormir; o personagem encontra um caminho livre até o objeto correspondente. Trocar a atividade conclui a aresta atual antes de recalcular a rota.
3. Reutilizar o temporizador estrito; interrupções não geram minutos de conclusão. Não há decisões narrativas durante o foco.
4. Concluir uma sessão e receber minutos distribuíveis, separados do histórico, XP e moedas.
5. Dividir o saldo de uma ou várias sessões entre moradores e atividades compatíveis, em até 20 linhas por pedido.
6. Aplicar débito e progresso numa mesma transação; recuperar pedidos após falha sem reaplicar efeitos.
7. Recarregar e restaurar aparência, atividade, última posição de interação salva, necessidades, habilidades e distribuições.

Necessidades não decaem pelo relógio real. Atividades ambiente não consomem minutos sozinhas. O adulto permanece adulto; não há envelhecimento automático.

## Banco e migração

Aplicar **primeiro** `202610160001_foundation.sql`, **depois** `202610210001_playable_room.sql`. A segunda migração cria `households`, `activities`, `focus_credits`, `allocation_requests`, `focus_allocations` e `game_events`, além dos campos de domínio em `characters`. Os dados anteriores ficam preservados como `render_system=legacy`, `life_stage=baby`.

O índice de uma única vida é substituído por um índice de um único personagem legado. A criação inicial de adulto é idempotente sob lock do perfil, mas a tabela admite vários moradores sem alteração estrutural. O protótipo não oferece geração de NPCs/famílias nem botão para adicionar moradores ilimitados.

Todas as tabelas novas têm RLS. Usuários leem somente suas casas, créditos, alocações e eventos; apenas o catálogo de atividades é compartilhado. Escrita direta é revogada. Os gatilhos mantêm coerência usuário/casa; `room_state`, `room_command` e `start_resident_focus` validam a identidade com `auth.uid()`, `security definer` e `search_path=''`.

Conclusão válida cria **um crédito por sessão**. Histórico concluído anterior é convertido em créditos sem alterar os prêmios antigos. XP/moedas mantêm o balanceamento anterior; minutos distribuíveis correspondem a todos os minutos inteiros de sessões completas, independentemente do teto diário de XP/moedas. Adultos LPC não recebem XP de vida automaticamente: seu desenvolvimento vem das alocações.

`room_command('allocate')` bloqueia o perfil antes dos créditos/personagens, valida conta/casa/fase/requisitos/saldo, grava o pedido, debita cada sessão e aplica efeitos. Falha em uma linha reverte todas as linhas. Repetir UUID e payload retorna o estado atual; reutilizar o UUID com conteúdo diferente falha. O pedido pendente fica em sessionStorage até a confirmação. Revisão monotônica da casa impede respostas de rede atrasadas de sobrescreverem estado mais recente na interface.

Por minuto: estudar +2 conhecimento/+1 autonomia; ler +1 conhecimento/+1 criatividade; dormir +3 energia (máximo 100)/+1 bem-estar. Efeitos vêm do catálogo no banco, nunca do payload do browser. Requisitos de habilidades são verificados. Condições narrativas não vazias falham de forma fechada até a próxima versão do motor; não são ignoradas silenciosamente.

## Assets e adaptações

Ver `docs/LPC_ASSETS.md` e `/credits`. Somente **24 PNGs**: corpo, cabeça, calça, duas camisas e três cabelos em walk/idle/sit, sem gerar centenas de combinações. O compositor recolore pele, olhos, cabelo e camisa e combina as camadas num atlas temporário. A aparência reconhecível permanece entre caminhada e poses.

Estudar: pose sentada LPC voltada à escrivaninha. Ler: pose sentada com livro desenhado por código. Dormir: **repouso sentado ao lado da cama com manta**, porque uma animação dedicada de sono deitado não faz parte do subconjunto. Não usamos uma animação de ferimento como sono. Isso é uma adaptação visual, não uma nova animação LPC alegadamente existente.

O quarto é desenho pixelado original por código. O JSON Tiled contém camadas de objetos e colisões; não é um tileset externo importado. Trocar de cenário exige atualizar as posições declarativas e os pontos de interação em conjunto (testados para consistência).

## Executar e testar

```sh
npm ci
npm run dev
# http://localhost:3000/play
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Se a porta padrão estiver ocupada, `POMINS_TEST_PORT=3100` permite testar em servidor separado. No PowerShell: `$env:POMINS_TEST_PORT='3100'` antes do comando de testes.

Com Supabase configurado em `.env.local`, o quarto usa a conta real e as duas migrações. Sem configuração/sem login, a exploração local salva no navegador, com avisos claros de que minutos locais não são validados nem transferidos à conta. A exploração usa Web Locks quando disponível para serializar abas; a segurança do progresso oficial é sempre responsabilidade do PostgreSQL.

Testes de concorrência em conexões independentes usam um banco **efêmero e vazio chamado `pomins_test`**, definido em `POMINS_TEST_DATABASE_URL`. O CI provisiona PostgreSQL 17 e executa esses testes automaticamente. Nunca apontar esse parâmetro para um projeto Supabase real ou banco com dados: o fixture cria roles e schema próprios, sem apagar bancos existentes.

## Limitações e próxima etapa

- Só uma base adulta LPC neste catálogo, três cabelos mais ausência e duas camisas. Sem opções que não alterem o sprite. Bases baby/child/teen/elder estão representadas no domínio, mas seus sprites ainda não estão implementados. Alienígenas e nascimento seguem acessíveis no fluxo legado; não são fingidos como adultos LPC.
- Não há árvore, casamento, filhos, carreiras, economia de compra, envelhecimento ou NPCs complexos. Essas expansões não foram incluídas indevidamente no protótipo.
- O motor narrativo anterior foi preservado; narrativa declarativa e condições avançadas serão a próxima etapa, sem diálogo novo fixo dentro do quarto.
- A posição em caminhada é transitória; ao recarregar, restaura-se a última posição de interação salva e retoma-se a rota. Não se grava cada quadro.
- Seleção e controle já operam sobre uma coleção de moradores; todos os moradores LPC do módulo são selecionáveis. Nesta etapa, criação inicia um único adulto. Necessidades/dados dos personagens antigos permanecem separados do renderer LPC até existir arte da fase correspondente.
- Sessões **locais em andamento** não são recuperadas após recarga; sessões oficiais usam a recuperação segura existente. Sessões locais concluídas e alocações são persistidas.
- Não há `.env.local` com Supabase neste ambiente. Auth real, PostgREST, e-mail/PKCE, deploy das migrações e publicação HTTPS ainda exigem configuração externa. Nenhum teste físico de iPhone/Safari/instalação/Wake Lock foi marcado como aprovado.
