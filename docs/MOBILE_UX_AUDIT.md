# Entrega 6A — auditoria mobile e estabilização

Base: `ac834e30af0d5f450c16154fbf9a63cafc55efad` (`feat: add rotary focus duration control`). A 5G foi consolidada com 267 testes repetidos, lint, TypeScript e build isolado. Foram revisados os dez arquivos previstos e uma correção da fixture: as contas dos testes do dial não compartilham mais saldo com os testes paralelos de cuidados. Varredura de conteúdo staged sem segredos; árvore limpa ao concluir o commit; nenhum push.

A 6A foi consolidada localmente em 24/10/2026 com a mensagem `fix: stabilize mobile game experience`, **sem push**. Não há dependências ou migrações novas. O servidor e o banco reais não são usados para executar sessões experimentais.

## Defeitos comprovados e correções

| Gravidade | Evidência | Correção |
|---|---|---|
| Alta | Cada navegação de saída do quarto deixava um listener `document.visibilitychange` do Phaser 3.90. A contagem crescia após desmontar. | Adaptador de ciclo de vida captura somente os listeners registrados durante a chamada síncrona de `Game.start` e remove os seus no evento de destruição. Restaura o método DOM imediatamente, mantém handlers externos e não restaura handlers de instâncias aposentadas. O loop é acordado para processar a destruição mesmo após dormir em aba oculta. |
| Média | Arrastar 18px dentro do centro do dial ainda gerava `start`. | Um gesto com movimento de pelo menos 6px ou cancelamento deixa de ativar o centro. Clique deliberado, teclado e ativação assistiva continuam utilizando os callbacks originais. |
| Média | Inputs de login e configurações apresentavam texto de 13px em viewport estreito. | Campos de formulário usam 16px até 600px de largura; zoom do navegador continua permitido. O comportamento do teclado/zoom do Safari ainda exige dispositivo real. |
| Média | Axe apontou `aria-prohibited-attr` no indicador de etapas de Regras. | Indicador agora é um `progressbar` com nome, limites, valor e texto da etapa. |
| Média | Erro de e-mail era apenas um parágrafo sem associação ao campo ou anúncio próprio. | `aria-invalid`, descrição vinculada e `role=alert`, preservando validação e autenticação existentes. |
| Média | Captura offline mostrou o aviso fixo cobrindo parcialmente os controles de cuidado. | No jogo imersivo, avisos de conexão/atualização ficam no fluxo antes do conteúdo, sem cobrir botões. Nas telas legadas conservam o posicionamento anterior. |
| Média | Marcador do capítulo de nascimento tinha contraste de aproximadamente 2,35:1 em fundo claro. | Usa a cor de texto secundário já existente no tema. A página de nascimento permanece intacta em funcionamento. |
| Baixa | Aviso offline afirmava que o foco havia sido pausado, mesmo sem sessão ou confirmação remota. | Texto informa apenas que tempo confirmado permanece salvo e orienta reconectar. |
| Baixa | Revisão CSS encontrou paddings fixos sem safe areas em Auth e gerenciador de partidas. | Paddings agora respeitam `env(safe-area-inset-*)`, inclusive em paisagem; medidas físicas continuam pendentes. |

O vazamento foi conferido também no [código oficial do Phaser 3.90](https://github.com/phaserjs/phaser/blob/v3.90.0/src/core/VisibilityHandler.js). O adaptador não muda renderização, navegação do personagem, atlas, aparência, animações ou cálculo do foco. É específico dessa versão: revisar sua necessidade ao atualizar Phaser. Há testes para handlers externos, duas instâncias sobrepostas e falha no boot.

Uma medição de contraste capturou o tutorial durante sua transição de 180ms. O teste agora aguarda animações finitas terminarem, sem desabilitar verificações. Esse caso intermediário não foi tratado como alteração de paleta necessária; o contraste insuficiente do marcador de nascimento foi corrigido separadamente.

## Cobertura da auditoria

- Login/cadastro, validação de campos, menu, regras, configurações, listagem/criação/continuação/arquivo/restauração de partidas: testes atuais e regressão do portal/saves.
- Nascimento original: criação local, narrativa, memória, teclado, recarga, captura estreita e Axe. Não foi recriado.
- Bebê: cuidados gratuitos e persistidos, necessidades, histórico e distribuição pelas regressões; captura e abertura de todos os painéis na auditoria.
- Adulto: LPC, aparência persistida, caminhada/leitura/espera e renderização proporcional 4:3; canvas e dial conservam identidade ao abrir painéis e redimensionar.
- Matriz de layout: 320×568, 375×667, 390×844, 430×932, 844×390 e 1280×900. Também 390×400 e campo de nascimento em 320×350 para testar alcance com altura reduzida. Isso não emula fisicamente o teclado iOS.
- Testes de ausência de rolagem horizontal, alvos de controles do jogo de pelo menos 44px, foco por teclado, campos alcançáveis, preferência de movimento reduzido, temas e meta viewport sem bloqueio de zoom.
- Mouse, teclado, extremos e emenda angular do dial; captura/cancelamento e toque nativo via CDP/Chromium; arraste do centro não inicia foco. Duração padrão continua vindo das configurações. Sessões ativas e pausadas mantêm a duração planejada bloqueada.
- Navegação interna repetida: limpeza de listeners e canvas do quarto, sem crescimento das contagens monitoradas; isso não é um ensaio completo de heap ou bateria.
- Foco: regressões de início, pausa/retomada, restauração, conclusão confirmada, duplicação e saldo. Auditoria adicional injeta blur, pagehide, offline e visibilitychange, exige retomada explícita e verifica que o SQL descartável não recebeu progresso.
- PWA: manifest/ícones acessíveis, worker sem cache HTTP, registro/controle, fallback offline e ausência de rotas pessoais/API nos caches inspecionados. Nenhum site público foi publicado.

## Ambiente e limites da evidência

Testes locais usam PGlite/SQL e Auth simulados, em build de produção isolado nas portas 3181/3182. Os fluxos de foco de navegador interceptam respostas explicitamente simuladas. Nenhuma sessão acelerada é apresentada como foco real; testes de concorrência usam PostgreSQL nativo com conexões independentes. Não foram alteradas contas, preferências, créditos ou sessões reais para testar a UX.

Safari físico, WebKit e dispositivo iPhone não estavam disponíveis nesta máquina. Os projetos `chromium` e `iphone` usam Chromium; o segundo muda viewport/toque. A barra de endereço real, teclado, pinch zoom, VoiceOver, Wake Lock, suspensão pelo iOS, aquecimento, bateria e FPS no hardware continuam pendentes. Não foi instalada uma biblioteca ou navegador adicional para simular essa aprovação.

Telas de pouca altura, paisagem e texto ampliado podem exigir rolagem vertical; os controles permanecem alcançáveis, sem ocultação horizontal. O layout atual não garante que mundo, foco e todo painel fiquem simultaneamente visíveis em 320×568 ou com teclado aberto. Uma futura compactação deve ser decidida após teste humano; não foi feita uma reconstrução do jogo nesta auditoria. Textos auxiliares pequenos e a precisão da borda de 116px merecem essa revisão humana, mantendo botões e entrada numérica como alternativas.

## Safari, HTTPS e instalação

O código já utiliza `100dvh`, `viewport-fit=cover`, safe areas no jogo/portal e agora no formulário mobile. `env(safe-area-inset-*)` é a integração documentada pelo [WebKit](https://webkit.org/blog/7929/designing-websites-for-iphone-x/). Esses valores são zero na simulação comum; a validação de recortes físicos permanece aberta.

Para o ensaio no telefone, publicar um ambiente **de desenvolvimento** em domínio HTTPS estável com certificado confiável, Node 24, `npm ci`, build e variáveis públicas corretas. Manter segredos somente no ambiente do servidor. Configurar `NEXT_PUBLIC_APP_URL` para essa origem e solicitar autorização antes de acrescentar no Supabase os dois callbacks exatos dessa origem. Não usar o domínio de produção ou curingas amplos como atalho. Nenhuma configuração remota foi modificada nesta auditoria.

Alternativa em rede local: HTTPS com certificado aceito pelo próprio iPhone; HTTP por IP da máquina não substitui o contexto seguro de localhost. O [registro de service worker](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register) exige origem confiável. O guia PWA incluído nesta versão de Next também exige HTTPS para instalação mobile. Verificar manifest, ícones, worker e Auth no endereço final após qualquer alteração de origem; não basta testar o build em localhost.

No Safari do iPhone: Compartilhar → Adicionar à Tela de Início → abrir como app da web, quando essa opção existir na versão instalada. Procedimento da [Apple](https://support.apple.com/en-in/guide/iphone/iphea86e5236/ios). Executar o [roteiro físico](IOS_TEST_CHECKLIST.md) primeiro em aba e depois no app instalado. As duas execuções precisam ser registradas separadamente.

## Arquivos da 6A

- `src/app/globals.css`: legibilidade, safe area de Auth, contraste de capítulo e avisos em fluxo no jogo.
- `src/app/layout.tsx`: posição estável do componente PWA antes do conteúdo.
- `src/components/pwa.tsx`: mensagem offline precisa.
- `src/features/auth/auth-form.tsx`: semântica do erro de e-mail.
- `src/features/portal/rules.tsx`: semântica de progresso do tutorial.
- `src/features/game-saves/manager.module.css`: safe areas na seleção/criação de partidas.
- `src/features/focus-engine/focus-duration-dial.tsx`: proteção contra arraste acidental no centro.
- `src/features/room/managed-game.ts` e `room-canvas.tsx`: limpeza de ciclo de vida do Phaser.
- `tests/support/save-fixture.mjs`: contas descartáveis próprias da auditoria, isoladas das outras suítes.
- `tests/unit/managed-game.test.ts` e `tests/e2e/mobile-audit.spec.ts`: regressões dos defeitos e auditoria.
- README, resultados de testes, este relatório, checklist iPhone e recibo sanitizado em `docs/deployments/`.

## Critérios de prontidão

Para mobile simulado: regressão completa, lint/TS/build aprovados; nenhuma violação Axe nos estados auditados; sem falhas de assets, mistura de partidas, mudança de duração bloqueada ou créditos duplicados; controles alcançáveis após redimensionar e avisos sem sobreposição; listeners estáveis após navegação.

Para declarar iPhone/Safari/PWA prontos: cumprir o roteiro físico em HTTPS, com registro de modelo/iOS/origem/build e evidência de foco real concluído e distribuído uma única vez. Qualquer dificuldade de toque, teclado, VoiceOver, rolagem ou restauração deve ser corrigida e repetida no mesmo dispositivo. Sem essa rodada, a aprovação vale somente para os ambientes simulados descritos aqui.

## Resultado final e próxima validação

**289 testes distintos aprovados**: 193 unidade/integração, 11 PostgreSQL nativo e 85 navegador; uma combinação desktop/toque omitida e executada no projeto mobile. Lint, TypeScript, build isolado e build final da raiz aprovados. A repetição final dos 85 cenários passou em 2,4 min. Os 20 screenshots da auditoria foram preservados localmente na pasta ignorada `.cache/mobile-ux-6a/evidence` e conferidos para bebê/adulto e avisos offline.

Servidor atualizado em `http://localhost:3000`, build `YgoE_vGZcO1bmtFA_oWfU`, anterior preservado em `.cache/production-before-6a-20261023`. Preflight sem foco ativo, uma sessão pausada. Doze tabelas críticas idênticas antes/depois do reinício (excluindo somente última utilização de saves). Nenhum comando de foco ou gravação de preferência no desenvolvimento. Smoke HTTP de `/`, `/play`, `/auth`, manifest e worker passou; seis destinos protegidos redirecionaram corretamente no navegador sem autenticação. Nos redirects transmitidos pelo Next, HTTP 200 não foi confundido com acesso autorizado: o destino final de login foi conferido no navegador. `/game/[saveId]` continua usando o destino de login `/saves` existente.

Credenciais e backups seguem ignorados; hash do backup cifrado, chave DPAPI e manifesto preservados. Nenhuma migração antiga, arquivo do motor de foco, composição LPC ou cena do quarto alterados. Os **17 arquivos da 6A** foram revisados para consolidação local, sem push. [Recibo sanitizado](deployments/2026-10-23-mobile-ux-validation.json).

Na consolidação de 24/10/2026, lint, TypeScript, build isolado e os mesmos 289 testes foram executados novamente; 85 cenários de navegador passaram em 3,8 min. Os três testes de limpeza do Phaser e os ciclos de navegação passaram. Doze tabelas críticas permaneceram idênticas, com uma sessão pausada e nenhuma ativa. Nenhum reinício ou build sobre o servidor habitual, comando de foco, alteração remota ou publicação HTTPS nesta rodada. A etapa seguinte prepara apenas a proposta 6B.

Prioridade seguinte: executar o roteiro físico em HTTPS antes de novas mecânicas. Depois, avaliar com o jogador se telas curtas precisam de maior compactação dos painéis e se a borda do dial está confortável para o polegar. Medir desempenho, memória e bateria no hardware antes de propor otimizações. Essas são recomendações de UX; não foram tratadas como defeitos comprovados nem implementadas nesta entrega.
