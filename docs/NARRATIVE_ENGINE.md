# Narrativa

Na Entrega 1 há um prólogo escrito, com três trechos, variantes humano/alienígena e duas primeiras memórias. Lia e Nilo apresentam Vila Aurora. A escolha final chama `read_birth`; o banco permite somente `sky` ou `home`, verifica a existência da vida ativa e grava uma memória única do capítulo `birth`, versão 1. Repetir a escolha devolve o estado existente. Não há efeito econômico decidido pelo cliente.

O prólogo fica disponível após a criação e pode ser adiado. A narrativa não é aberta durante o foco. A navegação fica bloqueada enquanto a tela de sessão está em uso; o usuário pode pausar/encerrar antes de voltar. Progresso de leitura entre os três trechos ainda não é persistido; a memória final é persistida.

## Decisão para a Entrega 2

Adotar JSON declarativo tipado em vez de Ink neste primeiro universo. O conjunto inicial é pequeno e regras de autorização/transação precisam ser explícitas no servidor. O motor genérico **ainda não está implementado**. Ink pode ser reconsiderado se a autoria exigir ferramentas próprias.

Um capítulo futuro deve conter `id`, `version`, `entryScene`, faixa etária, condições de desbloqueio, mapa de cenas com destinos estáveis e lista fechada de efeitos. A publicação deve validar grafo, referências, NPCs e conclusão antes da importação. Conteúdo já publicado deve ser imutável; histórias em andamento devem fixar a versão. Implementar seleção de escolha em RPC com travas do progresso atual e efeitos permitidos, nunca com objetos de recompensa enviados pelo browser.

Para alterar o prólogo nesta versão: edite `birth.tsx`, preserve os IDs `sky/home` e o significado dos registros antigos. Mudanças de semântica exigem nova versão de conteúdo e migração explícita; não reinterprete memórias existentes.
