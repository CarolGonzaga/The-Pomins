# Entrega 2 — Configuração e validação real do Supabase

Data: 21/10/2026. Base preservada: `82e35eb`, branch `codex/consolidacao-base`.

**Estado: critério principal e testes remotos com duas contas aprovados no desenvolvimento.** Cadastro confirmado, login/logout, recovery, personagem/aparência, foco concluído, distribuição e restauração foram verificados. APIs reais aprovaram isolamento/RLS, repetição, rollback, disputa de saldo e controle de posse da sessão. Evidências e limites em [2026-10-21-supabase-runtime-validation.json](deployments/2026-10-21-supabase-runtime-validation.json). Não equivale à validação de produção ou de iPhone físico.

O diagnóstico fornecido pelo usuário mostrou inicialmente as 13 tabelas ausentes e nenhum histórico. Após autorização explícita, login no Dashboard e conexão da integração Supabase, repetimos o preflight real: zero tabelas do Pomins, zero usuários Auth e histórico ausente. As duas migrações foram então aplicadas em um único lote pela integração Supabase, com sucesso.

## Aplicação remota autorizada — 21/10/2026

Registro remoto: versão `20261021201224`, nome `initial_pomins_foundation_and_playable_room`. Os dois SQLs originais foram usados em ordem, sem alterar seus arquivos locais. A integração geriu a transação e o histórico; o guard inicial foi adaptado apenas para não recusar a tabela de histórico criada pelo próprio mecanismo de migração. As verificações de estrutura existente e contas Auth foram mantidas.

O catálogo remoto confirmou **13 tabelas com RLS, 7 RPCs, 4 triggers e 14 políticas**. Todas as 7 RPCs negam `EXECUTE` a `anon`, permitem ao papel `authenticated` e usam `search_path` vazio. Não foram encontrados grants de tabela inesperados para `anon`/`PUBLIC`; a única atualização de coluna concedida ao usuário comum é `profiles.is_public`. As três atividades (`read`, `sleep`, `study`) foram conferidas. Seis consultas HTTP anônimas de tabelas passaram de 404 para **401/42501**, demonstrando disponibilidade no PostgREST com acesso anônimo recusado; isso ainda não prova isolamento entre duas contas autenticadas.

Recibo sem credenciais: [2026-10-21-supabase-initial.json](deployments/2026-10-21-supabase-initial.json), com versões, hashes e verificações. O histórico remoto registra **um lote contendo os dois arquivos**, não as duas versões locais separadamente. Não executar `supabase db push` cegamente: será necessário reconciliar esse mapeamento antes de adotar a CLI para migrações futuras. Não houve `migration repair`, renomeação dos arquivos locais, reset, exclusão de dados ou push Git.

O Advisor retornou 7 avisos de RPCs `SECURITY DEFINER` executáveis por autenticados, correspondentes à arquitetura existente com autorização por `auth.uid()` e escrita direta bloqueada. Não foram removidas permissões necessárias ao aplicativo; a validação com contas reais continua necessária. Também retornou 10 recomendações informativas de índices para FKs e 4 índices ainda não usados no banco recém-criado. Nenhum índice foi apagado nem criada migração adicional fora do plano autorizado. Referências: [SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [índices de FKs](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).

## 1. Configuração realizada

As variáveis usadas pelo código são `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. `NEXT_PUBLIC_APP_URL` define a origem canônica do retorno no servidor; deve corresponder à origem do navegador e à allowlist do Supabase. Os links solicitados pelo formulário usam a origem atual do navegador.

O `.env.local` foi criado com valores vazios, sem credenciais fictícias, e depois preenchido pelo usuário com os dados reais do desenvolvimento. A configuração atual usa a chave pública legada `anon`, compatível com o cliente instalado. Nenhum valor, fragmento, token de sessão, senha ou identificador do projeto é registrado neste relatório. O arquivo foi confirmado como ignorado pelo Git.

Durante o preenchimento, foi detectada uma chave `service_role` no campo público. A sondagem foi bloqueada antes de enviar qualquer requisição; somente esse campo foi esvaziado, preservando as demais configurações. O usuário substituiu-o pela chave `anon`. Não houve build com a chave privilegiada durante esta tarefa. Uma proteção em `next.config.mjs` agora rejeita chaves `sb_secret_` e JWTs `service_role` antes da compilação, com mensagem sem o valor. Ela é uma verificação de tipo conhecido, não uma verificação criptográfica de JWT.

Obtenção dos valores: diálogo **Connect** do projeto ou **Settings → API Keys**. Usar publishable key ou `anon`; nunca `service_role` ou secret key em `NEXT_PUBLIC_*`. Referência: [API keys](https://supabase.com/docs/guides/getting-started/api-keys).

Nenhuma dependência foi instalada nesta entrega. Design, nascimento, Phaser, LPC e regras do Pomodoro permaneceram intactos.

## 2. Migrações encontradas e estado

| Arquivo | Efeito esperado | Validação local | Estado remoto |
| --- | --- | --- | --- |
| `202610160001_foundation.sql` | 7 tabelas de perfil/personagem/foco, Auth trigger, RLS e RPCs | Aprovada em banco isolado | Aplicada no lote `20261021201224`; catálogo verificado |
| `202610210001_playable_room.sql` | 6 tabelas adicionais, expansão de personagens, créditos, alocação, funções e triggers | Aprovada preservando o fluxo anterior | Aplicada no mesmo lote; catálogo e atividades verificados |

Os dois arquivos permaneceram idênticos ao commit-base. A segunda migração não remove tabelas nem personagens, mas faz backfills, adiciona colunas obrigatórias, substitui `one_playable_life` por `one_legacy_life` e atualiza funções. Não é uma operação que deva ser executada às cegas. Os arquivos não são scripts idempotentes para reaplicação.

A consulta anônima de todas as 13 tabelas retornou HTTP 404, código `PGRST205`, com `limit=0` para não ler registros. Esse retorno sozinho não determinava o estado das migrações nem aprovava RLS. O diagnóstico SQL posterior fornecido pelo usuário confirmou a ausência da estrutura do Pomins.

Inicialmente o Dashboard exigia login e o usuário forneceu a inspeção do SQL Editor. Depois, o usuário entrou no painel e conectou a integração Supabase. O projeto foi comparado ao `.env.local` antes da aplicação. As URLs de autenticação foram verificadas e configuradas separadamente, conforme a seção 3.

### Preparação do lote autorizado

Foi preparado `.cache/supabase-development/initial-setup.sql`, rascunho gerado e ignorado pelo Git, com os dois arquivos originais intactos, nesta ordem: fundação e quarto. Nenhuma credencial está incluída. O lote utiliza timeout de lock de 5 segundos e de instrução de 60 segundos e verifica estrutura/contas existentes. A execução final ocorreu pela integração, não pelo rascunho do SQL Editor. Não reaplicar o rascunho: a estrutura agora existe.

O lote foi ensaiado em PGlite descartável antes da aplicação remota. O único `DROP INDEX` da segunda migração substituiu o índice criado pela primeira; não remove registros nem tabelas. Os resultados reais da aplicação e o histórico produzido pela integração estão registrados acima.

### Inspeção preparada, somente de leitura

1. No **projeto de desenvolvimento correto**, executar [inspect-schema.sql](../supabase/diagnostics/inspect-schema.sql) no SQL Editor. A consulta única SELECT retorna presença de tabelas, colunas, constraints, índices, políticas, grants, assinaturas de funções e triggers, sem registros dos usuários.
2. Se `migration_history_present` for `true`, executar [inspect-migration-history.sql](../supabase/diagnostics/inspect-migration-history.sql). Se for `false`, não executar essa segunda consulta. SQL aplicado manualmente pode existir sem o histórico da CLI.
3. Comparar com o esperado: 13 tabelas com RLS, 7 RPCs públicas de aplicação com execução restrita a autenticados e 4 triggers do aplicativo, além das colunas, índices e assinaturas presentes nas migrações.
4. Caso já existam contas Auth anteriores ao trigger de criação de perfil, verificar se possuem `profiles` e `wallets`. A migração de fundação instala o trigger para cadastros futuros; não faz backfill de `auth.users` anteriores. Qualquer ajuste exigirá um plano separado.

### Plano para aprovação, após a inspeção

- Esquema vazio e histórico compatível: propor os dois arquivos, na ordem, em transações, antes de cadastrar contas de teste.
- Fundação presente e compatível, expansão ausente: propor somente `202610210001_playable_room.sql`.
- Esquema completo e compatível: não reaplicar migrações. Histórico divergente deve ser tratado separadamente, sem marcar versões automaticamente.
- Esquema parcial ou divergente: interromper a aplicação e preparar correção específica; não editar migrações já aplicadas ou apagar dados para resolver conflitos.
- Antes de qualquer execução: apresentar arquivos pendentes, mudanças de índices/backfills, estratégia de preservação e validações posteriores, e obter autorização explícita do usuário. Após eventual aplicação, conferir catálogo, privilégios e disponibilidade no PostgREST; se necessário, propor recarga de cache.

Esses critérios orientaram o plano posteriormente autorizado pelo usuário. Migrações adicionais continuam exigindo um plano e autorização próprios. Referência: [histórico e migrações Supabase](https://supabase.com/docs/guides/deployment/database-migrations).

## 3. Autenticação e redirecionamentos

A sondagem real `GET /auth/v1/settings` respondeu HTTP 200 e informou:

- autenticação por e-mail habilitada;
- confirmação de e-mail obrigatória;
- novos cadastros permitidos.

Após o cadastro realizado pelo usuário, uma consulta agregada remota encontrou uma conta, com e-mail confirmado, perfil e carteira associados. Isso comprova o estado confirmado e a execução do trigger de cadastro, mas não comprova login, cookies SSR ou recuperação. Nenhuma senha, endereço de e-mail ou token foi registrado na documentação.

O link fornecido pelo usuário retornou `otp_expired` (inválido/expirado ou já utilizado). Não é possível determinar por esse retorno quando ou em qual navegador ocorreu a primeira confirmação. Não reutilizar o link nem solicitar tokens pelo chat; a conta já confirmada pode entrar com sua senha.

Essa tentativa revelou um erro real: o callback usava `request.url`, que em `next start --hostname 0.0.0.0` continha o endereço de bind. O retorno tentava abrir `0.0.0.0:3000`. A correção usa `NEXT_PUBLIC_APP_URL` como origem e preserva os únicos destinos aceitos. Cinco testes com Auth simulado cobrem erro sem código, sucesso, recuperação, destino externo e falha na troca. Também foi corrigido o alias de teste com `fileURLToPath`, pois o caminho do workspace contém espaço.

Após novo build e reinicialização: `/auth/callback` sem código respondeu 307 para `http://localhost:3000/auth?error=callback`, confirmado também pelo navegador; `/` e `/play` responderam 200. Essa sondagem não efetua login e não testa troca PKCE real bem-sucedida. O formulário de login ficou aberto para a conta confirmada.

No Dashboard, **Authentication → URL Configuration** foi verificado em 21/10/2026. O usuário autorizou explicitamente os dois callbacks abaixo; foram salvos e a lista mostrou `Total URLs: 2`. O Site URL já estava correto e não foi alterado:

- Site URL: `http://localhost:3000` durante desenvolvimento nessa origem;
- callback de cadastro: `http://localhost:3000/auth/callback`;
- callback de recuperação: `http://localhost:3000/auth/callback?next=/auth?mode=update`;
- se a origem/porta mudar, autorizar deliberadamente os destinos correspondentes. Conferir também o glob de query string, pois `?` tem significado no mecanismo de padrões. Não usar curingas amplos de produção por conveniência.

O código troca `code` por sessão usando PKCE e restringe o destino seguinte a `/` ou à redefinição de senha. Os primeiros testes de e-mail devem usar o mesmo navegador/perfil que iniciou o fluxo e preserva o verificador PKCE. [Redirecionamentos](https://supabase.com/docs/guides/auth/redirect-urls), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

O envio padrão do Supabase tem restrições de destinatários da equipe e limites de envio. Conferir se os dois e-mails de teste são aceitos ou se há SMTP próprio; não presumir entrega apenas porque o cadastro foi solicitado. Nenhum SMTP foi configurado nesta tarefa. [SMTP oficial](https://supabase.com/docs/guides/auth/auth-smtp).

O painel de confirmação de cadastro mostrou templates padrão e edição condicionada à configuração de SMTP próprio. Não houve alteração de template, SMTP ou exigência de confirmação.

O processo Next antigo em `localhost:3000` ainda servia a tela com aviso de Supabase não configurado. Após identificar o processo deste workspace, ele foi encerrado e substituído por um novo build de produção e `npm run start -- --port 3000`. O build passou, incluindo TypeScript; a página `/auth` foi recarregada e mostrou o formulário habilitado sem o aviso. Nenhum código visual foi alterado. Cadastro e confirmação reais continuam pendentes de ação do usuário no formulário aberto; senhas não devem ser enviadas pelo chat.

Atualização após a ação do usuário: login concluído e observado na página inicial. A conta permaneceu autenticada após recarga completa de `/` e navegação/recarga em `/play`. Isso valida a restauração de sessão nesse navegador e as páginas SSR, sem inspecionar ou registrar cookies. Logout/novo login, renovação após expiração e recuperação de senha ainda não foram executados.

### Recuperação de senha: tentativa real com a mesma senha

O usuário recebeu o e-mail de recuperação e relatou chegar à alteração, mas tentou reutilizar a senha atual. A aba do navegador foi identificada em `/auth?mode=update`, sem ler os campos de senha. O formulário mostrava uma mensagem genérica que misturava apelido e expiração. Não foi capturado o código remoto dessa tentativa, portanto `same_password` é uma hipótese compatível com o relato e com a documentação oficial, não um código observado na resposta. O link fornecido não foi reaberto, armazenado em arquivo nem reproduzido no relatório.

O tratamento agora distingue `same_password`, `weak_password` e sessão de recuperação ausente/expirada usando `error.code`/`error.name`, sem expor mensagens brutas do servidor. Login e cadastro mantêm suas respostas anteriores; nenhuma alteração visual, de políticas de senha ou de migração. Após a mudança: **53 testes Vitest aprovados, 2 nativos ignorados**, lint e build com TypeScript aprovados. Três testes novos exercitam o mapeamento, mas não efetuam alteração real de senha. A conclusão do recovery exige que o usuário escolha uma senha diferente e depois valide login com ela. [Códigos oficiais](https://supabase.com/docs/guides/auth/debugging/error-codes).

Atualização após a nova tentativa: o usuário informou sucesso ao salvar outra senha. O navegador retornou de `/auth?mode=update` à página inicial autenticada, comportamento executado pelo formulário quando `updateUser` não retorna erro. A navegação para `/play` restaurou Aurora, conhecimento 2, autonomia 1, histórico de 4 minutos, 1 distribuído e 3 disponíveis. A nova senha não foi lida ou registrada. E-mail de recuperação, chegada à redefinição e retorno autenticado foram observados/relatados no fluxo real. **Novo login usando a senha alterada ainda precisa de confirmação**; a sessão autenticada após `updateUser` não prova esse login por si só. Uma consulta agregada ao audit log não retornou os nomes de eventos pesquisados e não foi usada como evidência de alteração.

Confirmação posterior: o usuário testou a senha antiga (recusada) e a nova (login bem-sucedido). O navegador foi encontrado na página inicial autenticada. O resultado negativo/positivo das duas senhas é relatado pelo usuário; não foram coletadas senhas ou corpos de requisição. Com essa participação, recuperação e uso da nova senha estão validados no fluxo real.

## 3.1. Primeira sessão real e correção do agendamento

Foi criado pelo aplicativo o adulto de teste Aurora, com cabelo Chanel (`bob`) e roupa azul (`#769cb4`). Consulta remota confirmou associação ao usuário/casa, aparência e atividade `study`. A recarga de `/play` restaurou personagem e estudo. O banco foi consultado apenas para conferir o resultado; as gravações ocorreram pelas APIs autenticadas normais.

A primeira confirmação de foco falhou com `Heartbeat too frequent`: o intervalo começava na montagem do componente e podia disparar menos de 3 segundos após iniciar. A dependência de estado do efeito agora reinicia o intervalo ao receber início/retomada, preservando os 5 segundos de envio e limites SQL existentes. O teste E2E passou a esperar 4,5 segundos antes de iniciar e exigir 5 segundos confirmados no primeiro intervalo. Passou em Chromium desktop e viewport/toque de iPhone, com relógio local simulado.

A sessão remota de 120 segundos foi recuperada pela interface. Pausa manual foi observada no banco com `status=paused` e 19.328 ms preservados. A retomada fez o tempo avançar. Houve uma requisição que excedeu o timeout de 12 segundos e intervalos de confirmação superiores a 7,5 segundos (máximo observado de 11,809 segundos entre eventos heartbeat). Essas interrupções foram preservadas conforme as regras; não foi atribuído tempo à ausência. Não foi determinada a origem exata dessas demoras de rede/serviço.

Estado ao encerrar a rodada anterior: uma sessão `interrupted`, **72.910 ms validados de 120.000 ms**, zero créditos, zero recompensas e zero distribuições. A sessão foi deixada disponível para retomada. Não houve alteração de timestamps, tolerâncias SQL ou migrações.

### Conclusão e distribuição reais após retomada pelo usuário

O usuário informou que concluiu o foco. A consulta remota seguinte confirmou **duas sessões distintas concluídas**, ambas com `validated_ms=120000` e `planned_seconds=120`, dois créditos e duas recompensas, totalizando **4 minutos elegíveis**. Não foi acelerado o relógio remoto.

Na interface autenticada, a tentativa de distribuir 3 minutos de uma sessão com apenas 2 livres foi rejeitada pela validação do cliente. Isso não equivale a testar rejeição transacional remota. Em seguida, 1 minuto foi distribuído para estudar. O banco confirmou um pedido, uma distribuição de 1 minuto, `progress_minutes=1`, conhecimento 2, autonomia 1, 4 minutos elegíveis, 1 alocado e nenhum crédito acima do saldo. A recarga de `/play` restaurou aparência, atividade, atributos, histórico e **3 minutos disponíveis**.

A correspondência de um crédito/recompensa por sessão foi conferida nos dados atuais. Reenvio deliberado do mesmo pedido, concorrência, rollback e isolamento entre duas contas continuam comprovados apenas pelos testes locais anteriores; não foram apresentados como testes remotos aprovados.

Logout executado pela interface: a página inicial passou a oferecer login e a nova navegação para `/play` mostrou **Exploração local**, com o personagem local preexistente Ana, atributos zerados e saldo local próprio. Aurora e seu progresso remoto não apareceram nesse modo. O progresso local foi preservado.

O usuário entrou novamente com sua senha. A página inicial reconheceu a conta; ao abrir `/play`, Aurora retornou estudando, com conhecimento 2, autonomia 1, energia 75, histórico confirmado de 4 minutos, 1 minuto distribuído e **3 minutos disponíveis**. O registro de estudo também foi restaurado. **A jornada principal do critério de conclusão foi validada contra o projeto real**, incluindo restauração após sair e entrar. Isso não encerra os cenários complementares listados abaixo.

## 4. Persistência, segurança e distribuição

As verificações locais executaram as migrações reais em PostgreSQL/PGlite, com um esquema Auth mínimo e identidade configurada pela fixture. Isso testa SQL, RLS, grants e transações, **sem validar GoTrue, assinatura de JWT, PostgREST ou cookies reais**.

Foram aprovados localmente: vínculo do personagem ao usuário, aparência, atividades e restauração; bloqueio de leitura/escrita entre usuários; impedimento de escrita direta em XP, saldo e sessões; crédito único por conclusão; ausência de crédito em sessões interrompidas; rejeição de excesso de saldo; rollback de todas as linhas em caso de erro; repetição de UUID/payload; disputa concorrente pelo último minuto; e divisão de minutos entre dois moradores na estrutura existente.

Os dois testes nativos usaram conexões independentes e um PostgreSQL descartável em cache, encerrado ao terminar. A rejeição SQL `Insufficient minutes` foi o resultado esperado para o pedido perdedor da disputa.

As rotas `/` e `/play` continuam públicas para exploração local. As operações oficiais exigem identidade verificada nas APIs e no banco. O proxy contém proteção para `/account`, mas não existe página `/account` implementada; isso não deve ser apresentado como uma área privada já validada. O fluxo autenticado deve ser conferido nas páginas atuais, sem criar uma nova área de produto.

## 5. Resultados desta execução

| Camada | Resultado atual |
| --- | --- |
| Vitest local, após correção de mensagens Auth | 53 aprovados; 2 nativos ignorados sem URL |
| PostgreSQL nativo local | 2 aprovados separadamente; banco descartável encerrado |
| Lint / TypeScript | Aprovados |
| Build com configuração pública real | Aprovado |
| E2E em produção, contextos anônimos | 22 aprovados em 33,3s: Chromium desktop e viewport/toque de iPhone |
| HTTP real: Auth settings | 200; e-mail/confirmacão/cadastro habilitados conforme descrito acima |
| Dashboard: redirecionamentos | Site URL correto; dois callbacks autorizados salvos e listados |
| Novo build e servidor em localhost:3000 | Aprovado; formulário de cadastro habilitado após reinicialização |
| Regressão do intervalo após início tardio | 2 E2E aprovados no build de produção; desktop e viewport iPhone, relógio simulado |
| Pomodoro remoto | Duas sessões concluídas com 120.000 ms cada; um crédito/recompensa por sessão; pausa e recuperação observadas anteriormente |
| Distribuição remota normal e disputa | 2 minutos distribuídos em A, 2 disponíveis; conhecimento 4 e autonomia 2; sem excesso ou duplicação |
| Inspeção remota após migração | 13 tabelas com RLS, 7 RPCs, 4 triggers, 14 políticas e histórico registrado |
| HTTP anônimo após migração | 6 tabelas verificadas com 401/42501; nenhum registro lido |
| Cadastro remoto, confirmação e trigger | Duas contas confirmadas; criação por Auth normal; perfil/carteira disponíveis |
| Login e recarga autenticada | Usuário entrou; `/` e `/play` mantiveram a conta após recarga |
| Personagem remoto | Adulto Aurora criado, vinculado ao usuário/casa; cabelo Chanel e roupa azul confirmados no banco; atividade estudar restaurada após recarga |
| Logout | Interface saiu da conta; nova navegação para `/play` restaurou exploração local separada |
| Novo login e restauração da jornada principal | Aprovados no projeto real: Aurora, atributos, atividade, histórico e saldo restaurados após sair e entrar |
| Recuperação de senha | E-mail recebido; nova senha salva e progresso preservado; usuário confirmou senha antiga recusada e login com a nova; navegador autenticado observado |
| RLS cruzada | Aprovada nas APIs reais: 8 tabelas e RPC de atividade, em ambos os sentidos; crédito alheio recusado |
| Repetição, concorrência e rollback remotos | Aprovados; 8 grupos no script principal; nenhum crédito negativo ou divergência entre saldo e alocações |
| Controle de posse e lacuna de foco remotos | 3 grupos adicionais aprovados com conexões independentes e espera real; sessão de teste encerrada com zero crédito |

Os seis testes novos cobrem a inspeção em esquema vazio/fundação/completo e a proteção de configuração para modo local, formato publishable, anon, secret e service_role. As credenciais usadas nesses testes de formato são fixtures deliberadamente inválidas, isoladas em subprocessos, sem requisições de rede e sem gravação em `.env.local`.

Os E2E usam relógio controlado para cenários locais de foco. As fixtures SQL podem ajustar timestamps em bancos descartáveis. **Não existe aprovação de uma sessão Pomodoro remota acelerada**, nem mecanismo de aceleração adicionado ao aplicativo.

## 6. Roteiro executado e critério de conclusão

1. Migrações autorizadas, aplicadas e verificadas. Registrar/reconciliar o mapeamento do lote remoto antes de usar a CLI em migrações futuras; não reaplicar os arquivos existentes.
2. Após esquema confirmado, conferir URLs, templates e entrega de e-mail. Usar duas contas de teste e caixas de e-mail controladas pelo usuário, sem registrar senhas, códigos, cookies ou tokens em relatórios/traces públicos.
3. Cadastrar A, confirmar e-mail, entrar e recarregar `/` e `/play`; conferir que os cookies sustentam o estado autenticado SSR. Sair, entrar novamente e verificar a restauração. Repetir recuperação de senha, com participação do usuário na nova senha.
4. Criar um adulto, alterar aparência, executar atividades e conferir restauração após logout/login. Manter nascimento e personagem legado disponíveis.
5. Concluir uma sessão real de pelo menos dois minutos mantendo foco; testar pausa/retomada, interrupção, duas abas, perda de rede e reconexão. O tempo elegível deve vir do banco, sem ajustar timestamps remotos.
6. Distribuir minutos, repetir exatamente um pedido, disputar saldo com conexões concorrentes e provocar uma distribuição inválida. Conferir ausência de crédito duplicado, excesso ou perda por rollback. Usar apenas contas/dados de teste e manter a estrutura de múltiplos moradores.
7. Com B, tentar ler/alterar IDs de A pela API e por PostgREST com JWT comum. Não usar service_role ou SQL Editor como prova de RLS.

**Jornada principal, recovery e testes adversariais remotos aprovados no ambiente de desenvolvimento.** Permanecem os limites de hardware/produção e de observação descritos na seção 8. A lista acima foi o roteiro usado, não uma lista de verificações ainda pendentes.

## 7. Teste remoto com duas identidades — executado e aprovado

Foi executado `scripts/validate-supabase-development.mjs`, usando somente `supabase-js` já instalado e login normal com JWT de cada conta. Não usa SQL Editor, impersonação de `auth.uid()`, secret key ou `service_role` como evidência de RLS. Sintaxe Node e lint aprovados; as duas execuções remotas terminaram com código 0.

Configuração local em `.env.supabase-test.local`, criado vazio e ignorado pelo Git:

- `POMINS_REMOTE_TESTS=development-only` habilita deliberadamente a execução;
- `POMINS_TEST_PROJECT_URL` deve ser idêntica à URL de desenvolvimento de `.env.local`;
- `POMINS_TEST_A_EMAIL`/`POMINS_TEST_A_PASSWORD`: primeira conta de teste, senha atualizada;
- `POMINS_TEST_B_EMAIL`/`POMINS_TEST_B_PASSWORD`: segunda conta confirmada, controlada pelo usuário.

Senhas devem ser preenchidas apenas nesse arquivo local, nunca no chat ou documentação. Valores com `#` ou espaços devem ficar entre aspas. Não se devem usar contas de produção. Depois da execução, o usuário pode remover as senhas do arquivo local.

Execução: `node scripts/validate-supabase-development.mjs`. O script exige contas distintas, adulto e distribuição anterior em A, nenhuma sessão aberta em A e um crédito com exatamente 1 minuto disponível. Ele testa leituras/RPCs cruzadas em ambos os sentidos, tentativa de gastar crédito alheio, repetição de pedido e conclusão, bloqueio de escrita direta, rollback de uma distribuição cuja segunda linha excede saldo e disputa por esse último minuto em duas conexões Auth independentes. Não cria nem confirma contas; se B não tiver adulto, cria `Bento Teste` pelas mesmas RPCs do aplicativo.

**Efeito esperado autorizado dos testes:** a disputa aplica exatamente 1 minuto de estudo em A e o conserva como progresso normal. Não há exclusão/limpeza de registros, alteração de timestamps ou migração. As tentativas inválidas devem desfazer seus efeitos. O script encerra apenas as sessões Auth criadas por ele (`scope: local`); não encerra deliberadamente a sessão do usuário no navegador. Saída contém rótulos de verificação e totais, sem credenciais, IDs de usuários ou tokens. Em erro de rede, conferir o estado antes de repetir, pois a disputa pode ter sido aplicada.

Resultado real: **8 grupos aprovados**, incluindo login de duas contas, leitura de personagens/perfis/carteiras/sessões/créditos/alocações/pedidos/casas cruzados sem linhas em ambos os sentidos; RPC de atividade cruzada recusada; crédito alheio recusado; repetição exata de alocação sem mudança de estado; bloqueio de escrita direta de XP/carteira/atributos; conclusão repetida sem novo crédito/recompensa/XP/moedas; rollback integral quando a segunda linha falha; e corrida por um minuto com exatamente um vencedor. O rollback foi conferido também pela ausência do pedido rejeitado. As tentativas diretas de escrita enviaram valores já existentes, evitando alterar XP/saldo caso uma permissão inesperada fosse detectada.

Execução adicional `node scripts/validate-supabase-development.mjs --focus-only`: **3 grupos adicionais aprovados**, além de autenticar as duas contas novamente. B iniciou uma sessão de 120 segundos, repetiu o início sem duplicação e pausou/retomou. A não conseguiu recuperar essa sessão. Uma segunda conexão de B recuperou sua posse; a conexão anterior foi rejeitada. Após espera real de 8,5 segundos sem heartbeat, o banco retornou `interrupted` com zero tempo; conclusão prematura foi rejeitada e a sessão foi encerrada normalmente. Nenhum crédito/recompensa foi criado. Isso verifica o protocolo entre conexões, sem alegar que houve troca simultânea de duas abas físicas ou desligamento de rede do sistema operacional.

Conferência final: **2 contas confirmadas, 2 sessões concluídas, 1 cancelada, nenhuma aberta, 2 créditos, 2 recompensas, 4 minutos elegíveis, 2 distribuídos e 2 disponíveis**. Soma de alocações e saldo consumido coincidem; nenhum crédito negativo ou acima do elegível. Aurora ficou com progresso 2, conhecimento 4 e autonomia 2. B mantém Bento Teste, progresso/atributos zerados, energia 75 e saldo zero. O quarto de B foi conferido e recarregado no navegador, sem Aurora; a sessão do usuário permaneceu ativa após o encerramento local das conexões de teste.

O script principal não deve ser repetido cegamente: a disputa já consumiu o último minuto da sessão escolhida e o pré-requisito de um crédito com exatamente um minuto livre pode deixar de existir. Não acelerar timestamps nem criar saldo artificial para satisfazê-lo.

## 8. Limites e próximas ações

- A latência causou pausas/timeout durante o foco real inicial; a recuperação preservou o tempo e permitiu concluir. Não foram relaxados os limites existentes. A lacuna controlada testa ausência de confirmações, não reconexão física após desligar Wi-Fi.
- Controle de posse foi testado nas RPCs com conexões independentes; interação simultânea de abas e eventos de visibilidade têm cobertura local anterior, sem alegar duas abas físicas remotas nesta rodada.
- Login/recarga/SSR e recovery funcionaram no navegador integrado; expiração prolongada de tokens, Safari/iPhone físico, instalação PWA/HTTPS e SMTP próprio continuam fora deste ensaio. O envio padrão Supabase tem restrições de destinatários e limites.
- Os avisos de Advisor e o mapeamento de uma migração remota para dois arquivos locais permanecem documentados. Antes de nova migração via CLI, reconciliar deliberadamente o histórico e obter autorização para qualquer mudança remota adicional.
- A validação remota partiu de `82e35eb` em `codex/consolidacao-base`; a consolidação posterior em commit local tem suas novas verificações registradas em `TEST_RESULTS.md`. Sem push ou reescrita da base. `.env.local` e `.env.supabase-test.local` ignorados; nenhum segredo incluído no recibo. Nenhuma dependência instalada nesta entrega.
