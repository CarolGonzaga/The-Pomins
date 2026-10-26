# Entrega 6E — foco do bebê e continuidade da sessão

## Escopo e estado

Implementação local preparada para consolidação específica; sem push, publicação, alteração de dependências ou migração. Na implementação original a referência visual não veio anexada: a composição seguiu a direção escrita e a identidade existente. A imagem Carolita foi recebida na consolidação posterior; não houve outro redesign nem incorporação desse arquivo ao repositório nesta etapa.

As alterações anteriores em `.env.example`, `docs/CONTINUITY_INFORMATION_PLAN.md` e `docs/VERCEL_PREVIEW_6B.md` foram preservadas. Na implementação não houve consulta nem compra no Supabase remoto. Na consolidação posterior foram feitas apenas consultas de leitura de catálogo e integridade, documentadas em PREVIEW_6E_RELEASE.md. Os testes usam ambiente, usuários, sessões e saldos sintéticos.

## Tela

A apresentação do bebê mantém a ilustração e suas reações, adicionando quarto claro com janela, tapete, personagem maior e centralizado, badge de saldo, dial com tempo restante no centro e navegação inferior com área segura. Os seis cuidados têm ícones SVG originais, nome e indicação de 2 min. Selecionar um cuidado continua sendo uma reação visual gratuita; o comando de compra existente continua separado e mantém a confirmação de primeiro uso. Nenhum preço, efeito ou fluxo transacional foi alterado.

A composição usa CSS limitado à cena `nursery`, preservando a cena Phaser e a composição LPC adulta. O documento continua com uma só rolagem; há espaço reservado no fim para a barra fixa não impedir o acesso ao último controle. Conteúdo secundário continua acessível nos painéis. Tocar em uma seção da barra inferior revela seus controles na rolagem do documento, inclusive quando ela já estava selecionada. Em viewports baixos, os seis cuidados não ficam todos visíveis simultaneamente ao personagem e ao dial; a barra e a rolagem dão acesso sem painéis de rolagem aninhados.

## Causas e correções do timer

1. A tela antiga apresentava até cinco segundos ainda não confirmados. Ao receber uma resposta ou restaurar a sessão, voltava para `validated_ms`, aumentando o tempo restante. `ConfirmedFocusClock` agora limita a apresentação ao tempo confirmado, ignora confirmações antigas e mantém avanço monotônico com relógio local monotônico (`performance.now`). Pausa/recuperação mostram o valor confirmado exato. A origem de crédito continua sendo exclusivamente o servidor para contas autenticadas.
2. O componente recuperava a sessão a cada montagem; a recuperação do servidor assume uma interrupção e renova a identificação do cliente. O controlador agora fica no layout compartilhado, identificado pela conta, acima das rotas. Remontar a interface conhecida não executa `recover` nem inicia outra sessão. Heartbeats continuam durante navegação interna no mesmo documento, inclusive com a tela de foco desmontada.
3. `blur`/`hasFocus` confundiam perda de foco de janela/controles com saída efetiva do app. Agora a interrupção usa documento oculto, `pagehide` e perda de conexão. Retornar ao app não retoma automaticamente. Navegação interna utiliza Next Link/router; troca de morador preserva a sessão original e não transfere seu destino.
4. O botão Encerrar dependia de uma flag de requisição que também mudava em cada heartbeat. A serialização de comandos continua, mas a UI só fica ocupada durante comandos manuais e conclusão. O botão mantém a mesma identidade e não alterna `disabled` a cada confirmação.
5. O relógio tem assinatura separada, atualizada por segundo; o dial é memoizado. O controlador usa um único conjunto de listeners e agendamento por conta/documento. Resposta tardia após ocultar a página não reinicia o relógio visual.

### Precisão e limites deliberados

Não há contagem especulativa: ao iniciar ou retomar, a leitura pode aguardar a primeira confirmação (normalmente cerca de cinco segundos). Depois, interpola suavemente somente o intervalo já confirmado. Ao pausar, pode avançar até o último valor confirmado; o tempo restante não aumenta para desfazer progresso visual inventado. Não foi modificada a janela de heartbeat nem o cálculo de tempo elegível do backend.

Recarregar o documento, fechar o navegador, bloquear o iPhone, mudar de aplicativo ou perder a conexão continua exigindo recuperação/retomada explícita. Não é concedido tempo offline ou em segundo plano. O Wake Lock é apenas uma ajuda de apresentação e não uma prova de foco. Não é garantido impedir o bloqueio de tela no Safari.

## Arquivos

- `src/app/layout.tsx`: provedor compartilhado por conta.
- `src/features/focus-engine/provider.tsx`: contexto do controlador.
- `src/features/focus-engine/runtime.ts`: sessão, comandos serializados, heartbeat, listeners, relógio confirmado e recuperação.
- `src/features/focus-engine/focus.tsx`: apresentação e comandos do controlador, com leitura isolada do relógio.
- `src/features/focus-engine/focus-duration-dial.tsx`: leitura central e memoização, mantendo gestos e alternativas acessíveis.
- `src/features/game-screen/game-screen.tsx` e `nursery-screen.css`: composição do bebê e saldo.
- `src/features/baby-care/care-icon.tsx` e `baby-care.tsx`: seis ícones próprios e rótulos existentes.
- `src/components/game.tsx`, `src/features/room/room-app.tsx`, `src/features/game-saves/save-player.tsx` e `src/features/portal/navigation.tsx`: montagem da interface e navegação no mesmo documento.
- `tests/unit/focus-runtime.test.ts`: relógio, recuperação, remount, rede, resposta tardia, conclusão única e isolamento do destino.
- `tests/e2e/nursery-focus.spec.ts`: aparência responsiva, acessibilidade, continuidade entre rotas, tempo e botão estável.
- `tests/e2e/accessibility.spec.ts`, `immersive-game.spec.ts`, `mobile-audit.spec.ts`, `ux-6c.spec.ts`: expectativas atualizadas e regressão.
- `tests/support/save-fixture.mjs`: contas sintéticas independentes para os novos testes.

## Validação local

- Lint: aprovado, sem avisos.
- TypeScript: aprovado.
- Build Next.js com webpack: aprovado em cópia isolada com variáveis sintéticas; o build e o servidor reais não foram substituídos. Aviso de múltiplos lockfiles decorre da pasta isolada de validação.
- Vitest: 227 aprovados; 53 casos dependentes de PostgreSQL externo ficam ignorados na execução padrão e foram executados separadamente abaixo.
- PostgreSQL descartável: 25 testes de cuidados pagos, 17 de fundação de economia e 11 de concorrência aprovados (53). Backups sintéticos de duas suítes restaurados e comparados com sucesso.
- Navegador: regressão completa com 113 aprovados e um ignorado (cancelamento por toque executado apenas no projeto mobile). Após o último ajuste de revelação dos painéis, os 16 casos de nursery-focus e ux-6c foram reexecutados e aprovados em ambos os projetos. Chromium desktop e Chromium com viewport/toque de iPhone não equivalem a Safari físico.
- Novos testes não chamam compras nem iniciam sessões em contas reais. Nas verificações de ciclo de vida, o transporte do foco é simulado e o estado SQL da fixture é comparado antes/depois.

## Evidências visuais

Antes: `.cache/6e-evidence/before-iphone.png` (captura anterior da mesma base, com estado demonstrativo diferente).
Depois: `.cache/6e-evidence/after-iphone.png` e `after-desktop.png`, além de `after-iphone-care.png` e `after-iphone-dark.png` (fixtures sintéticas). As capturas não representam o saldo remoto do jogador.

## Roteiro físico — Safari e app adicionado à Tela de Início

1. Somente após autorização, publicar a versão em Preview HTTPS e verificar o commit correspondente. Manter o Supabase de desenvolvimento e os redirects já autorizados.
2. Abrir no Safari e no app instalado pela Tela de Início. Conferir safe areas, barra inferior, zoom, retrato e paisagem, ausência de rolagem horizontal e acesso ao fim dos cuidados. Conferir humano/alienígena, tema claro/escuro e movimento reduzido.
3. Em conta específica para testes e sessão autorizada, escolher uma duração curta, iniciar e aguardar a primeira confirmação. Anotar o tempo; visitar Menu, Regras, Configurações e Partidas, e voltar ao mesmo save sem recarregar. Deve continuar ativa, sem duplicar sessão e sem aumentar o restante.
4. Observar Encerrar por vários heartbeats; deve permanecer estável. Usar dial por toque, botões e VoiceOver. A duração de uma sessão iniciada deve permanecer bloqueada.
5. Pausar manualmente, navegar e voltar. O tempo pausado deve ficar igual. Retomar exige comando explícito.
6. Mudar de app, bloquear a tela e retornar. Deve exigir retomada, preservar somente tempo confirmado e não conceder progresso durante a ausência. Repetir com perda de rede e recarga do documento.
7. Abrir outro save/morador: o destino da sessão original e o saldo global devem permanecer; não iniciar outro foco concorrente. Após uma conclusão autorizada, verificar crédito uma única vez. Não executar cuidados pagos apenas para testar o visual.

Não houve validação física de Safari/PWA neste ambiente. Permanecem necessários os testes reais de gestão de memória/suspensão do iOS, VoiceOver e comportamento do Wake Lock. Nenhuma constância, regressão, encerramento ou automação foi ativada.

## Consolidação e preparação Preview

Ver [PREVIEW_6E_RELEASE.md](PREVIEW_6E_RELEASE.md) para a revisão atual de Git, configurações, compatibilidade e checklist físico. A consolidação repete lint, TypeScript, build, 227 testes locais, 53 em PostgreSQL descartável e a suíte de navegador; não usa aprovações antigas como evidência.
