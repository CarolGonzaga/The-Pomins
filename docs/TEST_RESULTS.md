# Resultados de validação · Entrega 1

## Consolidação da base — execução atual de 21/10/2026

Esta seção registra execuções realizadas na tarefa de consolidação, independentemente dos resultados históricos abaixo. Relatório e reprodução: [BASELINE_CONSOLIDATION.md](BASELINE_CONSOLIDATION.md).

- `npm ci --prefer-offline --no-audit --no-fund`: aprovado; instalação pelo lockfile.
- `npm run lint`: aprovado, zero erros/warnings, com exceções pontuais documentadas para os comportamentos existentes de hidratação/imperatividade e navegação completa.
- `npm run typecheck`: aprovado após instalação e correções.
- `npm test`: 39 aprovados, 2 de concorrência nativa ignorados sem URL.
- `node .cache/run-pg-race.mjs`: os 2 testes nativos executados separadamente e aprovados em PostgreSQL descartável; banco encerrado ao final.
- `npm run build`: aprovado após os ajustes finais de código, sem trocar Next.js/Turbopack.
- `POMINS_TEST_PORT=3100 POMINS_TEST_SERVER_MODE=production npm run test:e2e`: 22 aprovados em 35,2s contra o build atualizado. A sintaxe de variáveis no PowerShell está no relatório.

**63 testes distintos aprovados nesta tarefa.** E2E: 11 desktop Chromium + 11 viewport/toque de iPhone em Chromium. Rotas `/` e `/play`, nascimento, Pomodoro, PWA, recoloração LPC, renderização Phaser, caminhada, atividades e restauração foram exercitados. Os 24 PNGs do manifesto foram conferidos por HTTP nos dois projetos; sem falhas de carregamento LPC ou erros JavaScript no percurso completo do quarto. Capturas foram inspecionadas nesta tarefa.

Nenhum Supabase real foi conectado ou modificado. Cadastro/e-mail, cookies SSR/PostgREST reais, publicação HTTPS e Safari/iPhone físico permanecem **não executados**. Nenhuma execução remota de CI foi presumida. As migrações existentes foram preservadas.

## Atualização de 21/10/2026 — quarto LPC

**63 testes distintos aprovados:** 39 de regras/contratos/PNG/migrações/RLS/RPC em Vitest + 2 de concorrência em PostgreSQL nativo + 22 E2E (11 desktop Chromium, 11 viewport/toque de iPhone em Chromium). Typecheck e build Next.js aprovados, com `/play`, `/api/room` e `/credits` adicionados.

O `npm test` comum retorna 39 aprovados e 2 ignorados se `POMINS_TEST_DATABASE_URL` não estiver definido. Os mesmos 2 testes ignorados foram executados separadamente e **aprovados** em um PostgreSQL nativo 18.4 descartável, instalado apenas no cache da tarefa e encerrado após a execução. O CI está preparado para executá-los com serviço PostgreSQL 17; não foi afirmado que um run remoto do GitHub Actions já aconteceu.

Cobertura adicional: corpo/camadas LPC com hashes e créditos; alteração real dos pixels de pele/olhos/cabelo/roupa; aparência persistida; caminhos cardinais por objetos Tiled; mudanças de destino sem salto; estudo/leitura/repouso e restauração; migração preservando bebê/XP/sessão concluída anterior; crédito único de conclusão; ausência de crédito de sessão interrompida; saldo separado; divisão entre dois moradores; rollback de todas as linhas; repetição de UUID; disputa pelo último minuto; recuperação de pedido já aplicado; rejeição de excesso sem bloquear o formulário; necessidades sem deterioração por ausência.

Os cenários E2E completos validaram o fluxo anterior de nascimento, PWA, Auth sem backend, temporizador estrito e o quarto novo. As capturas `room-chromium.png` e `room-iphone.png` foram conferidas; testes automatizados em 320px não encontraram transbordamento nem violações WCAG A/AA no quarto.

Os 6 cenários do quarto também foram repetidos e aprovados no servidor de **produção** (`npm run start`). Uma falha interna do cache do Turbopack no ambiente Windows foi resolvida isolando somente o cache gerado dentro de `.cache/` e reconstruindo; não houve troca de framework ou de bundler. O build final de produção foi aprovado.

Ainda não executado: Supabase Auth/GoTrue/PostgREST reais, aplicação da migração em projeto externo, deploy HTTPS, Safari/WebKit físico, instalação iOS, Wake Lock físico e VoiceOver. Só `.env.example` está presente; não há credenciais conectadas. Consulte `PLAYABLE_ROOM.md` e `IOS_TEST_CHECKLIST.md`.

## Histórico de 16/10/2026

Ambiente: Windows, Node.js 24.14.0, npm 11.9.0. Referência do projeto: 16/10/2026. Nenhuma credencial Supabase foi utilizada ou inventada.

| Verificação                                          | Resultado                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------ |
| TypeScript strict                                    | Aprovado                                                                 |
| Build de produção Next.js 16.4.2                     | Aprovado                                                                 |
| Vitest: regras e contratos                           | 7 testes aprovados                                                       |
| Vitest: migração, RLS e RPCs PostgreSQL/PGlite       | 11 testes aprovados                                                      |
| Playwright: desktop Chromium                         | 8 testes aprovados                                                       |
| Playwright: viewport/toque de iPhone 13 em Chromium  | 8 testes aprovados                                                       |
| axe WCAG A/AA: início, auth, criador e foco a 320px  | Sem violações detectadas nos cenários automatizados                      |
| Inspeção visual de screenshots                       | Início desktop/iPhone; criador e foco a 320px conferidos                 |
| Smoke test no servidor de produção (`npm run start`) | HTTP 200; criação/nascimento/foco aprovados em desktop e viewport iPhone |

Total final: **34 testes aprovados**, além do build e typecheck. A verificação automática de acessibilidade usa movimento reduzido para medir cores finais sem capturar o fade entre telas. Não equivale a certificação nem substitui VoiceOver.

## Cenários verificados

Criação de humano/alienígena e contrato de aparência; persistência local de personagem/memória; nascimento e escolha; recarga; início, pausa e encerramento; interrupção por eventos de perda de foco/conectividade; sessão local completa de dois minutos com relógio controlado pelo Playwright e sem XP; limite de largura em 320px; erros de formulário; rejeição de origem externa/sem autenticação; manifest/ícones; instalação do worker e navegação offline; cache sem API/Auth/HTML pessoal.

No banco isolado: leitura própria e bloqueio de leitura cruzada, proibição de escrita direta de XP/carteira/sessões, uma vida e uma sessão aberta, escolhas idempotentes, sequência/frequência/lease, ausência de crédito após lacuna, retomada manual, conclusão atômica e duplicação, limite diário, expiração, cancelamento e exclusão isolada de conta.

Testes de tempo no banco ajustam timestamps pela conexão privilegiada do ambiente efêmero. Usuários reais não têm permissão para isso. O aplicativo de produção não tem mecanismo de acelerar o tempo. O relógio do Playwright existe apenas no processo de teste.

## Não executado

- Cadastro real com entrega de e-mail, confirmação/recovery PKCE e cookies SSR contra Supabase.
- Contrato HTTP PostgREST num projeto real (RPCs retornam uma linha, consumidas com `.single()`).
- Publicação Vercel, domínio/HTTPS ou deploy da migração externa.
- Safari/WebKit real, iPhone físico, bloqueio de tela, ligações, Wake Lock físico, instalação iOS e VoiceOver.
- Entregas 2 e 3: ainda não implementadas, portanto sem afirmação de testes de vida completa/social.

A suíte completa gera `test-results/home-chromium.png`, `home-iphone.png`, `creator-320-chromium.png`, `focus-320-chromium.png` e equivalentes de iPhone; pasta ignorada pelo Git e substituída em execuções subsequentes, inclusive parciais. CI em `.github/workflows/ci.yml` reproduz a suíte sem credenciais externas.
