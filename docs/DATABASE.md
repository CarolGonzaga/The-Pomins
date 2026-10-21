# Banco e autorização

**Atualização 21/10:** aplicar também `202610210001_playable_room.sql`. Há agora casas, múltiplos moradores representáveis, créditos por sessão, pedidos idempotentes, alocações e eventos. Um único personagem legado é preservado separadamente; não existe mais uma restrição global de um único personagem ativo. O contrato e a segurança da extensão estão em `PLAYABLE_ROOM.md`.

Migração inicial: `supabase/migrations/202610160001_foundation.sql`. Use um projeto novo. O script não é idempotente para reaplicação manual; futuras mudanças devem ser novas migrações.

| Entidade           | Responsabilidade                                                     |
| ------------------ | -------------------------------------------------------------------- |
| profiles           | Nickname único, consentimento público, XP de conta                   |
| characters         | Vida ativa, aparência JSON, memória inicial e XP de vida             |
| focus_sessions     | Tempo confirmado, duração, tarefa privada, lease, sequência e estado |
| focus_events       | Auditoria de comandos/intervalos, chave sessão + sequência           |
| focus_rewards      | Uma recompensa por sessão, versão de balanceamento                   |
| wallets            | Moedas e energia; ainda sem loja ou consumo                          |
| character_memories | Escolha permanente por personagem/capítulo/versão                    |

O trigger de Auth cria perfil/carteira. Nicknames são minúsculos, 3–24 caracteres `[a-z0-9_]`; a constraint garante unicidade. E-mail fica em `auth.users`, nunca no perfil. Nenhuma listagem pública é concedida nesta versão.

RLS habilitada em todas as tabelas. Grants de leitura aos próprios dados. A única edição direta permitida é `profiles.is_public`; isso não abre acesso público por si só. RPCs `create_character`, `read_birth`, `focus_command`, `delete_my_account` usam `security definer`, `search_path=''`, identificador obtido por `auth.uid()` e execute apenas para authenticated.

Um índice parcial garante uma vida ativa; outro garante uma sessão aberta por usuário. FK/cascade elimina dados pessoais na exclusão de conta. Memórias e recompensas têm chaves únicas. A função de foco bloqueia perfil antes da sessão e do personagem; o perfil serializa orçamento diário e início concorrente.

Testes automatizados executam esta migração em PGlite. `auth.users` e `auth.uid()` são fixtures locais para simular a identidade; PostgREST, GoTrue, entrega de e-mail e cookies reais ainda exigem teste no Supabase. Não é correto afirmar que a integração remota foi validada apenas com esse teste.

Antes de ativar retenção longa, definir política de compactação de `focus_events`; 5 segundos geram muitos registros. Não enviar nomes de tarefas para métricas públicas.
