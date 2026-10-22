# Segurança e limites

Todas as operações oficiais exigem Supabase Auth verificado por `getUser()` no backend. Proxy renova cookies; API repete identidade. POST compara Origin com Host do pedido (o request.url interno pode usar 0.0.0.0 atrás do servidor Next). Ausência/origem diferente retorna 403. RPCs continuam seguras quando acessadas diretamente: auth.uid(), locks, grants e RLS são as fronteiras de autorização.

Não há service role no frontend ou necessária na API. `.env.local` é ignorado e `.env.example` contém valores vazios. Nenhum tempo, XP, efeito de escolha ou saldo do browser é confiável. Strings são renderizadas pelo React, cores são hex validadas; não há HTML narrativo arbitrário.

`next.config.mjs` rejeita formatos conhecidos de chave privilegiada (`sb_secret_` e JWT `service_role`) no campo `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` antes da compilação. A mensagem omite o valor. Isso evita um erro de configuração conhecido, sem substituir a validação da chave pelo Supabase ou a revisão de RLS/grants.

O worker não cacheia API, Auth, HTML personalizado ou RSC. Profiles não armazenam e-mail. Tarefas não são públicas. A exclusão de conta é uma ação explícita com confirmação textual e cascade dos dados; blobs em Storage não são usados nesta versão. Caso Storage seja adicionado, implementar limpeza e políticas próprias.

Recompensas são atômicas e únicas; limites diários são serializados pelo lock do perfil. Auth depende também dos limites e proteções do Supabase (rate limits de login e e-mail). Heartbeats têm frequência mínima; a API não possui rate limit distribuído adicional de IP. Reavaliar abuso antes de abrir social/ranking. Uso deliberado de cliente adulterado não pode ser comprovadamente distinguido de foco humano.

Testes locais: leitura cruzada, escrita direta de XP/saldo/sessão, comandos fora de sequência, lease inválida, tempo incompleto, duplicação, limite diário e exclusão isolada. Em 21/10/2026, Auth/SSR e recovery foram verificados no serviço real com participação do usuário. Duas contas comuns aprovaram isolamento em 8 tabelas e RPCs, bloqueio de escrita direta de XP/carteira/atributos, repetição, rollback, disputa de saldo e transferência de posse de sessão. Os testes usaram JWTs comuns; SQL privilegiado apenas conferiu agregados posteriormente. Recibo em `deployments/2026-10-21-supabase-runtime-validation.json`. Auditoria externa, hardware iOS, rede física e expiração prolongada de tokens não foram validados. Não alegar certificação/antitrapaça absoluto.
