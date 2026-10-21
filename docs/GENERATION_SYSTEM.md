# Gerações · Entrega 2

Atualmente cada conta possui uma vida ativa de geração 1. O campo `archived_at` e o índice parcial permitem evolução futura; nenhuma vida envelhece, termina ou morre pelo calendário real. Ausência nunca remove XP, personagem ou memórias.

Na Entrega 2: cada mudança de fase depende de foco acumulado e marco narrativo, aplicado pelo usuário depois do foco. Encerrar uma vida será uma cena consentida; a sucessão deve bloquear família/personagem, exigir sucessor elegível e registrar evento único por vida. Personagens antigos ficam arquivados, jamais sobrescritos. XP de conta permanece e XP de vida pertence ao novo personagem.

Para adicionar geração: manter os capítulos antigos fixados em versão, adicionar um vínculo parental, incrementar geração apenas em transação, selecionar sucessor e trocar vida ativa sob o mesmo lock. Testar reexecução, concorrência e restauração. Primeira vida completa, árvore genealógica real e segunda geração jogável ainda não foram entregues.
