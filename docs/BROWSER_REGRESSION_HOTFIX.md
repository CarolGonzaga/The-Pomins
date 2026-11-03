# Hotfix de regressão do navegador 6F/6G

## Escopo e preservação

Trabalho local na main, sobre 29d59e323e195e3facae01b53fe70211e177f008. Os quatro commits anteriores são preservados. Nenhuma migração, consulta, compra ou comando de foco foi executado contra o Supabase nesta tarefa. As taxas e demais mecanismos remotos não foram ativados. Os cinco arquivos pendentes anteriores são preservados e ficam fora do commit deste hotfix.

## Diagnóstico das falhas originais

### A — Prévia LPC, perfil iPhone

O trace começa em 2026-11-01T10:18:20.911Z. A tentativa de clicar em Ondulado passa aproximadamente 10.800 segundos aguardando estabilidade do elemento; o teardown por timeout começa antes do encerramento da ação. A etapa de conferir hair=wavy só acontece durante o teardown. Portanto, o valor plain observado não demonstra que React recebeu e recusou uma seleção válida.

O evento Kernel-Power 42 registra suspensão por botão/tampa em 2026-11-01 às 07:18:20 no fuso America/Sao_Paulo. Na retomada, o Kernel-General registra correção de relógio de aproximadamente 10.798.858 ms. Isso coincide com o intervalo do trace. A duração total do cenário foi 10.800,57 segundos, embora o limite configurado fosse 40 segundos.

As 29 respostas de assets LPC presentes no trace tiveram HTTP 200, sem falhas de carregamento registradas. Editor, SpritePreview e compositor LPC não mudaram entre 397eae2 e 29d59e3. O carregamento usa promises de imagens e composição assíncrona; o efeito ignora resultados após cleanup e cancela requestAnimationFrame. O cenário original passou sem alteração no aplicativo na reprodução inicial. As verificações completas de pixels, poses, persistência e caminhada continuam presentes.

Conclusão: a falha registrada foi causada pela interrupção da execução e do relógio do host; não foi reproduzida falha funcional de seleção, composição ou persistência. Há uma fragilidade adicional de sincronização no teste: ele navegava, clicava e mudava de pose sem confirmar hidratação/composição inicial nem o estado selecionado intermediário. Essa fragilidade foi removida sem atribuí-la como causa comprovada do incidente original.

### B — Inicialização do navegador para constância

O trace começa em 2026-11-01T13:18:23.269Z e a fixture browser leva aproximadamente 130.814 segundos até o timeout de launch. Nenhuma página ou etapa funcional do teste de constância é iniciada.

Kernel-Power 42 registra hibernação em 2026-11-01 às 10:18:21 (America/Sao_Paulo). Power-Troubleshooter registra suspensão até a retomada em 2026-11-02 às 22:38:33 nesse fuso. Kernel-General registra ajuste de 130.808.735 ms. Os eventos coincidem com a lacuna de mais de 36 horas na inicialização do browser.

Conclusão: timeout durante suspensão/hibernação do host, com evidência independente do Windows e do trace; não uma falha funcional da constância. Não foram alterados o teste de constância nem os limites de 40 s e 180 s. A instalação atual do Chromium foi confirmada, com Playwright 1.64.1. A execução anterior já usava um worker; não há evidência de que paralelismo, falta de instalação ou vazamento de processos tenha causado aquele incidente. A observação atual de memória/processos não permite inferir consumo histórico de CPU/RAM.

As evidências originais e logs do Windows estão preservados apenas em .cache/regression-hotfix, fora do Git. A suíte anterior reportou 1,6 dia, contaminado pelas interrupções; essa duração não representa tempo de processamento do aplicativo.

## Correções específicas

- tests/e2e/character-visuals.spec.ts: aguardar o primeiro data-ready-key, usar tap no perfil com toque e click no desktop, conferir aria-pressed e a composição wavy antes de trocar a pose, conferir data-clip e manter a verificação de frames e identidade da composição.
- playwright.config.ts: workers=1 explícito. fullyParallel=false sozinho não impede paralelismo entre arquivos. O limite torna CI e execução local previsíveis para o gateway compartilhado; é prevenção de concorrência no ambiente de testes, não uma explicação alternativa para o timeout original, que já ocorreu com um worker.
- .github/workflows/ci.yml: build com variáveis de fixture e inicialização/limpeza do gateway SQL local. A suíte completa usa taxas inativas; os quatro casos decimais usam outra instância com taxas ativas. O workflow anterior não fornecia POMINS_SAVE_FIXTURE_ORIGIN e ignorava os testes autenticados, inclusive constância. Essa lacuna de cobertura foi corrigida; não foi a causa do incidente original.
- Nenhuma alteração no aplicativo, nos assets, no timer, nos contratos ou no SQL.
- Sem aumento de timeout, sleeps artificiais, force click, retry automático ou exclusão dos cenários problemáticos.

A escolha de sincronização usa estados observáveis, de acordo com a documentação de hidratação e actionability do Playwright: https://playwright.dev/docs/navigations#hydration. A configuração de workers segue https://playwright.dev/docs/test-parallel. Os guias Playwright e use-client incluídos no Next instalado também foram consultados.

## Estratégia de validação

Execuções sobre build Production local, Chromium desktop e perfil iPhone 13 de 390 px com touch, CI=1, um worker e zero retries. Autenticação/RPC de navegador usam apenas o gateway SQL descartável em loopback 3181; Next usa 3192. Não é Safari/WebKit físico, nem execução de um job no GitHub Actions remoto.

Cada suíte completa deve usar uma instância nova do gateway, pois alguns testes consomem os créditos da fixture por projeto. Os testes decimais usam uma instância separada com POMINS_TEST_ELAPSED_NEEDS=1 e POMINS_TEST_DECIMAL_NEEDS=1. A ativação é exclusivamente nessa fixture descartável, nunca no projeto Supabase.

Para repetir localmente, manter o computador acordado e a tampa aberta durante o comando; não alterar políticas permanentes de energia para mascarar falhas. Se ocorrer suspensão/hibernação, preservar o trace e considerar a execução inválida como evidência de estabilidade. Nenhuma política de energia foi alterada nesta tarefa.

## Resultados

Lint e TypeScript aprovados. Build Next.js Production com webpack aprovado em diretório isolado, com variáveis públicas de fixture. YAML do workflow e sintaxe Bash validados. O GitHub Actions remoto ainda não foi executado, pois não houve push.

Testes locais: **298 aprovados**; os 90 testes opcionais PostgreSQL foram executados separadamente em clusters descartáveis. PostgreSQL nativo: **90 aprovados** (30 necessidades, 24 fundação, 25 cuidados, 11 concorrência), com restauração conferida e clusters encerrados.

| Execução de navegador | Aprovados | Ignorados | Duração do runner |
| --- | ---: | ---: | ---: |
| lpc-isolated | 1 | 0 | 7.51 s |
| continuity-isolated | 1 | 0 | 8.59 s |
| repeated-pair | 20 | 0 | 93.22 s |
| iphone-full | 73 | 2 | 330.21 s |
| browser-full | 145 | 5 | 575.02 s |
| decimal | 4 | 0 | 16.08 s |

Todas as execuções usaram um worker, zero retries, zero falhas e zero resultados flaky. A reprodução inicial dos dois cenários originais, antes dos ajustes, também passou: 2 testes em 14,9 s. As 20 repetições combinadas são cinco execuções de cada cenário em cada perfil. As durações dos corpos de teste no iPhone variaram entre 1,54–1,70 s (LPC) e 1,62–1,91 s (constância).

A suíte iPhone inteira foi repetida e depois incluída novamente na suíte completa. Os quatro casos decimais passaram em desktop e iPhone com leitura fracionária, cores, humor, débito de 2 min, retry sem duplicação, restauração e rejeição de versões incompatíveis antes do débito. Os quatro skips decimais da suíte normal foram cobertos nessa execução separada; o outro skip é um cenário de toque exclusivo do perfil mobile, executado no iPhone. Nenhum dos dois cenários problemáticos foi ignorado.

Total de cenários únicos aprovados: **537 = 298 locais + 90 PostgreSQL + 145 navegador normal + 4 decimais**. As repetições e a suíte adicional iPhone não são somadas novamente a esse total. Antes: suíte contaminada por suspensão reportou 1,6 dia; depois: regressão completa de navegador em aproximadamente 9 min 37 s, e iPhone em 5 min 30 s.

O bloqueio técnico de regressão está resolvido pelos testes disponíveis. A publicação permanece pendente de autorização específica para o novo conjunto de cinco commits. Logs, JSON, traces originais e screenshots ficam apenas em .cache/regression-hotfix e nos diretórios ignorados de testes.

## Publicação

Nenhum push ou deploy é autorizado nesta tarefa. Mesmo após a regressão aprovada, o novo commit corretivo deve ser incluído explicitamente na autorização de publicação; a autorização anterior mencionava quatro commits específicos. Não reaplicar a migração 20261029195215. As taxas continuam dependendo de uma autorização separada, posterior à validação do frontend publicado.

Safari físico/PWA no iPhone continua como validação humana após publicação autorizada. A investigação local não valida hardware real nem garante que abas/PWA antigas já receberam o novo bundle.
