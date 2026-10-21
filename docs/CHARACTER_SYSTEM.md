# Sistema de personagens

**Novo módulo em 21/10:** os adultos LPC usam `features/room/domain.ts`, configuração de aparência independente e atlas de camadas reais. Bebês SVG e alienígenas descritos abaixo permanecem no fluxo legado. Nenhuma base etária ausente é oferecida como se já estivesse disponível no catálogo LPC. Ver `LPC_ASSETS.md` e `PLAYABLE_ROOM.md`.

`model.ts` define `Appearance` com validação Zod; a RPC repete a validação básica para acesso direto ao Supabase. `Pomin` renderiza SVG em viewBox 260 × 300. Ordem: sombra, manta/corpo, mãos, antenas, orelhas, cabeça, cabelo, olhos, bochechas, nariz/boca, marcas, acessório e detalhe da manta. As coordenadas compartilhadas são as âncoras da versão bebê.

Humanos e alienígenas têm oito tons iniciais, quatro cabelos (incluindo ausência), seis cores de cabelo, três olhares, cinco cores de olhos, seis mantas e três acessórios. Alienígenas têm antenas opcionais e orelhas ampliadas; marcas são cosméticas. Aparência não define gênero, pronomes ou habilidades. A forma independente de gênero usada no texto evita inferir identidade. O MVP ainda não oferece campos de identidade ou preferências românticas.

O mesmo componente cria prévia, retrato de foco, avatar familiar e personagem do cenário. `sleeping` altera somente expressão dos olhos. Outros tipos de expressão, corpos por idade e penteados compatíveis por fase pertencem à Entrega 2.

Para adicionar cabelo: estenda o enum Zod, o enum/check de `create_character` numa nova migração, o seletor do Creator e o grupo SVG no Pomin. Teste a combinação de todas as espécies/olhares/acessórios em 320px. Para nova espécie: definir catálogo/compatibilidades, paleta, contrato e validação do servidor, sem deduzir atributos de personalidade.

As ilustrações são arte vetorial inicial autoral, substituível; não representam um catálogo artístico final.
