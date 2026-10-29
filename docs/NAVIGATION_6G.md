# Entrega 6G — navegação de jogo

## Fluxo e escopo

Visitante em `/` encontra a autenticação. Conta autenticada em `/` ou `/auth`
segue para `/menu`; recuperação `/auth?mode=update` e mensagens de callback
continuam acessíveis. O callback PKCE, os cookies SSR e as operações de Auth
existentes foram preservados. A entrada consulta a conta, sem criar uma partida.

O menu oferece cinco ações verticais: **Iniciar, Carregar, Regras,
Configurações e Sair**. A cena pixelada é o SVG original `Landscape`, com
Jersey 20, paleta existente, áreas seguras e alvos de pelo menos 48 px.
Não há dependências ou assets novos. Movimento reduzido permanece respeitado.

| Antes | Depois |
| --- | --- |
| `/` abria a exploração e a experiência antiga | Autenticação; exploração preservada em `/explore` |
| Começar levava à lista antes de criar | Iniciar abre diretamente `/saves/new` |
| Menu com três links | Cinco ações de jogo |
| Tutorial de seis etapas como apresentação de Regras | Regras essenciais; tutorial completo opcional |
| Preferências e segurança em uma página longa | Quatro categorias com controles sob demanda |
| Progresso escondido em Mais opções | Cuidados/Atividades, Progresso, História, Moradores |
| Trocar painel rolava o documento | Gaveta com rolagem própria, botão de voltar e Escape |
| Privacidade acessível pelo jogo legado | Categoria de privacidade usa as APIs existentes |

A criação mantém o nome da partida e o request idempotente já existentes;
visitar a página não cria saves. Criador, nascimento e primeira memória são
reutilizados. Nada sobrescreve moradores existentes. Arquivar fica em Opções;
restaurar permanece na lista separada de arquivadas. Listar usa a RPC anterior.

## Estado, ajuda e segurança

Mundo, Phaser e foco permanecem montados ao trocar painéis. A gaveta não é modal:
os quatro controles continuam disponíveis. Voltar ao jogo/Escape fecha a gaveta;
abrir o menu secundário também a recolhe para não sobrepor suas opções. Partidas
sem protagonista mantêm a seleção explícita visível; nenhum morador é escolhido
automaticamente. O motor e os providers globais de foco não foram alterados.

Como jogar é uma ajuda curta e recolhida, nunca uma etapa obrigatória.
Entendi guarda a conclusão em localStorage por conta e sincroniza abas no mesmo
navegador. Não foi encontrada uma preferência antiga específica de tutorial;
`birth_read` e a primeira memória são independentes e permanecem intactos.
Essa preferência de ajuda é local ao dispositivo; o tutorial completo segue
acessível em Regras. Preferências reais da conta continuam no Auth metadata.

`GET /api/account` verifica o usuário com `getUser`, filtra leituras pelo
proprietário e devolve somente status do foco e visibilidade do perfil com
`private, no-store`. Não chama RPCs de foco ou carregamento de save.
Logout falha de forma segura se essa leitura falhar; foco ativo exige pausa
explícita pelos controles; pausado/interrompido exige confirmação e fica salvo.
O POST anterior conserva as verificações de origem, conta e sessão ativa.

Configurações preservam duração, tema, movimento reduzido, avatar, recuperação
e alteração de e-mail com senha atual. Privacidade reutiliza `kind:privacy`;
exclusão reutiliza `kind:delete`, com aviso permanente e confirmação EXCLUIR.
Não há controles fictícios de áudio, pausas ou fases não suportadas.

## Compatibilidade com 6F

Commits anteriores preservados: `102c3a9` e `9f51baa`. A migração
`20261029195215_elapsed_time_baby_needs.sql` não foi modificada nem aplicada.
Valores efetivos, bandas 60/40, necessidade individual crítica abaixo de 20,
expressões humanas/alienígenas e relógio do servidor são os da 6F. Os cuidados
persistentes continuam em 2 minutos. O DTO `needs_clock` é opcional, mantendo a
interface compatível com o banco anterior enquanto a migração não é aplicada.

Nenhuma taxa, penalidade, regressão, encerramento ou cron foi ativado.
Nenhuma compra, sessão ou escrita foi executada em contas reais nesta entrega.
O servidor real em 3000, os arquivos privados e os backups foram preservados.

## Validação

Validação em 29/10/2026: **506 casos distintos aprovados**:

- `npm run lint`: aprovado, sem avisos.
- `npm run typecheck`: aprovado.
- `npm test`: 273 aprovados; os 88 casos opcionais de PostgreSQL foram
  executados separadamente, sem contá-los duas vezes.
- PostgreSQL nativo descartável: 88 aprovados (28 necessidades, 24 fundação/
  constância, 25 cuidados pagos, 11 concorrência). Dump/restauração comparados:
  33 tabelas na suíte de necessidades e 31 nas de fundação/cuidados.
- Playwright: 145 casos distintos aprovados em Chromium desktop e iPhone
  simulado. Um caso de toque foi ignorado somente no desktop e passou no mobile.
  A regressão completa final aprovou 143 casos; os dois casos de listagem/
  privacidade passaram na repetição direcionada após corrigir exclusivamente
  as asserções do teste (DTO `context.save` e confirmação assíncrona do checkbox).
- Build Next.js webpack isolado: aprovado com todas as rotas, incluindo
  `/explore`. Nenhum código da aplicação mudou após esse build.

Cobertura nova: entrada/menu/recuperação, cinco ações, seis larguras,
refluxo com texto ampliado, categorias, erro de rede, logout ativo/pausado,
listagem sem progresso, privacidade persistida, confirmação destrutiva sem
submeter exclusão, identidade DOM do mundo/timer, posição da página e ajuda
concluída. A suíte anterior cobre criação, protagonista, arquivo/restauração,
auth, Phaser, dial, cuidados pagos, necessidades, constância e foco.

A validação encontrou e corrigiu a seleção pendente escondida pela gaveta,
rótulos largos em 320 px, encaixe vertical do menu em telas baixas e retorno
do foco de teclado sem rolar o documento. As asserções antigas foram adaptadas
ao fluxo explícito de abrir/fechar painéis, sem retirar a cobertura econômica.

As capturas antes/depois ficam apenas em `.cache/navigation-6g/`, fora do Git.
O antes corresponde ao build local da 6F; o depois usa a mesma implementação de
personagens com dados sintéticos. Não são capturas do Supabase remoto.

Comparações locais: `menu-before.png` / `menu-after.png`,
`settings-before.png` / `settings-after.png`, `game-before.png` /
`game-after.png`; `care-sheet-after.png` mostra o conteúdo sob demanda.
As capturas anteriores têm a viewport/densidade dos testes da 6F; são
referências de composição, não uma medição de diferença pixel a pixel.

O app foi compilado numa cópia isolada em `.cache/ux-6c`, com gateway em 3181 e
servidor em 3192, sem as credenciais reais. Os bancos PostgreSQL são descartáveis.
O aviso de múltiplos lockfiles pertence à cópia isolada.

## Plano coordenado de publicação 6F + 6G

1. Obter autorização específica para publicar os três commits locais e aplicar
   somente a migração 6F ao projeto de desenvolvimento correto.
2. Conferir histórico remoto, esquema, sessões abertas, créditos, distribuições,
   vínculos e backups privados. Não reaplicar versões já registradas.
3. Fazer backup cifrado atualizado e restaurá-lo em banco isolado; comparar
   dados, permissões e integridade antes de prosseguir. Falha interrompe o plano.
4. Revisar e aprovar separadamente as taxas candidatas da 6F e sua data de
   ativação. A migração nasce inativa e sua aplicação não autoriza ativação.
5. Aplicar a migração autorizada com release inativa. Comparar assinaturas e
   permissões de leitura/compra, RLS, saldo, sessões e históricos. As assinaturas
   e preço são compatíveis com clientes anteriores; `needs_clock` é adicional.
6. Publicar por avanço direto de `main`, sem force push, com os dois commits 6F
   e este commit 6G. Conferir o SHA do deployment e HTTPS/callbacks existentes.
7. Validar Safari e PWA com taxas ainda inativas. Uma futura ativação exige nova
   autorização e instante não retroativo. Não misturar essa operação ao deploy.
8. Comparar novamente saldo, saves e sessões. Em falha de interface, reverter o
   deployment; manter a migração aditiva inativa. Não reverter dados nem executar
   reset. Recuperação de backup exige decisão explícita e preservar gravações
   posteriores ao backup.

Não houve push, deploy, configuração remota ou migração nesta entrega.

## Roteiro físico pendente

- Safari/PWA: login, confirmação e recuperação no mesmo navegador; menu após
  entrar; nova partida separada e carregar o mesmo save depois de sair/entrar.
- iPhone vertical/horizontal, barra de endereço e teclado: alvos, safe areas,
  zoom de texto e rolagem necessária; nenhuma rolagem horizontal.
- VoiceOver: ordem dos cinco comandos, categorias, cabeçalho da gaveta, fechar,
  tutorial opcional e aviso de confirmação da saída.
- Cuidados, Progresso, História e Moradores: uma área por vez; fechar retorna
  ao jogo; Aparência do adulto continua no menu secundário sem recriar Phaser.
- Foco: girar, iniciar/pausar somente em sessão de teste autorizada, navegar para
  menu/configurações/partidas e voltar; sair do aplicativo, bloquear/desbloquear,
  perder rede e reconectar; tempo confirmado não aumenta, Encerrar não pisca.
- Logout: ativo pede pausa; pausado pede confirmação sem cancelar; falha de rede
  mantém a conta. Conferir saldo sem gastar os minutos existentes.
- 6F: humano/alienígena e três humores, bandas, confirmação do servidor e reação
  gratuita; compra somente com autorização/conta específica. Ausência de punições.

Chromium com viewport de iPhone não comprova Safari físico, PWA instalada,
VoiceOver, Dynamic Island ou teclado nativo. Esses pontos seguem pendentes.

## Arquivos da entrega

- README.md
- src/app/(portal)/menu/page.tsx
- src/app/api/account/route.ts
- src/app/auth/page.tsx
- src/app/globals.css
- src/app/page.tsx
- src/app/saves/new/page.tsx
- src/app/saves/page.tsx
- src/features/auth/auth-form.tsx
- src/features/game-saves/new-save-form.tsx
- src/features/game-saves/save-manager.tsx
- src/features/game-screen/game-screen.css
- src/features/game-screen/game-screen.tsx
- src/features/portal/portal.module.css
- src/features/portal/rules.tsx
- src/features/preferences/model.ts
- src/features/preferences/settings.tsx
- src/features/room/room-app.tsx
- tests/e2e/accessibility.spec.ts
- tests/e2e/baby-care.spec.ts
- tests/e2e/baby-needs.spec.ts
- tests/e2e/baby-preview.spec.ts
- tests/e2e/focus-dial.spec.ts
- tests/e2e/immersive-game.spec.ts
- tests/e2e/journey.spec.ts
- tests/e2e/mobile-audit.spec.ts
- tests/e2e/nursery-focus.spec.ts
- tests/e2e/paid-care.spec.ts
- tests/e2e/portal.spec.ts
- tests/e2e/save-manager.spec.ts
- tests/e2e/ux-6c.spec.ts
- tests/support/save-fixture.mjs
- tests/support/save-gateway.mjs
- tests/support/ui.ts
- tests/unit/preferences.test.ts
- docs/NAVIGATION_6G.md
- src/app/explore/page.tsx
- src/features/portal/context-help.tsx
- src/features/portal/logout-button.tsx
- src/features/preferences/privacy-data.tsx
- tests/e2e/navigation-6g.spec.ts
- tests/unit/account-status.test.ts
- tests/unit/entry-routes.test.ts
