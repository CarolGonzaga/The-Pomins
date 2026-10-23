# Entrega 5E — menu, regras e configurações

Base: `49ce61e8e47f2ce77e771af43ecd528e5fce2604` (`feat: add multi-save management`). A consolidação 5D revisou 30 arquivos, repetiu 211 testes/lint/TypeScript/build, conferiu SQL/funções/tabela privada no desenvolvimento por leitura e terminou com árvore limpa. Nenhuma migração foi reaplicada, sessão de foco reiniciada ou push realizado. As alterações abaixo compõem a 5E consolidada localmente.

## Entrada e navegação

Login e confirmação de cadastro agora seguem para `/menu`. O retorno de login aceita somente `/menu`, `/rules`, `/settings`, `/saves` e `/saves/new`, sem destinos externos. A recuperação mantém `/auth/callback?next=/auth?mode=update`; depois da troca de senha, abre o menu. Nenhuma nova URL de callback ou configuração Auth é exigida.

O menu autenticado tem somente **Começar → `/saves`**, **Regras → `/rules`** e **Configurações → `/settings`**. `/menu`, `/rules` e `/settings` verificam a identidade no servidor com `getUser`; serviço indisponível mostra erro e não libera uma exploração visitante. `/saves` e `/saves/new` mantêm as proteções existentes. `/game/[saveId]` passa a direcionar visitantes ao login com retorno à lista, preservando a autorização por save 5C.

`/` e `/play` continuam acessíveis com suas experiências legadas. Partidas e jogo oferecem retorno ao menu; links novos recusam saída enquanto a aba está em foco ativo e pedem uso dos controles existentes. Não chamam comandos de foco. Ler um menu, tutorial ou configuração não cria, conclui, cancela ou recupera sessões.

O link “Privacidade e dados do universo” em Configurações abre `/?panel=preferences` e reutiliza o painel anterior de privacidade, instalação e dados, inclusive suas confirmações já existentes. Essas implementações foram preservadas. O logout da interface legada agora passa pela mesma verificação de foco ativo e usa somente a sessão deste navegador.

## Visual e regras

Paisagem vetorial em pixel art e quatro avatares desenhados por código, originais. Cores suaves, molduras discretas e botões de pelo menos 60px no menu. Tipografia Pixelify Sans em títulos/opções; formulários e textos usam a fonte de leitura existente. Não foram usados recursos ou interfaces copiados de outros jogos. O quarto e as cenas Phaser permanecem iguais; apenas o cabeçalho permite quebra de linha para acomodar o acesso ao menu em telas estreitas.

Safe areas nos quatro lados, `100dvh`, navegação por teclado e indicadores de foco. Transições curtas, sem fullscreen nativo. Movimento reduzido do sistema e da conta desativa movimentos decorativos da interface; animações funcionais do Phaser não foram reescritas. CSS adapta a largura sem rolagem horizontal.

Tutorial com seis etapas e controles Anterior/Próximo/Pular/Voltar: iniciar foco, conquistar/distribuir minutos, cuidados, envelhecimento voluntário, partidas e saldo global. A etapa de crescimento deixa explícito que a transição visual para infância ainda não está disponível. Exemplos são ilustrativos e não iniciam um cronômetro nem atribuem crédito.

## Preferências reais, globais da conta

Sem nova migração. `auth.users.raw_user_meta_data.pomins_preferences` é escrito pela API Auth autenticada `updateUser`, preservando os outros metadados. Não é usado em autorização, RLS, papéis ou propriedade dos saves.

| Campo | Valores | Aplicação |
|---|---|---|
| `focus_minutes` | inteiro de 2 a 120, padrão 2 | valor inicial dos controles de uma nova montagem de `Focus` |
| `theme` | `light`, `dark`, `system` | tema global; sistema acompanha `prefers-color-scheme` |
| `reduce_motion` | booleano, padrão false | reduz animações da interface; preferência do dispositivo continua respeitada |
| `avatar` | `sprout`, `moon`, `star`, `flower` | avatar do perfil no menu/configurações e perfil legado |

Configurações são carregadas por identidade verificada no servidor e validadas por Zod. Metadados inválidos recebem padrões seguros. O provider global é identificado pela conta e substituído ao trocar de usuário. Preferências autenticadas não são guardadas numa chave local compartilhada; o tema legado de visitante continua separado.

O botão Salvar só confirma sucesso após resposta do Auth. Falha deixa um erro real. A resposta valida o usuário; o cabeçalho `X-Pomins-Account` detecta uma aba com contexto antigo, sem substituir a identificação por `getUser`. Duração salva afeta apenas futuras sessões; `planned_seconds`, saldo e regras do motor atual são preservados. Não há novo temporizador, seletor giratório ou modo de pausas.

Não aparecem controles de áudio ou duração de pausas: esses recursos não existem no motor atual. Foto enviada por arquivo/Storage não foi acrescentada; a escolha de avatar já atende à personalização do perfil sem dependências ou políticas novas.

## Alterações sensíveis e logout

`/api/account` valida origem, identidade e contexto da conta. Antes das operações confere se há foco ativo global e recusa a alteração/saída nesses casos, sem pausá-lo. E-mail novo exige senha atual, verificação de MFA quando aplicável e reautenticação em um cliente temporário sem armazenamento de sessão. A identidade reautenticada precisa coincidir com a conta original. Somente a sessão temporária é encerrada; a troca depende das confirmações de e-mail do Supabase. Nenhuma confirmação é contornada.

Senha: envia ao e-mail verificado o fluxo de recuperação já existente, com callback aprovado; a nova senha é digitada no aplicativo após o link. Logout limpa a sessão deste navegador no Auth/SSR e no cliente, sem excluir personagens ou histórico e sem mudar o estado persistido do foco. Não foram alteradas configurações do provedor, políticas de senha, SMTP ou migrações.

## Recursos e arquivos

Fonte local: `public/fonts/pixelify-sans/PixelifySans.ttf`, Pixelify Sans Project Authors, **SIL Open Font License 1.1**; licença completa em `OFL.txt`, atribuição em `/credits`. Fonte oficial: [Google Fonts](https://github.com/google/fonts/tree/main/ofl/pixelifysans). Assets LPC e seus créditos permanecem preservados. Sem pacote novo ou modificação de lockfile.

Novos: `app/(portal)/{layout,loading,error}.tsx`, páginas `menu`, `rules` e `settings`; `app/api/{preferences,account}/route.ts`; `features/portal/{frame,navigation,landscape,account-badge,rules}.tsx` e CSS; `features/preferences/{model,server,provider,avatar,settings}`; fonte/licença; testes `preferences`, `account-routes` e `portal`.

Adaptados: layout global/provider, AuthForm/callback e teste de retorno, acesso visitante à rota de jogo, links de Game/RoomApp/SavePlayer/lista, perfil/tema legado autenticado, somente duração inicial em `Focus`, CSS de movimento e quebra de linha do cabeçalho. Gateway descartável ampliado para simular Auth, sem código de teste acessível no produto.

## Testes e limites

`npm run lint`, `npm run typecheck`, `npm test` e `node scripts/validate-explicit-saves-local.mjs`; o último compila em cópia isolada com identidade Auth simulada/PGlite e testa desktop e viewport/toque de iPhone. A consolidação 5D executou também os 11 testes nativos; o SQL de foco/saves continua idêntico.

Regressão 5E: **233 testes distintos aprovados** — 174 de unidade/integração, 11 nativos de concorrência (835ms) e 48 de navegador (rodada final aproximadamente 1,5 minuto). Lint e TypeScript aprovados; build de produção da cópia isolada e build da raiz aprovados. As capturas de menu e configurações em desktop/mobile foram conferidas; WCAG A/AA sem violações nas telas novas testadas. O gateway recebeu respostas Auth realistas para token, fatores, atualização com callback PKCE, recuperação e logout; as primeiras tentativas incompletas não contam como aprovação.

**Validação real separada:** `scripts/validate-menu-development.mjs` passou em sete grupos com as duas contas de desenvolvimento: login/cookies, SSR das novas rotas e legadas, bloqueio anônimo/contexto antigo, gravação real de preferências/avatar, novo login, restauração integral dos metadados anteriores e comparação dos mundos/saldo/sessões. As preferências temporárias de teste foram removidas/restauradas conforme o estado original; nenhum e-mail, senha ou protagonista real foi alterado e nenhum link de recuperação foi enviado. Não houve execução de migrações. O servidor auxiliar 3183 foi encerrado ao terminar.

Servidor habitual atualizado em `http://localhost:3000/menu`, com build anterior preservado localmente. Antes/depois do reinício controlado, 12 tabelas críticas permaneceram idênticas, desconsiderando apenas a última utilização dos saves; uma sessão pausada preservada, nenhuma ativa no preflight. Oito conferências reais adicionais de leitura em 3000 confirmaram as rotas de partidas/jogo/legadas sem alterações de progresso. Não há commit 5E ou push; a árvore ficou limpa ao concluir o commit 5D e agora contém exclusivamente a implementação 5E ainda não commitada.

A suíte nova cobre redirects, seis passos, pular tutorial, menu/saves, preferências e tema após recarga/restauração de cookies, avatar, sistema/movimento reduzido, duração de nova sessão, reautenticação de e-mail, recuperação, logout/login, WCAG A/AA e ausência de comandos de foco durante navegação. Dados, e-mails e senhas do gateway são fictícios, exclusivos do teste; não validam entrega real de e-mail.

Limites: sem sincronização instantânea de preferências entre dispositivos; uma recarga ou novo login restaura o estado do servidor. Escritas simultâneas nas preferências usam a última gravação. Confirmação real de troca de e-mail/recuperação exige interação do titular em sua caixa de entrada e não deve ser declarada aprovada com base no gateway. Safari/iPhone físico ainda exige validação; Chromium com viewport de iPhone não equivale a Safari. Pausas programadas, áudio, upload de fotos, infância e fullscreen continuam fora desta entrega.

## Consolidação 5E

Rodada repetida antes do commit `feat: add game menu and account settings`: 47 arquivos revisados, 174 testes de unidade/integração, 11 PostgreSQL nativo e 48 Playwright (1,5 min), total **233 aprovados**. Lint, TypeScript e build de produção isolado aprovados. A primeira tentativa das suítes com servidores locais não concluiu por isolamento de rede; somente a execução completa com loopback autorizado conta como aprovação.

Leitura real autenticada em 3000 confirmou `/menu`, `/rules`, `/settings`, `/saves`, `/game/[saveId]` e rotas legadas, isolamento e preferências relidas sem gravações. Comparação antes/depois das 12 tabelas críticas: idênticas, excluindo apenas `game_saves.last_used_at`; uma sessão pausada e nenhuma ativa, saldo preservado. Não foram repetidas gravações de preferências, envio de e-mails ou operações de foco. A persistência após gravação foi repetida no gateway descartável; a validação remota com gravação/restauração anterior permanece identificada separadamente acima. Nenhuma migração necessária ou reaplicada, nenhuma dependência nova, credencial ou backup incluído. Servidor 3000 preservado sem reinício nesta consolidação.
