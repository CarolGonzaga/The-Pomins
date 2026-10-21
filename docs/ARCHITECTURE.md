# Arquitetura

**21/10/2026:** a arquitetura atual inclui `/play`, Phaser cliente dinâmico, coleção de moradores LPC, atividades declarativas, navegação Tiled e distribuição transacional de minutos. Consulte `PLAYABLE_ROOM.md`. As seções abaixo descrevem a base preservada; o novo módulo acrescenta moradores sem reconstruir autenticação, PWA ou temporizador.

## Entrega 1

Next.js 16.4.2 / React 19.3.1 / TypeScript strict. Versões obtidas do registro npm na implementação, lockfile versionado. Node 24. `app/page.tsx` carrega identidade validada com `getUser()` e dados sujeitos a RLS. `proxy.ts` renova cookies e protege `/account`; todas as mutações de jogo validam identidade novamente em `/api/game`. O aplicativo público é intencional para permitir exploração sem conta.

`components/game.tsx` organiza a navegação local. Domínios de autenticação, criador, renderizador, narrativa e foco têm módulos separados. Não há store global no servidor, service role no browser ou IA de runtime. A navegação mantém a mesma sessão client; recarregar restaura dados oficiais do banco. Histórico inicial limita-se a 100 sessões. Paginação e relatórios extensos ficam para a próxima entrega.

## Fluxo confiável

Interface → POST same-origin autenticado + Zod → RPC com `auth.uid()` → lock de perfil/sessão → checagens → transação → resposta com estado confirmado. As mesmas verificações essenciais existem no banco porque RPCs podem ser chamadas diretamente pelo SDK. Ler dados usa RLS; gravar XP/tempo/saldo diretamente é proibido.

CSS customizado sobre Tailwind cria identidade própria; Button segue o padrão shadcn com CVA e Radix Slot. Motion/Zustand não foram adicionados: as transições CSS e o estado local cobrem a primeira entrega com menos runtime. Campos de autenticação usam React Hook Form e Zod. Expansão de localização: textos PT-BR estão nos componentes, ainda precisam ser extraídos para catálogos antes de adicionar um idioma.

## Fases e aceite

1. Fundação: build strict; responsividade; PWA; auth/cookies; migração e RLS. Código implementado; ativação externa pendente.
2. Foco: intervalos conservadores, concorrência, interrupção e recompensas testados em PostgreSQL; ciclo browser local testado em E2E. Integração Auth/PostgREST real ainda pendente.
3. Personagem: composição SVG alinhada, humano/alienígena, nascimento persistente. Apenas proporção de bebê implementada.
4. Entrega 2: conteúdo declarativo, condições/efeitos, desbloqueios, relações e sucessão. Não implementada nesta versão.
5. Entrega 3: social/economia de consumo/competição. Não implementada.

Para a Entrega 2, mover navegação para rotas de domínio se deep links/restauração de cena exigirem. Introduzir outbox transacional quando mais consumidores de recompensas existirem. Não antecipar tabelas sem comportamento real.
