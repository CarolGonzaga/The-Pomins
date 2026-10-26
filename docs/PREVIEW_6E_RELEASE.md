# Publicação Preview da Entrega 6E — preparação

Data da conferência: 26/10/2026. Esta preparação não autoriza push, deploy, alteração de ambiente remoto ou migração.

## Versão e Git

Base local confirmada: 6D-A `1126fc3f0c66ec42752f92d33f06ee534a8cf6e4`, 6D-B `39445ab16481b8b6360198b8007da254345d5c28`. A 6E será o commit seguinte, identificado no relatório de consolidação.

Branch de trabalho: `codex/consolidacao-base`. Branch Preview local e remota: `codex/preview-6b`, ambas em `4c5b212e2b1f8851d64c16e722d81aa660ce829b`. A consulta atual ao GitHub mostrou somente essas duas branches; não existe `refs/heads/main` no remoto consultado. Não criar main nesta tarefa.

A Vercel foi consultada pelo Dashboard autenticado da equipe `the-pomins`, projeto `thepomins` (`prj_e9ETfXxiQOAqYTqSJX2tYYtzGsrc`). **Production Branch = main**, confirmada no campo Branch Tracking de Production. Preview está habilitado para All unassigned branches. Nenhum campo foi alterado. Build and Deployment confirma preset Next.js, Node 24.x, raiz do repositório e overrides de build, output e instalação desabilitados. O aviso de diferenças da produção antiga não modifica o preset atual nem autoriza republicar Production.

O Preview é ancestral da base local. O avanço direto deve carregar, em ordem:

1. `71dccda` — centralização do bebê;
2. `587aeea` — navegação e legibilidade 6C;
3. `1126fc3` — fundação inativa 6D-A;
4. `39445ab` — cuidados pagos 6D-B;
5. commit local 6E — tela e continuidade do foco.

Não fazer cherry-pick apenas da 6E: seus ancestrais contêm os contratos necessários. Não atualizar `origin/codex/consolidacao-base`, main ou domínios de produção para este ensaio. Não é necessário trocar a branch da árvore com alterações privadas pendentes.

## Banco de desenvolvimento e compatibilidade

Projeto verificado: `ogzgfkxhxdrwemdzxskg`, o mesmo projeto usado como desenvolvimento nas entregas anteriores. Foram feitas consultas de catálogo e uma transação READ ONLY, sem chamadas a RPCs de jogo.

O histórico remoto contém a fundação inicial agrupada em `20261021201224`, seguida de `20261022021139`, `20261022134830`, `20261022191724`, `20261022202113`, `20261026173537` e `20261026183003`. A fundação inicial corresponde aos dois primeiros arquivos locais históricos; não tentar realinhar nem reaplicar esses arquivos antigos.

As **44 funções** do catálogo local de teste foram comparadas às remotas por assinatura, corpo SQL (normalizadas somente as quebras de linha), SECURITY DEFINER, search_path e permissões de execução: nenhuma divergência. Isso inclui `focus_command`, carregamento de saves, `purchase_baby_care`, catálogo e adaptadores legados. As funções públicas do jogo exigem authenticated; anon não tem EXECUTE. Os caminhos de quarto continuam restritos ao renderizador LPC; os cuidados legados não aceitam novas compras de preço arbitrário.

Seis ofertas de cuidados ativas, todas de 2 min. Ativação global de constância nula. A 6E não altera RPC, migração, validação do Pomodoro ou transação de débito. Não executar SQL, db push, migration repair ou compras para publicar a interface.

A consulta atual confirmou o saldo global e uma sessão pausada. Os valores observados foram registrados apenas no relatório local ignorado, sem incorporar snapshots de dados de contas ao commit. Nenhum minuto ou sessão foi modificado por esta conferência. Fixtures automatizadas usam bancos descartáveis, separados do remoto.

## Variáveis e bloqueios antes da publicação

Três variáveis públicas aparecem no Dashboard, atualmente compartilhadas entre Production e Preview. Seus valores estão mascarados; a tentativa de revelar somente APP_URL exigiu código por e-mail e foi cancelada, sem enviar código. Portanto **os valores atuais da Vercel não estão confirmados**. Não publicar assumindo que já estão corretos.

| Variável | Valor necessário no Preview |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | URL HTTPS do projeto de desenvolvimento `ogzgfkxhxdrwemdzxskg` |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Chave publishable/anon do mesmo projeto; nunca secret/service_role |
| NEXT_PUBLIC_APP_URL | `https://thepomins-git-codex-preview-6b-the-pomins.vercel.app` |

A configuração local foi validada sem revelar valores: URL aponta ao desenvolvimento correto, a chave legada tem papel anon e ref correspondente, APP_URL local continua localhost. Não copiar `.env.local` para Git nem fazer env pull sobre ele.

Após autorização específica, conferir/corrigir apenas o escopo Preview, preferencialmente com override de branch `codex/preview-6b`. **Não editar diretamente um valor compartilhado com Production.** Preservar Production e Development, e conferir no diálogo os escopos antes de salvar. NEXT_PUBLIC é incorporado no build; uma configuração correta depois do build exige novo Preview.

O Preview anterior já apresentou callback retornando a localhost. Esse diagnóstico histórico não prova qual é o valor atual; é uma razão adicional para conferir a origem antes do próximo build. A URL exclusiva do novo deployment ainda não existe e não deve ser inventada.

## Supabase Auth — estado efetivamente observado

No Dashboard URL Configuration, Site URL permanece `http://localhost:3000`. A lista contém **somente**:

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/auth/callback?next=/auth?mode=update`

Os callbacks HTTPS ainda estão ausentes. Após autorização específica, adicionar exatamente estes dois, preservando os anteriores e Site URL:

```text
https://thepomins-git-codex-preview-6b-the-pomins.vercel.app/auth/callback
https://thepomins-git-codex-preview-6b-the-pomins.vercel.app/auth/callback?next=/auth?mode=update
```

Não usar wildcard abrangente nem alterar regras de autenticação. Os fluxos de confirmação/recuperação devem ser abertos no mesmo navegador/perfil que os iniciou, devido ao PKCE; uma sessão Safari não é automaticamente compartilhada com o app instalado na Tela de Início.

## Procedimento após nova autorização

1. Confirmar os três valores no escopo Preview e os callbacks exatos acima. Isso exige autorização remota específica; nada foi salvo nesta preparação.
2. Confirmar novamente Production Branch main, Preview tracking e o Git ligado a `CarolGonzaga/The-Pomins`.
3. Conferir o hash 6E do relatório e `git ls-remote --heads origin`. O destino esperado do Preview é `4c5b212...`; se mudou, parar para reavaliar a ancestralidade.
4. Publicar **somente o hash imutável aprovado** para `refs/heads/codex/preview-6b`, com `git push origin HASH_6E:refs/heads/codex/preview-6b` (substituir HASH_6E pelo hash real do relatório; não executar este exemplo literalmente). Sem --force, rebase ou merge. O push pode iniciar o deployment automaticamente: a autorização deve cobrir esse efeito.
5. No Dashboard conferir ambiente Preview, commit 6E, preset Next.js, Node 24 e build Ready. Não usar --prod ou Promote. Não enviar a pasta de trabalho com envs e backups pela CLI.
6. Abrir a Branch URL confirmada `https://thepomins-git-codex-preview-6b-the-pomins.vercel.app`, registrar também a URL exclusiva gerada pelo deployment e validar o callback sem código: deve permanecer na origem HTTPS, nunca localhost. Não reutilizar a URL exclusiva antiga como se fosse o novo deployment.
7. Fazer login/recuperação com conta própria de teste. Não consumir saldo ou retomar a sessão existente apenas para testar publicação. Se o Preview estiver protegido, entrar com a conta Vercel autorizada no iPhone; não desativar a proteção automaticamente.
8. Preencher o checklist físico abaixo antes de declarar Safari/PWA aprovado. Em caso de falha, manter a versão antiga disponível, registrar o erro e preparar correção local; não desfazer migrações nem dados para recuperar a interface.

A CLI está autenticada em outro escopo e não conseguiu inspecionar a equipe the-pomins. As informações atuais de Vercel vêm do Dashboard correto; não usar vercel --yes para criar/vincular outro projeto por engano.

## Checklist de aceitação no iPhone

Registrar modelo, versão iOS/Safari, URL exata, hash do deployment, modo Safari/PWA e resultado por item. Usar conta específica para testes. Sessões de teste e qualquer gasto precisam de autorização; não utilizar a sessão pausada existente.

- [ ] Abrir a origem HTTPS no Safari; passar pela proteção Vercel se exigida e fazer login.
- [ ] Continuar o mesmo save e conferir nome, fase, geração, aparência, cenário e alinhamento do bebê.
- [ ] Conferir dial, toque central, botões alternativos, áreas seguras e leitura em retrato/paisagem; sem rolagem horizontal.
- [ ] Abrir Cuidados pela barra; ver seis ações, ícones e 2 min cada; experimentar reação gratuita sem comprar.
- [ ] Comparar o saldo com o progresso persistido, sem compras ou créditos de teste em conta existente.
- [ ] Em sessão nova autorizada de teste, iniciar foco; aguardar confirmação inicial; duração bloqueada enquanto ativa/pausada.
- [ ] Pausar explicitamente e conferir que o valor confirmado permanece fixo; retomar somente por comando.
- [ ] Navegar internamente para Menu, Regras, Configurações e Partidas e voltar: sessão continua, destino não muda e não surge segunda sessão.
- [ ] Anotar o restante antes/depois: não pode aumentar. O relógio usa somente confirmações; a primeira leitura pode aguardar cerca de cinco segundos.
- [ ] Observar Encerrar por vários heartbeats e durante retorno à tela: sem piscadas ou alternância de disabled por heartbeat.
- [ ] Mudar para outro aplicativo e retornar: interrupção segura, tempo confirmado preservado e retomada explícita.
- [ ] Bloquear/desbloquear o iPhone e repetir: nenhum tempo concedido durante ausência.
- [ ] Perder/recuperar a rede: preservar confirmação e saldo, sem conclusão indevida ou retomada automática.
- [ ] Recarregar: recuperar do servidor e retomar explicitamente, sem retrocesso da leitura confirmada.
- [ ] Safari → Compartilhar → Adicionar à Tela de Início; abrir pelo ícone. Não depender de fullscreen nativo.
- [ ] Autenticar separadamente na PWA, se necessário, e continuar o mesmo save com aparência, cuidados e saldo restaurados.
- [ ] Conferir movimento reduzido, tema claro/escuro, zoom e VoiceOver; gestos cancelados não iniciam foco acidental.
- [ ] Depois de uma conclusão autorizada, confirmar crédito único. Não comprar cuidados para testar apenas o visual.

## Riscos e limites

Safari físico e PWA no iPhone continuam pendentes. Os testes Chromium com viewport/toque de iPhone não os substituem. O timer deliberadamente espera tempo confirmado; pode haver pequena espera inicial e avanço até a confirmação exata ao pausar. A saída real do aplicativo continua interrompendo, por regra existente.

Os cuidados podem exigir rolagem em viewports baixos; a barra revela a seção escolhida. A ilustração anexada na consolidação é referência posterior à implementação e não representa o resultado pixel a pixel desta versão. Nenhum recurso artístico novo foi incorporado nesta consolidação.

Documentação: [ambientes Vercel](https://vercel.com/docs/deployments/environments), [redirecionamentos Supabase](https://supabase.com/docs/guides/auth/redirect-urls), [relatório 6E](NURSERY_FOCUS_6E.md), [checklist iOS existente](IOS_TEST_CHECKLIST.md).

## Validação repetida nesta consolidação

Lint, TypeScript e build aprovados. Foram executados 227 testes locais, 53 testes em PostgreSQL descartável e 113 testes de navegador: **393 aprovados**. Um caso de toque foi ignorado no projeto desktop e executado no projeto mobile. Os 53 casos PostgreSQL ficam ignorados na execução padrão, mas foram executados nos três runners isolados (25 + 17 + 11); não são testes pendentes. Os backups sintéticos de duas suítes foram restaurados e comparados. O build foi feito em cópia isolada, com ambiente sintético e fontes conferidas por hash, preservando o build/servidor real. Nenhum teste de navegador desta consolidação usou contas reais.
