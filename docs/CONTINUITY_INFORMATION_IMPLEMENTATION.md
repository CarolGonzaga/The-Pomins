# Entrega 6D-C1 — constância informativa

Implementação local sobre `main` em 27/10/2026. Sem publicação, alterações remotas,
novas migrações, cobranças ou consequências. O plano anterior em
`CONTINUITY_INFORMATION_PLAN.md` permanece preservado como documento anterior.

## Contrato e fonte confiável

`GET /api/continuity` autentica via `getEconomyFoundation()`/`getUser` e chama
somente `get_economy_foundation()`, já aplicada no desenvolvimento. A RPC filtra
por `auth.uid()`, usa `clock_timestamp()` e escolhe a sessão mais recente com
status completed, `validated_ms >= planned_seconds * 1000` e ended_at preenchido,
ordenada por ended_at e ID. Não usa créditos, XP, save ou cache de observação
para decidir validade; uma conclusão sem XP por limite diário também conta.

A projeção de servidor calcula os marcos exatos de 72, 168 e 720 horas desde a
última conclusão. Sem conclusão válida, não inventa um marco de cadastro; após
o último marco, não abre outro prazo nem anuncia encerramento. As datas são
instantes absolutos; o fuso do aparelho não altera durações. A UI mostra o
horário da conclusão explicitamente em UTC.

O DTO contém horário do servidor, versão, última conclusão, tempo decorrido,
marcos atingidos, próximo marco e tempo restante. Não expõe proprietário, saldo,
ID da sessão ou comandos de penalidade. Cache-Control private/no-store; API sem
métodos de escrita, sem parâmetros de conta/save. Erro de autenticação é 401;
falha de RPC, contrato incompatível ou rede é 503, sem detalhes privados.

## Integração visual e ciclo de vida

Provider em memória por conta, acima das rotas e abaixo do controlador de foco;
descartado com a troca de conta/logout pelo provider de preferências já chaveado.
Não há cache persistido nem relógio baseado em Date.now. Uma consulta a cada
minuto visível, no retorno, reconexão, evento de storage e conclusão confirmada
atualiza a projeção. Requests antigos são abortados ao invalidar/desmontar.
Concluir uma sessão ativa invalida a leitura anterior; repetir conclusão não
escreve eventos nem chama uma operação de constância.

O indicador em details integra a área de foco estável de GameScreen para bebê
e adulto. Expande regras/última conclusão e oferece atualização e acesso ao
controle de foco, sem iniciar sessão automaticamente. Não muda keys do timer
ou Phaser. Criação de save e tutorial explicam consequências futuras, com a
informação explícita de que ainda estão em preparação. Não há controle para
desligar um futuro modo obrigatório.

**Precisão de apresentação:** retrato confirmado pelo servidor, arredondado a
minutos para leitura; não é uma contagem animada por segundo. Pode demorar até
um minuto para refletir a passagem de marco enquanto visível. Ao sair/offline,
marca o retrato como desatualizado e revalida ao voltar. Falha dessa consulta
não bloqueia cuidado, criação, cena ou foco. Nenhum prazo exibido aplica efeitos.

## Segurança e antirretroatividade

Não altera focus_command, saldo, distribuições, sessões, saves, atributos, ciclos,
eventos, memoriais, activation_at ou baselines. FoundationSchema continua
exigindo active=false e activation_at=null. Uma futura ativação incompatível
falha fechada, exigindo outra implementação revisada. Consultas repetidas não
precisam de idempotência de escrita, pois não existe escrita nesta entrega.

Idade histórica pode superar 30 dias: é somente informativa. A futura ativação
de consequências precisará de piso explícito de ativação e de jornada,
baseline versionado e aprovação próprios; não poderá reutilizar a ausência
histórica exibida aqui para aplicar consequências retroativas. Criar, trocar ou
arquivar partidas não redefine a última conclusão global.

## Auditoria de progressão

O diagnóstico e a proposta da próxima etapa estão em `BABY_CHILD_7A_PLAN.md`.
Sem arte infantil validada e RPC de evolução, a passagem continua indisponível.

## Validações

Resultados repetidos nesta entrega: lint, TypeScript e build webpack isolado
aprovados; 238 testes Vitest locais; 60 testes PostgreSQL nativos (24 da
fundação/constância, 25 de cuidados pagos e 11 de concorrência); 119 casos únicos
de navegador aprovados, em Chromium desktop e viewport iPhone. Total: **417**.
A suíte completa de navegador executou 117 aprovados/um ignorado; o caso novo de
conclusão/invalidação foi acrescentado depois e aprovado em ambos os perfis,
numa execução focada que também repetiu os outros quatro casos C1. O caso de
toque ignorado no desktop foi executado no perfil mobile. Os 60 casos PostgreSQL
opcionais ignorados no comando Vitest padrão foram executados separadamente nos
clusters descartáveis. Dump/restauração dos dois bancos de economia e cuidado
comparados com sucesso. O primeiro ensaio do caso adicional encontrou um erro
no próprio teste (retorno composto sem to_jsonb); corrigido, todos passaram.

O build/testes utilizaram cópia isolada e gateway sintético, com chaves fictícias
somente no ambiente de teste. Não foram copiados arquivos privados nem alterado
o servidor da porta 3000. Aviso de múltiplos lockfiles é próprio da cópia isolada.

A evidência remota desta entrega é somente leitura: três
contas, seis consultas repetidas autenticadas, hashes de dados públicos/privados
da fundação iguais antes/depois e 12 verificações de integridade sem erro.
Saldo observado: 14 minutos, uma sessão pausada, cinco saves, seis personagens,
oito sessões e 11 distribuições. Nenhuma dessas entidades foi alterada.
As 13 tabelas da fundação mantêm RLS; a RPC permite authenticated e rejeita anon;
o histórico remoto permanece nas versões já aplicadas até 20261026183003.

## Arquivos desta entrega

- `src/features/continuity/`: modelo, serviço, provider, indicador/regras e CSS.
- `src/app/api/continuity/route.ts`: endpoint autenticado somente leitura.
- `src/app/layout.tsx`: provider por conta, preservando o motor de foco.
- `src/features/game-screen/game-screen.tsx`: composição do indicador.
- `src/features/game-saves/new-save-form.tsx` e `src/features/portal/rules.tsx`:
  transparência das regras futuras.
- `tests/unit/continuity*.test.ts`, `tests/e2e/continuity.spec.ts`,
  `tests/integration/economy-foundation-postgres.test.ts` e
  `tests/support/save-gateway.mjs`: cobertura e RPC no gateway descartável.
- Este relatório e `docs/BABY_CHILD_7A_PLAN.md`.

Alterações anteriores em `.env.example` e quatro documentos pendentes foram
preservadas fora do commit. Nenhuma migração, asset LPC, dependência ou segredo
integra esta entrega. Permanece necessária autorização para push na main, que
disparará o deploy automático. Não há nova migração necessária para publicar C1.

## iPhone físico e publicação

Depois de autorização de push e deployment confirmado, testar Safari e PWA:
abrir adulto e bebê, expandir indicador em 320–430 px, conferir UTC/marcos e
inatividade das consequências; alternar saves e garantir mesma última conclusão;
iniciar foco somente numa conta autorizada para esse teste, navegar internamente,
ocultar/bloquear e retornar conforme as regras existentes; reconectar e verificar
revalidação sem débito/alteração da sessão pelo indicador. Testar VoiceOver,
zoom, orientação e instalação standalone. Chromium com viewport iPhone não
equivale a Safari físico. Não há permissão de publicação nesta entrega.
