# Checklist iPhone · execução física pendente

Emulação de tamanho/toque não substitui Safari, WebKit real ou hardware. Nenhum item físico abaixo foi marcado como aprovado.

## Roteiro 6A (executar em aba Safari e repetir no app instalado)

Registrar modelo, versão iOS/Safari, URL HTTPS, build/commit, data e resultado de cada passo. Usar conta e partidas de teste próprias; anotar saldo e sessão existente antes de começar. Não encerrar uma sessão real para preparar o ensaio. Não incluir senhas, links PKCE ou tokens nas evidências.

1. Abrir a origem HTTPS confiável. Fazer login, abrir Menu → Regras (seis etapas) → Configurações → Partidas. Confirmar preferências após recarga e novo login; usar os fluxos de confirmação para mudanças sensíveis.
2. Conferir retrato com barra de endereço expandida e recolhida; girar para paisagem e voltar. Abrir o teclado em login, nome da partida e duração; alcançar campo e botão sem rolagem horizontal. Fechar teclado, ampliar texto/zoom e testar movimento reduzido, tema claro/escuro/sistema e recortes superior/inferior.
3. Abrir uma partida de bebê e uma de adulto. Alternar todos os painéis. Conferir prévia/roupas, caminhada, leitura, repouso, cuidados, histórico e saldo. Voltar às partidas e repetir três vezes: um único mundo por vez, sem estado do morador anterior. Cuidados gratuitos não gastam minutos.
4. Ajustar o foco na borda nos dois sentidos; testar 2/120 min, cruzar a emenda, retirar o dedo, cancelar com gesto do sistema e tentar um toque curto. Arrastar no centro não deve iniciar. Testar mais/menos e entrada numérica. Com teclado externo/VoiceOver, conferir nome e valor do slider, botões, etapas do tutorial e anúncio de erros. A preferência padrão não deve mudar ao girar.
5. Iniciar uma sessão de teste de 2 minutos. Abrir painéis sem criar outro cronômetro. Conferir bloqueio de duração ativa e pausada. Pausar e retomar; anotar somente tempo confirmado. Sem concluir ainda, testar bloqueio de tela, troca de app, Central de Controle e retorno: retomada manual, sem crédito do intervalo ausente.
6. Repetir interrupção com modo avião/Wi-Fi oscilante e uma requisição sem resposta; reconectar e recuperar. Conferir que aviso não cobre cuidados/controles, nada retoma automaticamente e nenhuma recompensa aparece offline. Recarregar, testar segunda aba e autenticação expirada, preservando os limites de uma sessão por conta.
7. Concluir uma sessão real mantendo o app visível. Registrar saldo antes/depois, distribuir um minuto na atividade escolhida, recarregar, sair/entrar e confirmar histórico/aparência/progresso. Repetir solicitação/recarga não deve duplicar créditos ou alocação. Não usar relógio acelerado como evidência desse passo.
8. No Safari: Compartilhar → Adicionar à Tela de Início; habilitar abrir como app da web quando disponível. Abrir pelo ícone e repetir passos críticos de login, retorno do background, layout e foco. Registrar separadamente o comportamento da aba e do app instalado.
9. Abrir sem rede: fallback legível, sem progresso offline. Após reconectar, verificar recuperação. Com uma versão nova disponível, conferir que o aviso não cobre controles e a atualização não recarrega durante foco ativo; pausar explicitamente antes de aplicar.

Não aprovar quando houver campo inacessível, foco involuntário, saldo divergente, restauração incorreta, interação impossível com VoiceOver ou sobreposição sobre controles. Registrar vídeo curto ou captura sem dados privados e repetir após a correção. Em telas curtas o layout atual pode precisar de rolagem vertical; verificar se isso é confortável no dispositivo antes de aprovar a UX.

## Registro físico (todos pendentes)

- [ ] iPhone / versão iOS / data / URL HTTPS registrados.
- [ ] Safari: cadastro, confirmação de e-mail, login e recuperação/redirecionamento PKCE.
- [ ] Adicionar à Tela de Início; ícone, nome, standalone e safe areas corretos.
- [ ] PWA reabre com sessão Auth persistida; zoom e teclado não escondem campos.
- [ ] Criação humano e alienígena, prévia e nascimento em 320/375/390/430px.
- [ ] Foco de dois minutos com heartbeat: XP uma única vez; recarga não duplica.
- [ ] Troca de aplicativo / Central de Controle / ligação / bloqueio de tela pausam.
- [ ] Retorno exige retomada manual; preserva somente tempo confirmado.
- [ ] Wake Lock disponível: solicitado; revogação detectada; nova tentativa ao retomar.
- [ ] Wake Lock indisponível/economia de energia: informa a limitação sem prometer tela ligada.
- [ ] Modo avião / Wi-Fi oscilante / requisição perdida: interrompe; sem crédito do tempo sem confirmação.
- [ ] Duas abas: uma sessão por conta; recuperação revoga lease antiga.
- [ ] Safari encerrado pelo sistema, PWA fechada e autenticação expirada: recuperação segura.
- [ ] Mudança de hora local não concede tempo extra.
- [ ] Atualização do worker mostra aviso e aguarda pausa antes de aplicar.
- [ ] VoiceOver: nomes de controles, foco do teclado, narrativa completa, sem anúncio contínuo do timer.
- [ ] Tema escuro / movimento reduzido / texto ampliado / áreas de toque.
- [ ] Offline abre fallback legível; dados pessoais não aparecem no cache.
