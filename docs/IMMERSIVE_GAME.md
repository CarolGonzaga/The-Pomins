# Entrega 5F — interface de jogo

Base: commit local 5E `777e381c7d437cb8cc167b130e076b8325b82b20`, mensagem `feat: add game menu and account settings`. Seus 47 arquivos foram revisados e consolidados após nova rodada de **233 testes** (174 unidade/integração, 11 PostgreSQL nativo, 48 navegador), lint, TypeScript e build isolado aprovados. A árvore ficou limpa nesse ponto, sem push. As alterações descritas abaixo compõem a 5F consolidada localmente.

## Diagnóstico e reutilização

`SavePlayer` já verifica o contexto carregado pelo servidor e seleciona o morador autorizado; a escolha pendente usa a RPC existente com revisão. `Game` mantém criação, nascimento, personagem legado e histórico de foco; `BabyCare` concentra leitura, necessidades, reações e distribuição transacional de cuidados. `RoomApp` concentra o estado da residência LPC, comandos de atividade, edição e distribuição; `RoomCanvas` monta e destrói o Phaser e sincroniza o morador por referência. `Focus` contém o motor de sessão e a validação de visibilidade/conexão, usando créditos globais. Preferências e navegação são globais da conta desde a 5E.

O problema visual era a substituição do quarto/bebê pela tela inteira de foco. A solução acrescenta slots de apresentação sem duplicar esses serviços ou seus estados persistidos. Não há migração, pacote novo, alteração de Auth, crédito, atividade, revisão, política RLS, editor LPC, atlas, cena Phaser ou APIs de persistência.

## Estrutura

- `features/game-screen/game-screen.tsx`: moldura, identificação, menu, região do mundo, foco e painéis acessíveis. Mundo e foco ficam em posições estáveis na árvore React; painéis usam `hidden`, sem desmontar seus filhos. O menu nativo `details` funciona por teclado/toque, fecha com Escape e oferece menu, configurações e partidas.
- `features/game-screen/game-screen.css`: estilo limitado à tela imersiva e à apresentação compacta de foco. Fonte Pixelify Sans e paleta existentes, bordas simples, poucos comandos e nenhuma nova biblioteca de ícones ou arte externa.
- `features/game-screen/presentation.ts`: contratos explícitos para bebê/legado e adulto/LPC. Criança, adolescente e idoso permanecem sem fallback gráfico inventado.
- `SavePlayer`: ativa essa apresentação somente em `/game/[saveId]`, conserva chaves por conta/save/morador e a seleção explícita de protagonista. Os links de moradores ficam no painel próprio; nenhum parentesco ou personagem é alterado ao abrir a tela.
- `Game`: variante imersiva reutiliza `Creator`, `Birth` e `BabyCare`. Criação e primeira memória continuam usando os mesmos comandos. O nascimento fica em História e pode ser lido depois.
- `BabyCare`: oferece um contrato de apresentação `render({world, controls, progress, balance})`; a implementação anterior continua como padrão nas rotas legadas. Reações, seis ações, necessidades, histórico, crescimento e regras de minutos são os mesmos.
- `RoomApp`: variante imersiva mantém um único `RoomCanvas` acima dos controles. Atividades, editor, atributos, saldo, formulário de distribuição e histórico usam os handlers anteriores. O formulário e o editor são compartilhados entre as duas apresentações.
- `Focus`: somente apresentação compacta, opções em `details` e retorno opcional da sessão confirmada ao sair. Efeitos, intervalos, visibilidade, comandos, duração, sequência e cálculo de créditos continuam iguais.

## Foco e isolamento

O foco não é montado automaticamente ao abrir uma partida. O jogador abre seus controles; uma sessão anterior só então passa pelo fluxo de recuperação existente. Após essa abertura, trocar painéis ou abrir o menu não desmonta o foco nem o Phaser. O estado atualizado a cada 250ms permanece dentro de `Focus`, sem ser elevado ao mundo.

Links de saída e troca de morador conservam a proteção de foco ativo. Sessões de outro morador/save indicam o caminho de origem e impedem iniciar um foco paralelo. Sair de uma sessão concluída/encerrada permite preparar outra; o pai recebe o estado terminal confirmado, evitando exibir novamente uma recuperação antiga. Isso não cria ou encerra sessões por navegação.

O saldo segue global. Cuidados gratuitos mostram reações sem aplicar progresso; o registro pago reutiliza o mesmo serviço. A distribuição adulta segue com sessão, save, morador, atividade e ID idempotente existentes. Dados e caches continuam identificados por conta e partida. O componente inteiro muda de chave ao trocar de contexto, enquanto o estado persistido da sessão permanece na conta.

## Mobile e acessibilidade

Tela vertical centralizada em desktop, `100dvh`, áreas seguras nos quatro lados, controles de pelo menos 44px e campos com 16px para leitura/toque. O mundo recebe a área flexível predominante; painéis secundários têm rolagem vertical própria e recebem foco por teclado. Em altura muito baixa, a página pode rolar para manter o mundo e os controles acessíveis. Não se bloqueia a rolagem do documento nem se depende de fullscreen nativo.

Redimensionamento e rotação reutilizam o ajuste FIT do Phaser; o editor permanece dentro do painel, sem sobrepor seus próprios botões. Movimento reduzido da conta e do dispositivo desativa as animações decorativas do bebê. Identificação, estado, saldo e feedback possuem texto; o canvas mantém sua descrição acessível existente.

## Validação

**244 testes distintos aprovados**: 177 unidade/integração, 11 PostgreSQL nativo descartável e 56 navegador (última rodada completa: 2,1 min). Os oito cenários da nova interface foram repetidos após o ajuste final de tipografia: **8 aprovados em 24,9s**, já incluídos nos 56, sem somar resultados duplicados. Lint, TypeScript, build isolado e build final da raiz aprovados. As capturas desktop/mobile foram inspecionadas; não há violações WCAG A/AA nas telas auditadas. Tentativas que falharam durante os ajustes de fixture, navegação e rolagem não contam como aprovação. Dados de navegador são descartáveis, Auth é simulado e SQL usa PGlite. Os novos cenários têm contas e mundos próprios, separados das regressões A/B. Testes de comandos ativos e encerramento interceptam respostas explicitamente simuladas; não equivalem a cronometrar uma sessão contra o Supabase real. As verificações de economia e concorrência permanecem separadas.

Cobertura adicionada: roteamento visual por fase, tamanhos de viewport, orientação, áreas seguras configuradas, toque, bebê sem LPC adulto, reações gratuitas e cuidado pago com restauração após recarga/novo login, saldo compartilhado, Phaser preservado ao trocar painéis/atividade/aparência, cena após recarga, foco ativo/pausado sem remontagem, bloqueio de navegação ativa, estado terminal confirmado e auditoria WCAG A/AA. As regressões existentes de nascimento, protagonista, Auth, saves, foco e distribuição são mantidas, ajustando apenas os caminhos de navegação da interface nova.

## Limitações e 5G

Não foi validado em iPhone físico/Safari nem em PWA instalado. Viewport/toque Chromium não substitui essa validação; teclado virtual e notch reais exigem teste no dispositivo. O bebê reutiliza a arte vetorial existente; não foi criado um novo conjunto pixelado. Animações, direções e fases LPC mantêm as limitações anteriores. A seleção circular de duração não foi implementada.

Para a 5G, o seletor deve atualizar somente a duração ociosa de `Focus`, manter a entrada numérica e presets acessíveis, respeitar 2–120 minutos e bloquear mudanças durante uma sessão iniciada. Toque/arraste não deve iniciar foco por conta própria. Não é necessário criar outro saldo, motor ou modelo de save.

Arquivos de produto modificados: `src/components/game.tsx`, `src/features/{baby-care/baby-care,focus-engine/focus,game-saves/save-player,room/room-app}.tsx`; novos `src/features/game-screen/{game-screen.tsx,game-screen.css,presentation.ts}`. Testes: novo `tests/{unit/game-presentation.test.ts,e2e/immersive-game.spec.ts}`; adaptação de `explicit-saves`, `save-manager`, `portal` e dos dois arquivos de fixture/gateway. Documentação: este relatório, README e resultados dos testes.

## Servidor e verificação real

Build final disponível em `http://localhost:3000`, com o anterior preservado em `.cache/production-before-5f` (fora do Git). Atualizações controladas foram precedidas por leitura do banco: nenhuma sessão ativa, uma pausada. Comparação posterior de 12 tabelas críticas preservou integralmente os dados, excluindo somente `game_saves.last_used_at`. Nove grupos de conferência autenticada real validaram rotas novas/legadas, propriedade, protagonistas, saldo, sessões e preferências relidas, sem escolher personagens ou disparar comandos de foco. Nenhuma preferência, senha ou e-mail foi alterado, nenhuma migração foi executada e nenhum minuto foi gasto no Supabase real. Cadastro, e-mails e sessão de foco completa não foram repetidos remotamente nesta entrega visual.

A revisão do Git confirma que migrations/APIs/serviços de persistência/pacotes/lockfile permanecem iguais ao commit 5E. Arquivos privados e backups continuam ignorados; o backup cifrado anterior conserva o SHA-256 conferido e seu material de restauração local. A árvore de trabalho contém as alterações 5F acima, deliberadamente sem commit ou push.

## Consolidação 5F

Os 19 arquivos foram revisados antes do commit `feat: add immersive mobile game interface`. Rodada nova: **177 unidade/integração + 11 PostgreSQL nativo + 56 Playwright = 244 aprovados**. Lint, TypeScript e build de produção isolado aprovados. A porta nativa original estava ocupada; a tentativa não foi contada. Os 11 testes foram executados integralmente em outra porta descartável e o processo foi encerrado ao concluir.

Bebê/adulto, painéis, identidade da mesma instância canvas, foco ativo/pausado e saldo passaram novamente no navegador. Comparação remota somente por leitura: 12 tabelas críticas idênticas, uma sessão pausada e nenhuma ativa; nenhuma operação de foco, gravação de preferências ou migração. Servidor 3000 não reiniciado nesta consolidação. Não foram incluídos segredos, arquivos privados ou backups e não houve push.
