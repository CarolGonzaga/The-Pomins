# Hereditariedade · Entrega 2

Planejada, não implementada. Não há sorteio de filhos ou afirmação de genética biológica nesta versão.

Serviço puro futuro: entrada com ID de regra, pais biológicos, geração e semente criada no servidor; saída com espécie e traits herdados. Definir tabelas de compatibilidade por espécie e regras explícitas para ancestralidade. Adoção não requer herdar traços dos cuidadores e deve ter vínculo familiar equivalente.

Configurar herança exigirá catálogo versionado e testes determinísticos: a mesma entrada/semente deve produzir a mesma aparência. Salvar semente, versão de regra e resultado para auditoria. Nunca usar cor de pele, gênero, orientação ou aparência para calcular moralidade, inteligência ou valor do personagem. Cosméticos equipados são separados de traits herdados.

Pré-requisitos: catálogo de aparência por idade, parentage_links e função transacional de criação de descendente. Só criar essas tabelas junto com comportamento e testes de autorização, condições de idade e repetição.
