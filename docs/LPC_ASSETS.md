# LPC: escolha, procedência e licenças

O conjunto usado vem de [Universal LPC Spritesheet Character Generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator), revisão fixa **9bf06be193b053db256b2536824af426de046aa2**. A importação foi feita por `scripts/vendor-lpc.mjs`; o código do gerador não foi incorporado.

## Avaliação dos projetos solicitados

| Referência                                                                                                    | Avaliação e decisão                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Universal LPC principal](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator) | Catálogo com definições JSON, PNGs separados por animação, paletas e créditos por camada. Usado como fonte de arte; exportação programática por seleção explícita de arquivos da revisão fixa.                                                                                                           |
| [Modern Sprite Generator](https://github.com/codyaboyd/Universal-LPC-Modern-Sprite-Generator)                 | Fork do gerador com foco moderno, árvore e definições semelhantes. Não é necessário importar outro gerador para as três atividades. Não se assume compatibilidade/licença de todo o fork com base apenas no nome. Não utilizado.                                                                         |
| [lpc-spritesheet-mcp](https://github.com/kanishka-namdeo/lpc-spritesheet-mcp)                                 | Servidor Node/stdio documentado, requer clone do catálogo local; não traz arte. Não havia ferramenta desse MCP conectada na sessão. Não foi instalado/reconfigurado no Codex nem foi alegado funcionamento automático. A alternativa usada é importação/composição direta de PNGs, reproduzível sem MCP. |
| [Phaser](https://docs.phaser.io/phaser/getting-started/installation)                                          | Integrado ao Next como módulo cliente dinâmico. Fixado em 3.90.0 para o renderer Canvas estável da série 3, sem substituir o Next existente.                                                                                                                                                             |

Manutenção: o catálogo principal tinha mais histórico de alterações que o fork moderno na consulta de 21/10/2026. Nenhuma disponibilidade futura é presumida: assets são servidos localmente, com revisão/hashes registrados. Uma atualização precisa revisar novamente metadados, licenças, grade de quadros e compatibilidades.

## Camadas e atribuições

As autorias e fontes exatas de cada camada estão em **`public/assets/lpc/CREDITS.txt`**, **`manifest.json`** e na tela **`/credits`**, acessível pelo rodapé do quarto. Cada PNG original distribuído tem caminho upstream e SHA-256 no manifesto.

- Corpo-base adulto (`body/bodies/male`): bluecarrot16, JaidynReiman, Benjamin K. Smith/BenCreating, Evert, Eliza Wyatt/ElizaWy, TheraHedwig, MuffinElZangano, Durrani, Johannes Sjölund/wulax, Stephen Challener/Redshrike.
- Cabeça humana (`head/heads/human/male`): bluecarrot16, BenCreating, Redshrike.
- Cabelo curto (`hair/plain`): JaidynReiman, Manuel Riecke/MrBeast, Joe White.
- Afro (`hair/afro`): bluecarrot16, CC0.
- Chanel (`hair/bob`), calça, camisas: consultar os registros individuais do manifesto para os nomes e fontes completos.

Para cada camada não CC0 foi selecionada a alternativa **[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)** explicitamente oferecida nos metadados. Não se aplica automaticamente a licença GPL do código do gerador a toda a aplicação. Recoloração e composição de arte derivada são disponibilizadas sob CC BY-SA 3.0, com identificação das modificações e preservação dos créditos. Não há endosso dos artistas.

O script interrompe se não encontrar crédito e licença selecionável para uma camada. Ele verifica PNGs com quatro direções em células de 64×64. A suíte verifica hashes, dimensões e alteração real de pixels, inclusive olhos, sem afetar alpha.

## Lacunas declaradas

A base é tecnicamente chamada `male` no catálogo; na interface é “corpo-base A” e não define a identidade de gênero do Pomin. Não há promessa de todas as bases disponíveis no Universal LPC. O subconjunto inclui walk, idle e sit; leitura/estudo usam pose compatível e objetos; sono dedicado deitado é uma lacuna e tem adaptação de repouso sentado documentada. `none` remove o cabelo de verdade. A calça é fixa; a cor editável de roupa altera a camisa. O formato de rosto, antenas e expressões do criador legado não são falsamente oferecidos neste editor adulto.

Para acrescentar uma camada: escolher uma definição e animações compatíveis, revisar créditos/licenças, atualizar script/manifesto e contrato de aparência, incluir o controle somente quando a prévia/renderer realmente o suportarem. Novas fases precisam de bases específicas; não basta desenhar um adulto menor.
