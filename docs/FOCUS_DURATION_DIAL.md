# Entrega 5G — controle giratório de foco

Base: **`68969fd752354dd3898ef2fe3dabbf7c1312906d`**, `feat: add immersive mobile game interface`. A consolidação 5F revisou seus 19 arquivos, repetiu 244 testes (177 unidade/integração, 11 PostgreSQL nativo e 56 navegador), lint, TypeScript e build isolado. Segredos/arquivos privados/backups ficaram fora do commit. A comparação somente de leitura preservou as 12 tabelas críticas, o saldo e uma sessão pausada; nenhuma ativa. A árvore ficou limpa após esse commit. Não houve push.

A implementação abaixo é a 5G, consolidada localmente após nova verificação, sem push.

## Componente e aparência

`FocusDurationDial` complementa o seletor convencional somente na apresentação compacta da interface imersiva. `/` e `/play` mantêm seus controles anteriores. O componente é montado no mesmo `Focus` já usado pelo bebê e pelo adulto; não altera o Phaser ou o sistema de saves.

Arte original em SVG/CSS: aro circular com sombra, corpo em relevo, treze marcações, indicação de minutos e marcador de posição. Cores e Pixelify Sans existentes, sem imagens externas ou novas dependências. O aro usa rotação limitada de −135° a +135°; a transição do marcador é decorativa e não mede tempo nem concede recompensas.

Pronto usa a paleta lavanda; ativo muda o preenchimento; pausa/interrupção usa aro tracejado; concluído possui texto próprio e centro desabilitado. Em 390px o controle tem 116px de largura, centro de 60px e botões alternativos de 44px. A região inferior ajusta o painel secundário para preservar o mundo visível; alturas menores podem usar a rolagem vertical já existente, sem fullscreen nativo. A captura mobile foi conferida.

## Interação

| Entrada | Comportamento |
|---|---|
| Arraste da borda | Ajuste relativo ao valor atual, com limiar de 6px e incrementos de um minuto |
| Cruzamento de ±180° | Delta angular contínuo; não troca mínimo por máximo |
| Extremos do arco | Limita a 2–120 minutos; inverter o giro volta a ajustar imediatamente |
| Cancelamento/perda de captura | Restaura a duração anterior ao gesto; se a sessão bloquear o controle, não escreve outro valor |
| Centro | Usa iniciar, pausar ou retomar do motor, conforme o estado real |
| Mais/menos | Ajusta um minuto; desabilitado no limite ou durante a sessão |
| Setas | Ajustam um minuto |
| Page Up / Page Down | Ajustam cinco minutos |
| Home / End | Selecionam 2 / 120 minutos |
| Entrada numérica / presets | Permanecem em “Duração e intenção do foco” e usam o mesmo estado |

Pointer Events são restritos à borda, com captura do ponteiro primário. O centro é um botão separado e não altera a duração. `touch-action: none` se limita à borda; gestos fora dela continuam sendo do navegador. Não há listener global de rolagem ou mouse. O SVG não permite seleção/arraste nativo de seus rótulos. Uma perda de captura atrasada não cancela uma nova captura do mesmo ponteiro. Capturas são liberadas ao terminar, bloquear ou desmontar.

O slider possui nome acessível, mínimo/máximo, valor e texto em minutos, descrição de teclado e estado de bloqueio. Botões nativos permitem uso por teclado, com foco visível. Movimento reduzido do sistema ou da conta desativa a transição do marcador. Isso foi conferido por CSS computado e auditoria automatizada; não substitui ensaio com VoiceOver no dispositivo.

## Integração e persistência

`Focus.minutes` continua sendo a única duração temporária. Ao montar um foco novo, usa `preferences.focus_minutes`; girar não chama a API de preferências. A entrada numérica compacta é normalizada para minutos inteiros, no mesmo intervalo já validado pelo servidor. A preferência permanente continua sendo salva apenas em Configurações.

Durante uma sessão, o componente, presets e entrada convencional ficam bloqueados. A duração mostrada é `session.planned_seconds / 60`, inclusive na recuperação de uma pausa com preferência padrão diferente. O tempo restante continua sendo calculado e exibido pelo motor original. Não há outro cronômetro, heartbeat ou armazenamento de duração.

O centro recebe os callbacks existentes de `start`, `pause.current` e `resume`. Uma trava de interface impede disparar novamente a ação central enquanto sua Promise aguarda resposta. IDs idempotentes, sequências, cálculo de tempo elegível, regras de conclusão e proteções contra múltiplas sessões continuam no código anterior. Animações não podem concluir foco: o estado concluído depende da confirmação do motor.

Abrir outros painéis mantém o `Focus`, seu dial e o canvas existentes. Pausar/retomar não muda a duração planejada. Não houve mudança de Auth, banco, migração, economia, aparência LPC, fases de vida ou renderização Phaser.

## Arquivos

- Novos: `src/features/focus-engine/dial-math.ts`, `focus-duration-dial.tsx` e `focus-duration-dial.css`.
- Adaptado: `src/features/focus-engine/focus.tsx`, somente integração visual, callbacks e valor apresentado nos controles.
- Testes novos: `tests/unit/focus-dial.test.ts` e `tests/e2e/focus-dial.spec.ts`.
- Fixture ajustada: `tests/support/save-fixture.mjs` separa as contas do seletor das contas dos testes de cuidados, evitando interferência entre arquivos executados em paralelo.
- Documentação: README, resultados dos testes, este relatório e recibo sanitizado em `docs/deployments/`.

## Verificação e limitações

A rodada de regressão executa 190 testes de unidade/integração, 11 nativos de concorrência e 66 cenários de navegador, total de **267 distintos**. Os treze casos matemáticos cobrem conversão, arredondamento, intervalo, direção, limites e cruzamento angular. Os dez cenários de navegador novos cobrem os controles, preferências, mouse, Pointer Events de toque via CDP/Chromium, cancelamento, duplo clique, teclado, bloqueio, conclusão confirmada, saldo, Phaser, movimento reduzido, auditoria WCAG A/AA e viewports de 320px, 390px e paisagem. **Todos aprovados**, com 66 casos de navegador em 1,9 min. Lint, TypeScript, build isolado e build final da raiz aprovados.

As suítes usam SQL descartável e Auth simulado. Os fluxos novos de foco interceptam respostas explicitamente simuladas, inclusive a conclusão acelerada, e conferem que o saldo e as sessões SQL da fixture não mudam. Isso testa integração de interface; não é uma nova sessão concluída no Supabase real. As regras de concorrência e economia são validadas separadamente pelo PostgreSQL nativo e pelas regressões anteriores. As tentativas com falhas durante desenvolvimento não contam como aprovação.

Sem Safari/iPhone físico ou PWA instalado nesta rodada. Toque via CDP e viewport Chromium não equivalem a hardware, Safari ou certificação de leitor de tela. A borda precisa de um gesto deliberado; botões e entrada numérica continuam disponíveis. Não há vibração, áudio, aceleração de giro ou persistência automática do ajuste temporário.

O servidor local é atualizado somente após preflight sem foco ativo; build anterior preservado em `.cache/production-before-5g`. Uma comparação somente de leitura verifica a sessão pausada e o saldo antes/depois. Não são executados comandos de foco ou gravações de preferências no desenvolvimento para testar o dial.

## Estado final

Serviço em `http://localhost:3000`, com a 5G disponível após recarregar a partida. Preflight: nenhuma sessão ativa e uma pausada. Comparação das 12 tabelas críticas após o reinício controlado: idênticas, excluindo apenas última utilização dos saves. Nenhum comando de foco, crédito gasto, alteração de preferência, migração ou mudança de personagem no Supabase de desenvolvimento. Os testes novos não acessam contas reais.

Na consolidação, foram revisados os dez arquivos previstos e a fixture de testes. Uma primeira rodada teve 65/66 cenários aprovados: outro arquivo consumia legitimamente um minuto da mesma conta descartável durante a comparação de saldo do seletor. As contas foram separadas por suíte; a rodada completa posterior é a evidência de aprovação. Não houve alteração no produto para corrigir essa interferência. Sem credenciais, backups ou dependências novas; sem push. Safari/iPhone físico continua pendente.
