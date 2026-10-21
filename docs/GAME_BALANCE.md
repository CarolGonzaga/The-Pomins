# Balanceamento v1

**21/10 — minutos do quarto:** toda sessão completa confirmada produz minutos inteiros distribuíveis, guardados em `focus_credits`. Eles são separados de moedas/XP e do teto de prêmios antigos descrito abaixo. Estudar concede +2 conhecimento/+1 autonomia; ler +1 conhecimento/+1 criatividade; dormir +3 energia (até 100)/+1 bem-estar por minuto distribuído. Habilidades do adulto não são premiadas automaticamente; idade não muda com o acúmulo. Ver `PLAYABLE_ROOM.md`.

Autoridade: função `focus_command` na migração inicial. `model.ts/rewards` é referência pura testada; nenhum cálculo do frontend concede saldo. Qualquer mudança deve alterar ambos e os testes na mesma revisão, por nova migração, com `balance_version` incrementado.

| Recurso           | Por minuto completo premiado |
| ----------------- | ---------------------------- |
| XP de conta       | 10                           |
| XP de vida        | 10                           |
| Moedas            | 2                            |
| Energia narrativa | 1                            |

Meta mínima: 2 minutos; máxima: 120. Limite diário de recompensas: 240 minutos no fuso America/Sao_Paulo, considerado na data de conclusão. Depois do limite, tempo e sessões continuam registrados, sem novos recursos. Sessão cancelada/expirada não gera prêmio. Moedas e energia estão registradas, mas a UI ainda não tem loja ou consumo. Não há pontos competitivos na Entrega 1.

Idades sugeridas de 1/4/12/25/45/75/90h são planejamento para Entrega 2, não marcos ativos. Não mostrar avanço etário fictício com XP nesta versão. Metas diárias pessoais e redução para dias difíceis ainda serão implementadas. Sem sequências punitivas ou benefícios pagos.
