# Segurança e limites

Todas as operações oficiais exigem Supabase Auth verificado por `getUser()` no backend. Proxy renova cookies; API repete identidade. POST compara Origin com Host do pedido (o request.url interno pode usar 0.0.0.0 atrás do servidor Next). Ausência/origem diferente retorna 403. RPCs continuam seguras quando acessadas diretamente: auth.uid(), locks, grants e RLS são as fronteiras de autorização.

Não há service role no frontend ou necessária na API. `.env.local` é ignorado e `.env.example` contém valores vazios. Nenhum tempo, XP, efeito de escolha ou saldo do browser é confiável. Strings são renderizadas pelo React, cores são hex validadas; não há HTML narrativo arbitrário.

O worker não cacheia API, Auth, HTML personalizado ou RSC. Profiles não armazenam e-mail. Tarefas não são públicas. A exclusão de conta é uma ação explícita com confirmação textual e cascade dos dados; blobs em Storage não são usados nesta versão. Caso Storage seja adicionado, implementar limpeza e políticas próprias.

Recompensas são atômicas e únicas; limites diários são serializados pelo lock do perfil. Auth depende também dos limites e proteções do Supabase (rate limits de login e e-mail). Heartbeats têm frequência mínima; a API não possui rate limit distribuído adicional de IP. Reavaliar abuso antes de abrir social/ranking. Uso deliberado de cliente adulterado não pode ser comprovadamente distinguido de foco humano.

Testes: leitura cruzada, escrita direta de XP/saldo/sessão, comandos fora de sequência, lease inválida, tempo incompleto, duplicação, limite diário e exclusão isolada. Ainda pendentes: testes de Auth/SSR contra serviço real, auditoria externa e hardware iOS. Não alegar certificação/antitrapaça absoluto.
