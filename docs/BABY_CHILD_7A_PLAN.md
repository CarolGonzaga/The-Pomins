# Entrega 7A — diagnóstico e proposta bebê → criança

Auditoria de 27/10/2026, sobre `main`, base `0a6f4c3` e implementação local C1.
Documento de planejamento: nenhuma idade, transição ou arte nova foi implementada.

## Estado real

O personagem possui identidade persistida em `characters`: ID, proprietário,
save, residência, nome, espécie/aparência JSONB, geração, nascimento, primeira
memória, leitura do nascimento, XP de vida e arquivamento. A evolução deve manter
o mesmo registro e ID; criar outro morador perderia referências ao histórico.

As cinco habilidades são conhecimento, criatividade, sociabilidade, autonomia
e bem-estar. Necessidades: saciedade, higiene, energia, afeto e diversão.
Potenciais do bebê: curiosidade, sociabilidade e vínculo seguro. Habilidades,
potenciais, minutos de desenvolvimento e tipos de cuidados acumulam no modelo
do bebê; necessidades são estados limitados a 0–100. Nada deteriora por ausência.
Históricos vivem nas distribuições, memórias e eventos, com vínculo por conta,
save e personagem. Protagonista, geração e residência não devem mudar para
simplesmente envelhecer. Não inventar parentesco ou incrementar geração.

XP de vida e XP da conta são distintos das habilidades e do progresso de cuidados.
O foco concede XP/recompensas por conclusão validada, sujeito ao limite diário
existente. O cuidado pago registra seus efeitos ao consumir exatamente dois
minutos do saldo global. Não converter XP, créditos e habilidade entre si nem
reprocessar distribuições antigas na transição. O adaptador visual adulto usa
um personagem de foco com `life_xp: 0`; isso não autoriza zerar o valor persistido.
Antes de exibir XP infantil, explicitar esse campo no contrato de carregamento.

## Prontidão atual e compatibilidade

`growthReadiness` usa regras configuráveis: 30 minutos de cuidados, quatro tipos
distintos e nascimento lido na versão atual. A UI informa prontidão, mas não
executa a transição. Com preços de dois minutos, os 30 minutos equivalem a pelo
menos 15 compras; os requisitos não passaram a significar 30 compras.

Não há transição automática de idade por tempo real ou XP nos caminhos atuais
auditados. As fases child/teen/adult/elder existem nos tipos, não representam
suporte gráfico completo. Há permissões declarativas de atividades para criança
no domínio do quarto, mas `worldPresentation` não aceita criança: não habilitar
atividades ou reutilizar corpo adulto como atalho.

As regras atuais são compatíveis com crescimento voluntário. Planejamentos
históricos de capítulos por XP não devem substituir a prontidão nem produzir
envelhecimento automático. A constância C1 é independente: seus marcos não são
requisitos de idade e nenhuma consequência está ativa.

## Recursos visuais

| Fase | Disponível | Bloqueio para próxima etapa |
| --- | --- | --- |
| Bebê | SVG parametrizado, humano/alienígena, repouso e reações de cuidado | Não fornece caminhada infantil |
| Criança | Tipos preparados | Sem conjunto infantil validado, atlas, colisão ou animações próprios |
| Adulto | 42 PNGs LPC por camadas, corpo humano masculino; composição centralizada, animações do quarto | Não serve como arte infantil nem alienígena |

As atribuições e licenças selecionadas permanecem no manifesto LPC, créditos e
arquivos de licença existentes. Não houve importação de assets nesta entrega.
Para criança, validar tamanho/corpo, direções, idle, caminhada e poses exigidas
pelas atividades; conferir encaixe de cabelo/roupa, transparência, âncora e
licença de cada camada. Caso uma pose não exista, declarar a limitação na
atividade em vez de usar uma aparência divergente. Validar humano e alienígena
separadamente; sem arte alienígena infantil aprovada, não prometer suporte.

## Proposta incremental

1. Aprovar/produzir arte infantil e registrar proveniência, autoria e licença.
   Testar composição centralizada em mobile antes de liberar o envelhecimento.
2. Especificar um envelope de aparência por fase que preserve a aparência do bebê
   e opções de origem. Registrar mapeamentos explícitos, sem sobrescrever JSONB
   antigo nem escolher pele/cabelo incompatíveis silenciosamente.
3. Planejar RPC `grow_character` autenticada: conta/save/personagem elegíveis,
   protagonista compatível, revisão esperada, chave idempotente e regra versionada.
   Revalidar prontidão no servidor dentro da transação; bloquear o personagem
   na ordem já estabelecida para evitar corrida com cuidados. Sem débito novo,
   sem tocar em `focus_credits`, sem concluir/interromper foco.
4. Alterar somente fase/apresentação autorizadas e adicionar um evento narrativo
   único. Preservar identidade, habilidades, potenciais, necessidades, XP,
   minutos, memórias, residência, geração e o ledger. Se um atributo não tiver
   utilização infantil imediata, preservá-lo como dado, sem descartá-lo.
5. Adaptar carregadores e cena ao novo suporte e ao catálogo de atividades
   infantil, com desmontagem da cena somente na troca real de fase/contexto.
6. Testar RPC e migração incremental, se necessária, em PostgreSQL descartável;
   pedir autorização específica para remoto após backup/restauração e preflight.

## Testes de aceite da 7A

Prontidão abaixo/no limite, tipos de cuidado, nascimento pendente, duplo clique,
requisição repetida e concorrente, duas abas, conta e save incompatíveis, revisão
obsoleta, personagem arquivado e arte indisponível. Snapshot antes/depois deve
comprovar preservação de todos os campos e históricos citados, saldo e sessão
de foco. Recarregar/login recupera a mesma criança e o mesmo ID. Regressão das
rotas legadas, bebê, adulto, personalização, créditos LPC, Safari/PWA e teclado.

**Dependências de produto:** validar recursos infantis e aprovar a operação de
evolução. Esta C1 não altera os requisitos de crescimento nem desbloqueia a fase.
