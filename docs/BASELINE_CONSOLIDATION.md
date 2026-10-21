# Entrega 1 — Consolidação da base existente

Data: 21/10/2026. Ambiente: Windows, Node.js 24.14.0 e npm 11.9.0.

Esta entrega mantém o Next.js, a experiência de nascimento em `/`, o quarto LPC em `/play`, o Pomodoro e todas as migrações existentes. Não adiciona mecânicas, redesenha páginas ou publica alterações no remoto.

## Estado inicial e proteção do trabalho

O checkout estava na branch `main`, sem commits, sem arquivos rastreados e com 120 arquivos candidatos ao versionamento. O upstream local `origin/main` não estava disponível nas referências locais. O remoto configurado era `https://github.com/CarolGonzaga/The-Pomins.git`; não houve fetch, push, reset, clean ou sobrescrita de commits.

Antes das alterações, foi salvo um inventário com hashes em `.cache/consolidation/baseline.json`, ignorado pelo Git. A comparação confirmou que nenhum arquivo original foi removido; migrações, estilos, mapas, PNGs e créditos LPC permaneceram intactos. O inventário é evidência local da tarefa, não uma dependência do projeto.

O `.gitignore` cobre `.env*` (exceto o modelo vazio `.env.example`), dependências, builds, relatórios, caches, arquivos temporários, chaves privadas, credenciais locais e bancos locais. `next-env.d.ts` é gerado pelo Next.js e fica fora do versionamento. `git check-ignore` foi usado para conferir exemplos representativos. Uma busca por assinaturas de chaves privadas e tokens conhecidos não encontrou ocorrências nos arquivos candidatos; isso não equivale a uma auditoria exaustiva de segredos.

A base é registrada na branch local `codex/consolidacao-base`, sem publicar ou configurar um novo upstream. Consulte `git log -1` e `git status --short --branch` para o identificador e o estado local após o registro.

## Correções e configuração

- Adicionado `npm run lint` com ESLint 10.13.0 e configuração oficial Next.js 16.4.2, conforme o guia instalado em `node_modules/next/dist/docs/`. O comando rejeita warnings.
- Declarado `sharp` 0.35.5 como dependência de desenvolvimento: já era importado pelos testes, mas dependia de uma instalação transitiva.
- Mantidos npm e `package-lock.json`; adicionadas referências de Node/npm em `.nvmrc` e `package.json`.
- Atualizações de referências usadas por Phaser e pelo callback de pausa passaram do render para `useLayoutEffect`. Regras, intervalos e recompensas do Pomodoro foram preservados.
- Removido um import sem uso, corrigido `let` para `const` e nomeada a configuração PostCSS.
- Exceções pontuais de lint documentam a hidratação de armazenamento/conectividade após SSR, a leitura existente do bloqueio imperativo do botão de cancelamento e a navegação completa nas fronteiras de autenticação/experiência. Não há desativação geral das regras de Hooks.
- Playwright aceita `POMINS_TEST_SERVER_MODE=production`; o CI executa lint e E2E contra o build de produção.
- O teste de quarto verifica por HTTP todos os 24 PNGs do manifesto, incluindo camadas não selecionadas no percurso, e detecta falhas HTTP/rede de sprites durante a renderização.
- README atualizado para informar as duas migrações, sem recomendar reaplicação cega de SQL.

## Instalação e reprodução

Foi executada instalação apenas para suprir o lint ausente e tornar `sharp` explícito. Depois, `npm ci --prefer-offline --no-audit --no-fund` reinstalou com sucesso as dependências pelo lockfile. Uma tentativa anterior de atualizar o lockfile estritamente offline encontrou pacote opcional ausente no cache; a instalação com acesso ao registro foi concluída. Não foi necessário recriar o projeto.

O npm emite avisos de peer dependency de plugins transitivos que ainda declaram ESLint até a versão 9. O guia da versão instalada do Next.js declara suporte a ESLint 10 e prevê esses avisos; instalação e lint foram aprovados sem `--force` ou `--legacy-peer-deps`. `npm ls --depth=0` não indicou dependências diretas ausentes; listou alguns pacotes WASM opcionais como `extraneous` dentro de `node_modules`, que é ignorado.

Em um checkout novo:

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
```

No PowerShell, para testar o build de produção em uma porta livre:

```powershell
$env:POMINS_TEST_PORT = '3100'
$env:POMINS_TEST_SERVER_MODE = 'production'
npm run test:e2e
```

Não execute `next dev` e `next build` simultaneamente no mesmo checkout. Para validar um servidor criado pelos próprios testes, use uma porta livre: fora do CI, Playwright pode reutilizar um servidor existente.

## Resultados desta execução

Os resultados abaixo foram obtidos nesta tarefa, sem usar aprovações históricas como evidência atual.

| Verificação | Resultado |
| --- | --- |
| Instalação pelo lockfile | Aprovada com `npm ci` |
| Lint | Aprovado, zero erros e zero warnings |
| TypeScript | Aprovado: `next typegen && tsc --noEmit` |
| Vitest padrão | 39 aprovados; 2 de PostgreSQL nativo ignorados por ausência de URL |
| PostgreSQL nativo descartável | Os 2 testes de concorrência executados separadamente e aprovados |
| Build de produção | Aprovado, incluindo `/`, `/play`, `/api/game`, `/api/room`, Auth e créditos |
| Playwright em produção | 22 aprovados em 35,2s: 11 desktop Chromium e 11 viewport/toque de iPhone em Chromium |

Total: **63 testes distintos aprovados nesta tarefa**, além de lint, TypeScript e build. A rodada final de E2E ocorreu após os ajustes de ciclo de vida e a instalação pelo lockfile. Os 24 PNGs responderam com sucesso e `Content-Type: image/png` nos dois projetos de navegador; o percurso do quarto terminou sem erros JavaScript nem falhas de carregamento LPC.

O PostgreSQL descartável foi iniciado com credenciais aleatórias, em diretório de cache exclusivo, e encerrado ao terminar. Os testes verificaram repetição concorrente do mesmo pedido e disputa pelo último minuto. O erro SQL `Insufficient minutes` durante essa disputa é a rejeição esperada de um dos pedidos, não uma falha do teste. O runner local já existente é `.cache/run-pg-race.mjs`; em um checkout novo, o CI fornece PostgreSQL 17 e `POMINS_TEST_DATABASE_URL` para executar a mesma suíte versionada. Nunca aponte essa fixture para Supabase ou banco de produção: ela cria seu próprio esquema de teste.

Os E2E cobrem nascimento, persistência, foco local, interrupção por perda de foco/conexão, PWA, acessibilidade automatizada, adulto LPC, recoloração real, atividades, caminho por obstáculos, distribuição e restauração. As capturas do quarto desktop e viewport iPhone foram inspecionadas nesta tarefa. Os testes de assets verificam hashes, dimensões e recoloração das camadas.

## Limites e próxima entrega

- Apenas `.env.example` está presente; nenhum Supabase real foi configurado ou alterado.
- Conferir o histórico remoto de migrações e aplicar somente as duas migrações pendentes, na ordem, após escolher o projeto.
- Configurar URL e publishable key públicas, Site URL, callbacks e e-mail de autenticação. Nenhuma service role deve ir para o navegador.
- Validar cadastro, confirmação, login/logout, recuperação, cookies SSR, PostgREST, RLS entre contas e retomada de foco contra o backend real.
- Chromium com viewport/toque de iPhone não valida Safari/WebKit, instalação iOS, suspensão física, Wake Lock ou VoiceOver. Esses testes permanecem pendentes, assim como deploy HTTPS.
- Não há importação automática do progresso local para a conta. O repouso atual continua sentado; esta entrega não altera sua arte.

Próximo passo recomendado: configurar um ambiente Supabase de desenvolvimento e validar o fluxo autenticado de ponta a ponta antes de expandir as mecânicas.
