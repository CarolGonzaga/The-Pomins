# Entrega 6C — UX, navegação e prioridade do foco

Trabalho local de 26/10/2026. Consolidação em commit local autorizada posteriormente pelo usuário; sem push, deploy, mudança remota ou migração.

## Base e escopo

Antes das alterações, `codex/consolidacao-base` estava em `71dccda86f8ce43fdd843572c49cc43f661caf76`; a consulta ao GitHub confirmou `codex/preview-6b` em `4c5b212e2b1f8851d64c16e722d81aa660ce829b`. A correção anterior do bebê está preservada. `.env.example` e `docs/VERCEL_PREVIEW_6B.md` eram alterações locais preexistentes e foram mantidos fora do escopo. Production Branch `main` não foi modificada.

## Problemas e soluções

| Antes | Depois |
|---|---|
| Criador dentro do pequeno painel rolável da partida, além de um cenário redundante acima | Modo de criação do mesmo GameScreen, sem cenário duplicado; conteúdo usa a rolagem da página |
| Círculos decorativos e espaço excessivo no card | Círculos removidos do DOM; CSS Grid mantém o mesmo SVG centralizado, com padding menor |
| Final da introdução retornava à visão geral no fluxo legado | Entrada direta em Cuidados; retomar um bebê também seleciona Cuidados, e uma introdução ainda não lida aparece no fluxo de partida |
| História e necessidade de voltar manualmente ao primeiro painel | Introdução pode continuar ou ser pulada; História permite consultar a memória e reler o capítulo em modo somente leitura |
| Todos os controles concorriam na mesma linha | Cuidados/Atividades, História e Moradores têm acessos próprios; Progresso/Aparência ficam em Mais opções |
| Seletor exigia abrir a preparação mesmo sem sessão existente | Foco ocioso visível ao abrir a partida, sem iniciar sessão; sessões recuperáveis continuam exigindo Continuar sessão |
| Rótulos subjetivos do foco | Iniciar foco, Pausar, Retomar foco, Continuar sessão e Foco concluído; mesmos handlers e motor |
| Fome = 100 − saciedade, acompanhada de menos é melhor | Saciedade = valor persistido de satiety; assim todos os indicadores visíveis aumentam no sentido de bem-estar |
| Painel do seletor ainda possuía max-height de 16dvh | Removido esse limite específico, além das rolagens de opções e painéis; o card envolve todo o conteúdo |
| Rótulos se tocavam em 320 px | Navegação em duas colunas no celular, controles de toque e títulos com espaçamento adequado à fonte |

Pular a introdução não grava memória, não marca o capítulo como lido e não produz recompensas. O capítulo continua disponível em História. A releitura não oferece a ação de gravar a primeira memória novamente. Nenhuma relação familiar ou história nova foi inventada.

## Tipografia e recursos

Jersey 20, de Sarah Cadigan-Fried/The Soft Type Project Authors, obtida do [repositório oficial Google Fonts](https://github.com/google/fonts/tree/main/ofl/jersey20). Licença [SIL OFL 1.1](https://raw.githubusercontent.com/google/fonts/main/ofl/jersey20/OFL.txt), preservada em `public/fonts/jersey-20/OFL.txt` e creditada em `/credits`.

Integração por `next/font/local`, com preload, fonte fallback ajustada e variável CSS `--font-game`. A escolha local mantém o mesmo recurso oficial sem downloads em cada build, ao contrário da dependência de rede durante a compilação de next/font/google. O navegador não contata Google Fonts. Títulos, menus e botões usam Jersey; textos narrativos longos preservam serifas legíveis e formulários mantêm Segoe UI/Arial com campos a 16 px. Alturas de linha explícitas e fallback ajustado reduzem deslocamentos na carga; não foi realizado ensaio quantitativo de CLS em rede de iPhone físico.

SHA-256 de `Jersey20-Regular.ttf`: `76670d7e8826860e3d2f2846b88bc1652135b8d54b6adfa5a87649b9fa4bd3b4`. Nenhuma biblioteca adicionada. Pixelify Sans, SVGs, LPC e créditos anteriores foram preservados.

## Segurança e limites da mudança

- Nenhuma alteração em SQL, migrações, RLS, autenticação, persistência de saves ou modelos de necessidades/foco/economia.
- Alterações no componente Focus e seletor limitadas à apresentação e rótulos; validação, relógio, heartbeat, gestos e comandos permanecem existentes.
- O seletor ocioso montado não inicia sessões. Recuperar uma sessão continua sendo uma escolha explícita. O componente permanece montado quando se alternam painéis.
- Phaser não foi modificado; sua identidade de canvas, movimento, aparência, troca de contexto e limpeza de listeners são cobertos por regressão.
- O build e servidor da porta 3000 foram preservados. Build 6C isolado em `.cache/ux-6c`; backend SQL descartável em 3181 e servidor de testes em 3192. O arquivo de ambiente desse snapshot contém apenas valores explicitamente simulados da fixture local, sem credenciais reais copiadas.

## Validação e pendências

### Resultado efetivamente executado

- `npm run lint`: aprovado, sem warnings de ESLint.
- `npm run typecheck`: aprovado no snapshot isolado (`next typegen && tsc --noEmit`).
- Build Next.js de produção com webpack: aprovado. O aviso de múltiplos lockfiles se deve ao snapshot aninhado; não houve alteração do configurador do aplicativo para escondê-lo.
- `npm test -- --maxWorkers=2`: **193 aprovados, 11 ignorados** por ausência do PostgreSQL externo descartável. Integrações PGlite locais executadas; não são testes contra Supabase remoto.
- Suíte completa Playwright no build final: **107 aprovados e 1 ignorado em 5,4 minutos**. O caso ignorado exige toque CDP e é excluído do perfil desktop; o correspondente passou no perfil iPhone simulado.
- Os dez testes de prévia foram repetidos com uma asserção explícita de centro vertical da área sem círculos: **10 aprovados em 30 segundos**. São reexecuções dos mesmos cenários, não dez testes distintos adicionais.
- Os doze cenários novos da 6C cobrem menu → saves → criação → introdução → cuidados, releitura sem gravar memória, pular sem inventar memória, fonte carregada com acentos, teclado, foco de menu, necessidades, ausência de início automático e de rolagens internas, Axe e recarga. Os demais são regressões existentes atualizadas aos rótulos e navegação novos.
- Conferência de conteúdo: os arquivos de aplicação e testes do snapshot foram comparados por SHA-256 com a árvore local. Código de SVG do bebê, scene Phaser, modelos de foco, necessidades, saves e migrações sem alterações. Scanner dos textos alterados/adicionados não encontrou padrões de segredo.

Durante a revisão, capturas revelaram rótulos encostados em 320 px e um limite de altura herdado do CSS do seletor: ambos corrigidos e cobertos na rodada final. Duas expectativas antigas de retorno à visão geral foram atualizadas para Cuidados; a suíte final não possui falhas. Respostas PGRST202 nos logs são endpoints deliberadamente não implementados pela fixture simulada, tratados pelo aplicativo e cobertos pelos cenários de erro; não foram erros de um banco remoto.

### Comparação visual local

Capturas revisadas e preservadas em `.cache/ux-6c/evidence/`, ignoradas pelo Git:

- `before-preview-desktop.png`: prévia anterior, com círculos.
- `after-creator-desktop.png`: criador com Jersey, sem círculos e sem painel interno rolável.
- `after-creator-320.png`: opções e campos legíveis em 320 px, com a mesma arte centralizada.
- `after-care-320.png`: foco destacado, navegação sem sobreposição e painel envolvendo todo o conteúdo.

As comparações são de estados locais de teste, não de um Preview publicado.

Os testes de navegador usam Chromium desktop e iPhone simulado, nas larguras 320, 375, 390, 430 e 1280 px, com verificações adicionais de orientação, teclado reduzindo viewport, toque, movimento reduzido, Axe, offline e PWA. Não equivalem à validação física no Safari.

Necessário antes dos testes humanos: revisar as mudanças locais, autorizar eventual commit/publicação em Preview e resolver separadamente a origem HTTPS de Auth documentada em `VERCEL_PREVIEW_6B.md`. O Preview remoto não recebeu a 6C nem a correção local anterior por esta tarefa. Não alterar configurações remotas sem autorização.

Referências para o iPhone: [IOS_TEST_CHECKLIST.md](IOS_TEST_CHECKLIST.md) e [MOBILE_UX_AUDIT.md](MOBILE_UX_AUDIT.md).

## Arquivos da entrega

Revalidação para consolidação: 193 testes locais aprovados, 11 dependentes de PostgreSQL externo ignorados; suíte de navegador repetida com 107 aprovados e um ignorado em 5,5 minutos. Lint, TypeScript e build isolado aprovados novamente. Nenhum arquivo da futura 6D-A integra este commit.

- Tipografia e identidade: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/credits/page.tsx`, `src/features/portal/portal.module.css`, `public/fonts/jersey-20/Jersey20-Regular.ttf`, `public/fonts/jersey-20/OFL.txt`.
- Criação e capítulo inicial: `src/features/character-creator/creator.tsx`, `src/features/narrative-engine/birth.tsx`, `src/components/game.tsx`.
- Controles de jogo: `src/features/game-screen/game-screen.tsx`, `src/features/game-screen/game-screen.css`, `src/features/room/room-app.tsx`, `src/features/baby-care/baby-care.tsx`.
- Apresentação do foco: `src/features/focus-engine/focus.tsx`, `src/features/focus-engine/focus-duration-dial.tsx`, `src/features/focus-engine/focus-duration-dial.css`.
- Testes novos: `tests/e2e/ux-6c.spec.ts`, `tests/support/ui.ts`.
- Regressões atualizadas aos nomes e fluxo novos: `tests/e2e/accessibility.spec.ts`, `baby-care.spec.ts`, `baby-preview.spec.ts`, `explicit-saves.spec.ts`, `focus-dial.spec.ts`, `immersive-game.spec.ts`, `journey.spec.ts`, `mobile-audit.spec.ts`, `portal.spec.ts`, `room.spec.ts` (todos no mesmo diretório).
- Este relatório. Os arquivos preexistentes `.env.example` e `docs/VERCEL_PREVIEW_6B.md` não pertencem à entrega.
