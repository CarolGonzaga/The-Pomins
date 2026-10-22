# Entrega 3 — personalização LPC

Base: commit `55f9497adf89641ac2f94d90876543bcd174402b`. Consolidação local autorizada com a mensagem `feat: expand LPC character customization`. Sem push, dependências novas ou migração.

## Opções disponíveis

| Categoria | Opções |
| --- | --- |
| Penteados | 7: curto, afro, chanel, longo, rabo de cavalo, ondulado e sem cabelo |
| Cor do cabelo | 12 predefinições e seletor de cor |
| Olhos | 8 predefinições e seletor de cor |
| Pele humana | 12 predefinições e seletor de cor |
| Camisa | 3 cortes: manga longa, curta e sem mangas |
| Cor da camisa | 12 predefinições e seletor de cor |
| Cor da calça | 8 predefinições e seletor de cor; corte existente preservado |
| Prévia | Em pé, caminhar e sentar; frente, costas e dois lados |

A prévia acompanha as alterações sem salvar antecipadamente. No mobile ela permanece visível ao rolar os controles. Cores têm nomes acessíveis, marcação de seleção e controles nativos; animação da prévia respeita movimento reduzido. A versão sentada usa a pose LPC disponível, sem inventar uma animação de dormir deitado.

## Composição única

`src/features/character-visuals/catalog.ts` concentra opções, paletas e endereçamento das poses. `model.ts` valida a aparência, normaliza modelos antigos e escolhe camadas pela ordem Z do manifesto. Partes traseiras de cabelo são desenhadas antes do corpo; partes dianteiras depois da cabeça.

`compositor.ts` é a única implementação da composição e recoloração. Prévia e Phaser usam o mesmo atlas 576×768, células 64×64, 9 colunas, 3 grupos de 4 direções. Paletas e camadas não mudam ao mudar de pose. O cache é limitado a seis atlas e cada consumidor recebe um canvas independente; descarte de textura Phaser não apaga a prévia. Respostas antigas da prévia e do renderer não substituem a aparência mais recente.

`room/sprites.ts` apenas reexporta a implementação para manter compatibilidade com importações existentes. O quarto, objetos, navegação, três atividades e lógica do foco/distribuição não foram substituídos.

## Persistência compatível, sem migração

Os sete campos originais continuam obrigatórios e válidos para as funções SQL existentes. Um campo opcional `visual` contém `{version: 2, hair, top, pantsColor}`. Novas escolhas preservam `hairStyle`/`clothing` com valores de fallback reconhecidos por clientes antigos; clientes atuais renderizam a seleção exata em `visual`. Aparências anteriores sem esse campo continuam idênticas, inclusive a calça `#53616b`.

O banco existente armazena esse JSONB completo. Zod valida versão, IDs do catálogo e cores no mesmo endpoint já usado. A lista de camadas nunca vem de caminhos fornecidos pelo jogador. A função SQL antiga valida os campos legados e o limite de tamanho, mas não conhece os novos IDs dentro do campo cosmético adicional; a aplicação faz essa validação e não concede novos poderes sobre saldo, XP ou outros moradores. Um cliente antigo pode mostrar o fallback e remover detalhes novos ao salvar; não utilizar versões antigas para editar a aparência v2.

O teste de banco local executa as duas migrações originais e salva/restaura v2 sob identidades simuladas, incluindo recusa de edição cruzada. A verificação remota usa a conta B de desenvolvimento: aparência salva pelo aplicativo, logout da conexão de teste e novo login normal. `scripts/verify-lpc-persistence.mjs` apenas lê o banco e compara o quarto inteiro antes/depois, sem alterar saldo, atividade, progresso ou credenciais. Sua configuração permanece em arquivos locais ignorados. O script espera a seleção de verificação documentada em seus predicados; não aplica essa seleção automaticamente.

## Fases e espécies

O contrato `VisualIdentity` conhece humano/alienígena e bebê/criança/adolescente/adulto/idoso. A matriz de suporte só aprova **adulto humano** com a base LPC disponível. O renderer recusa fases ainda sem conjunto compatível; não transforma adultos em crianças redimensionando imagens. O nascimento SVG anterior permanece independente e preservado.

Próxima etapa: importar bases de cada fase com seus próprios encaixes, animações e licenças; então habilitar as respectivas capacidades. Alienígenas precisam de cabeça/corpo e acessórios compatíveis, não apenas mudança de nome. Não há antenas, formatos novos de rosto, deitar dedicado, outras bases corporais ou envelhecimento automático nesta entrega.

## Recursos e licenças

42 PNGs da revisão fixa `9bf06be193b053db256b2536824af426de046aa2`: 24 originais intactos e 18 adicionados. As camadas novas são longo, rabo de cavalo (frente/trás), ondulado (frente/trás) e camisa sem mangas v2.

Créditos completos, fontes, hashes e licença de cada camada estão no manifesto, `CREDITS.txt`, `/credits` e em [LPC_ASSETS.md](LPC_ASSETS.md). A arte usa CC BY-SA 3.0, CC0 e OGA-BY 3.0, com atribuições e indicação de recoloração/composição. Texto OGA-BY distribuído ao lado dos PNGs. O código GPL do gerador não foi importado.

## Verificação

Os testes e resultados atuais estão em [TEST_RESULTS.md](TEST_RESULTS.md). As verificações de mobile usam Chromium com viewport/toque de iPhone e largura 320px; não equivalem a Safari/iPhone físico.

## Arquivos da entrega

- Núcleo novo: `src/features/character-visuals/{catalog,model,compositor}.ts`.
- Editor e integração: `src/features/room/{adult-editor,room-canvas,sprite-preview}.tsx`, `domain.ts`, `scene.ts`, `sprites.ts` e `room.css`.
- Assets: 18 PNGs novos em `public/assets/lpc/`, `manifest.json`, `CREDITS.txt` e `OGA-BY-3.0.txt`; `src/app/credits/page.tsx`.
- Importação e prova remota: `scripts/vendor-lpc.mjs` e `scripts/verify-lpc-persistence.mjs`.
- Testes: `tests/unit/{character-visuals,lpc-assets}.test.ts`, `tests/integration/room-database.test.ts`, `tests/e2e/character-visuals.spec.ts` e `tests/fixtures/lpc-original-assets.json`.
- Documentação: `README.md`, `docs/{CHARACTER_VISUALS,LPC_ASSETS,IMPLEMENTATION_STATUS,TEST_RESULTS}.md`.

Próxima entrega recomendada: testar em Safari/iPhone físico e selecionar uma base infantil licenciada com caminhada/espera/sentado, documentando encaixes antes de habilitar a nova fase.
