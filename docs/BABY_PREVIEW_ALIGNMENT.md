# Centralização da prévia do bebê

Validação local em 24/10/2026. Consolidação em commit local autorizada; sem push ou publicação desta correção.

## Causa e correção

O componente `Creator` colocava o SVG e os círculos diretamente no card. O SVG recebe display de bloco pelo reset CSS, de modo que `text-align: center` do card não o centralizava. Já os círculos tinham seu próprio centro absoluto. O `Pomin` possui viewBox 260 × 300 e eixo horizontal em x=130; suas coordenadas internas não precisaram mudar.

A nova área `character-preview-scene` usa CSS Grid com `place-items: center`. Os dois círculos são centralizados relativamente a essa mesma área, nos dois eixos. As dimensões responsivas existentes do SVG e dos círculos são preservadas, assim como título, subtítulo, botão, cores, traços e personalização. Não há compensações por margens negativas, JavaScript de medição ou mudanças no SVG compartilhado. O card de perfil que também usa `character-preview` mantém seus seletores anteriores.

## Verificações executadas

- Lint: aprovado.
- TypeScript (`next typegen && tsc --noEmit` no snapshot isolado): aprovado.
- Vitest: 193 aprovados, 11 ignorados por ausência do PostgreSQL externo descartável. Sem consulta ao Supabase remoto.
- Build de produção Next.js com webpack: aprovado no snapshot `.cache/baby-preview-alignment`. Aviso de múltiplos lockfiles decorre da localização do snapshot; nenhuma configuração de produção foi alterada.
- Playwright: 10 testes novos de geometria aprovados, cobrindo larguras 320, 375, 390, 430 e 1280 px nos projetos desktop Chromium e iPhone simulado em Chromium. Cada teste percorre humanos/alienígenas, quatro cabelos, três olhares, três acessórios, antenas, marcas e aleatorização. Verificam centros dos círculos/SVG/card, centro horizontal da arte pintada, limites da ilustração, separação do título e ausência de overflow horizontal.
- Seis testes existentes de jornada aprovados: criação, nascimento, memória, recarga, foco local descartável, página inicial, formulário Auth e bloqueio de comandos não autorizados. Nenhuma sessão real foi usada.
- Capturas desktop/mobile examinadas localmente. A primeira execução dos testes novos encontrou uma ambiguidade no seletor de imagem (ícone do botão versus bebê); o seletor foi corrigido e os dez testes passaram na execução seguinte.

O servidor 3000 e seu build anterior foram preservados. O servidor temporário dos testes usou porta 3190 e contexto de navegador descartável. Nenhum arquivo privado de ambiente foi copiado para esse snapshot. Não houve alteração em autenticação, Supabase, foco, saves, migrações ou progressão. Safari em iPhone físico não foi validado nesta tarefa.

## Arquivos desta correção

- `src/features/character-creator/creator.tsx`
- `src/app/globals.css`
- `tests/e2e/baby-preview.spec.ts`
- Este documento.

As alterações preexistentes em `.env.example` e o relatório `docs/VERCEL_PREVIEW_6B.md` foram preservados e não pertencem à correção visual.

## Preparação para atualizar o Preview

Na revisão de consolidação, a branch atual `codex/consolidacao-base`, a branch local `codex/preview-6b` e a referência Preview consultada diretamente no GitHub apontavam a `4c5b212e2b1f8851d64c16e722d81aa660ce829b`. A branch remota `codex/consolidacao-base` permanece em `6bbf3aa`; não é o destino desta atualização.

O commit `fix: center baby preview illustration` deve conter somente os quatro arquivos desta correção e ser filho direto de `4c5b212`. Assim, apenas esse novo commit precisa avançar `refs/heads/codex/preview-6b`, sem merge, cherry-pick, rebase ou force push. Antes do envio autorizado, consultar novamente a referência remota: se alguém tiver avançado o Preview, reavaliar em vez de sobrescrever seu histórico.

A Production Branch `main` não deve ser modificada. Um push à branch Preview pode disparar deployment automaticamente e depende de nova autorização específica. A publicação da correção visual não resolve por si só a configuração HTTPS de Auth identificada no relatório Vercel, que permanece fora do escopo desta tarefa.

### Revalidação para consolidação

Lint, TypeScript e build de produção foram repetidos e aprovados. O snapshot foi comparado por SHA-256 com os três arquivos de código/teste da árvore local antes das verificações; os conteúdos eram idênticos. A inspeção dos quatro arquivos não encontrou credenciais, tokens ou backups.

A primeira execução da suíte simultânea ao build encontrou timeouts de 30 segundos na inicialização PGlite e processamento de PNG. A suíte inteira foi repetida com `npm test -- --maxWorkers=2`, sem alterar limites ou testes: **193 aprovados e 11 ignorados** por ausência de PostgreSQL externo. Não foi usada a aprovação antiga como evidência desta consolidação.

Playwright foi repetido contra o novo build isolado na porta 3190: **16 aprovados em 1,2 minuto**, incluindo os dez testes de alinhamento e os seis de jornada, nos perfis desktop e iPhone simulado. Nenhum teste físico no iPhone foi declarado aprovado.
