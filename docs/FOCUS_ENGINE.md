# Foco estrito · versão 1

**Extensão 21/10:** `/play` reutiliza este motor. `start_resident_focus` seleciona explicitamente o adulto da própria conta. A conclusão gera um crédito único de minutos, a distribuir posteriormente em transação; não desenvolve automaticamente as habilidades do adulto. Sessões interrompidas/canceladas continuam sem minutos de conclusão. XP/moedas do fluxo anterior são preservados; ver `PLAYABLE_ROOM.md`.

O cronômetro visual nunca concede progresso. O banco usa `clock_timestamp()` e uma sequência de heartbeats autenticados. A UI estima no máximo 5s além do último estado confirmado e apresenta o total confirmado separadamente.

## Contrato

`focus_command(action,id,client,sequence,seconds,task,step)`. ID UUID criado antes do início é a chave de idempotência. Lease UUID identifica a aba. Parâmetros de duração/tarefa só têm efeito no início. Comandos seguintes exigem sequência exatamente anterior + 1. Uma repetição só é aceita se ação/lease coincidirem com o evento original.

Intervalo de heartbeat: 5s. Menos de 3s é rejeitado (limite de frequência). Entre 3 e 7,5s confirma no máximo 5s, limitado ao restante da meta. Acima de 7,5s: interrupção sem crédito do intervalo. Lacunas de suspensão, relógio do telefone e minutos enviados pelo cliente não contam. A tolerância pode subcontar alguns segundos em redes ruins; é uma escolha conservadora.

Pausar, recuperar e retomar não creditam a cauda do último intervalo. Isso perde até aproximadamente 5s de tempo real em uma pausa, mas impede contabilização integral de períodos não confirmados. O tempo anteriormente confirmado permanece. Cancelar não concede recompensa; só sessões com toda a meta confirmada podem concluir. Após 24h a sessão expira, preservando o tempo no histórico, sem prêmio.

## Estados

Cliente: idle → starting → active; active → paused/interrupted/completing/cancelled/expired; completing → completed/interrupted; paused/interrupted → active/cancelled/expired. Modelo puro em `features/focus-engine/model.ts`. Banco persiste estados estáveis; starting/completing são estados de requisição local. A RPC é a autoridade das transições persistentes.

`visibilitychange`, `blur`, `pagehide` e offline interrompem imediatamente no cliente. O temporizador não prossegue em background. Wake Lock é solicitado ao começar/retomar, liberado ao pausar/terminar, e sua revogação pausa quando ele estava ativo. Indisponibilidade é informada; a API não garante tela ligada em todos os iPhones.

Recarga não retoma automaticamente. Recuperar cria nova lease, incrementa sequência e coloca em interrupted; outra aba com lease antiga perde autorização. Recuperação manual não credita a lacuna. Em produção, testar duas abas e a interação com Safari/Control Center.

## Recompensa

Conclusão bloqueia perfil/sessão e registra recompensa, XP de conta/vida e carteira numa única transação. Uma PK por sessão e o estado terminal tornam replays inofensivos. 10 XP + 2 moedas + 1 energia por minuto inteiro, até 240 minutos premiados por dia em America/Sao_Paulo. Todo o tempo confirmado é preservado mesmo após o limite.

## Limite de confiança

Sinais do navegador não provam concentração humana. Um cliente deliberadamente modificado pode imitar heartbeats. Esta implementação limita tempo pelo relógio do banco e impede duplicação/forja direta de XP, mas não promete antitrapaça absoluto. Competição pública só deve ser ativada após avaliação adicional de abuso. Não há endpoint de aceleração em produção; os testes alteram timestamps apenas via conexão privilegiada do banco isolado.
