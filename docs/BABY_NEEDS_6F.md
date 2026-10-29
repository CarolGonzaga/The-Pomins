# Entrega 6F — necessidades e apresentação

## Diagnóstico antes de alterar o banco

`characters.needs` é JSONB (cinco valores inicialmente 75). No bebê, os seis
cuidados só adicionam valores e limitam em 100. Não há clock, último desgaste,
decay offline, timer de redução ou cron nas funções existentes. A redução lenta
relatada não corresponde a uma taxa baixa configurada: não há redução temporal
no caminho auditado. Trocas de snapshots/personagem não são passagem de tempo.

`baby_state_for_save` lê o estado; `baby_state` é compatibilidade. A API `/api/baby`
chama essas leituras e, para cuidados, `purchase_baby_care` ou o encaminhador
histórico `baby_care_for_save`. A função paga autentica, bloqueia conta, valida
save, bloqueia bebê e créditos FIFO; usa o catálogo versionado (2 minutos), aplica
efeitos, grava distribuições, recibo e evento atomicamente. Repetições históricas
não cobram novamente. O quarto LPC usa outro executor e não habilita esses
cuidados para adultos. Suas atividades adicionam energia/habilidades, não
reduzem necessidades por hora. A exploração local usa localStorage/Web Locks,
sem relógio de servidor e sem poder representar persistência confiável offline.

Leituras brutas de `characters` e o carregador de save transportam o baseline
armazenado, não uma projeção de necessidades em tempo real. A tela bebê busca o
DTO próprio de cuidados; essa será a fonte dos valores efetivos. O nascimento,
XP, habilidades, potenciais, prontidão para crescer e constância são separados.

## Primeira parte visual

Setas SVG estáticas e não interativas (`pointer-events:none`) indicam a borda
girante sem alterar medidas, gesto ou motor. A dica visível desaparece enquanto
a duração está bloqueada. Teclado, +/−, centro e descrição acessível permanecem.
Não há movimento adicional que precise ser desativado por preferência reduzida.

As barras têm limites 60/40 comuns, números e descrições Adequado/Atenção/Crítico,
com cores próprias para claro/escuro e pseudos nativos Safari/Firefox. O humor
é derivado dos valores não arredondados: média >=60 feliz, >=40 insatisfeito,
abaixo de 40 triste; qualquer valor <20 impede feliz. Não existe coluna de humor.
Somente olhos, sobrancelhas e boca variam no SVG existente. Aparência humana e
alienígena, cores, acessórios, roupas e antenas são preservados. Uma reação
gratuita é temporária; ao terminar retorna ao humor geral, sem comprar progresso.

## Backend, balanceamento e validação

Será completado após a implementação e os testes da migração incremental local.
Taxas candidatas não estão aprovadas para ativação no banco remoto. Nenhum cron
ou consequência de constância integra esta entrega.
