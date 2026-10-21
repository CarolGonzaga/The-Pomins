# PROMPT MESTRE PARA CODEX
# DESENVOLVIMENTO DE JOGO NARRATIVO DE VIDA, GERAÇÕES E PRODUTIVIDADE

## 0. MISSÃO PRINCIPAL

Você atuará como uma equipe sênior multidisciplinar responsável por desenvolver uma aplicação web completa, original, segura, escalável e visualmente refinada.

A aplicação será um jogo de simulação de vida com narrativa interativa, personagens humanos e alienígenas, personalização visual, relacionamentos, famílias, sucessão de gerações e progressão baseada em sessões reais de concentração.

O produto combinará quatro conceitos:

1. **Aplicativo de foco:** sessões Pomodoro e temporizadores que incentivam o início de tarefas.
2. **Visual novel:** narrativa apresentada por ilustrações, diálogos e escolhas com consequências.
3. **Life simulator:** nascimento, infância, adolescência, vida adulta, relacionamentos, carreiras, famílias e legado.
4. **Gamificação social:** experiência, moedas, conquistas, desafios, ligas e rankings competitivos balanceados.

A aplicação deve funcionar como uma PWA Mobile First, priorizando iPhone e Safari, com hospedagem na Vercel e Supabase como plataforma de backend.

**O objetivo é entregar software funcional, não somente um protótipo estático, documentação ou telas demonstrativas.**

### Equipe técnica que você deve representar

Assuma simultaneamente as responsabilidades de:

- Product Manager
- Game Designer
- Narrative Designer
- Software Architect
- Full Stack Engineer
- React / Next.js Specialist
- Supabase / PostgreSQL Engineer
- PWA / Safari iOS Specialist
- UI/UX Designer
- 2D Character System Designer
- Accessibility Engineer
- Security Engineer
- QA Automation Engineer

Tome decisões arquiteturais fundamentadas, documente compromissos e preserve a capacidade de expansão do produto.

### Instruções operacionais

- Analise o repositório antes de modificar arquivos.
- Se estiver vazio, inicialize o projeto completo.
- Consulte as versões estáveis e compatíveis das bibliotecas.
- Crie um plano de implementação por fases.
- Registre tarefas e critérios de aceite.
- Implemente código efetivamente.
- Execute comandos de validação.
- Corrija problemas encontrados.
- Não declare funcionalidades concluídas sem testes.
- Não substitua integrações reais por mocks permanentes.
- Não invente credenciais ou resultados de testes.
- Não implemente serviços pagos obrigatórios.
- Não utilize Python.
- Não inclua chaves secretas no código-fonte.
- Não realize operações destrutivas em produção sem autorização explícita.
- Não interrompa o trabalho por escolhas triviais de design: utilize decisões coerentes com esta especificação.
- Se faltarem credenciais, continue todas as etapas que puder e documente exatamente o bloqueio.

Criar uma aplicação em português brasileiro, mas organizar o código para futura internacionalização.

---

# 1. VISÃO DE PRODUTO

## 1.1 Conceito

O usuário começa sua experiência criando um personagem que nascerá como bebê.

Ele poderá escolher inicialmente entre duas origens:

- Humano.
- Alienígena.

A aparência será personalizada antes do nascimento.

Após a personalização, uma introdução narrativa apresentará o nascimento da personagem e seu universo inicial.

A partir desse momento, sessões de foco validado gerarão recursos de desenvolvimento.

Esses recursos permitirão desbloquear acontecimentos, capítulos, fases da vida, características, roupas, ambientes e novas possibilidades narrativas.

O personagem crescerá progressivamente:

Nascimento → Infância → Adolescência → Jovem adulto → Adulto → Idoso → Legado.

Na vida adulta, poderá desenvolver carreira, conhecer pessoas, construir relacionamentos, formar uma família, ter ou adotar filhos e tomar decisões que influenciarão as próximas gerações.

Quando uma vida chegar à conclusão, o usuário poderá selecionar um sucessor e iniciar um novo ciclo.

A história e a árvore genealógica permanecerão salvas permanentemente.

## 1.2 Proposta de valor

Transformar o ato de começar e manter uma atividade em uma experiência de progresso narrativo.

A pessoa não precisa trabalhar para evitar punições ou cuidar de um personagem que depende constantemente dela.

A recompensa será descobrir o próximo capítulo de uma história pessoal construída ao longo do tempo.

O produto deve ser acolhedor para pessoas com dificuldades de iniciar tarefas, incluindo usuários com TDAH, sem realizar promessas clínicas.

## 1.3 Princípio fundamental

**O foco desbloqueia a história. A história nunca interrompe o foco.**

Nenhum acontecimento narrativo pode interromper automaticamente uma sessão ativa.

Se três capítulos forem desbloqueados durante um período de trabalho, eles ficam disponíveis para leitura posterior.

O usuário pode receber suas recompensas e continuar trabalhando sem abrir a narrativa.

---

# 2. PLATAFORMA E TECNOLOGIAS

## 2.1 Stack principal

Frontend:

- Next.js com App Router.
- React.
- TypeScript strict.
- Tailwind CSS.
- shadcn/ui.
- Lucide Icons.
- Motion para animações leves.
- Zod para validações.
- React Hook Form para formulários.
- Zustand apenas quando estado compartilhado realmente justificar.
- Biblioteca de gráficos leve e responsiva, quando necessário.

Backend:

- Supabase PostgreSQL.
- Supabase Auth.
- Supabase Storage.
- Supabase Realtime quando aplicável.
- Supabase Edge Functions ou rotas seguras do Next.js.
- PostgreSQL RPC e transações para operações críticas.
- Supabase Cron para tarefas agendadas, quando necessário.

Narrativa:

- Avaliar Ink + inkjs.
- Alternativamente, implementar um motor declarativo JSON tipado.
- Justificar a escolha na documentação.
- O mecanismo escolhido deve suportar variáveis, condições, escolhas, capítulos, retomada e versionamento.
- Regras de desbloqueio e recompensas devem ser validadas no servidor, nunca exclusivamente pelo interpretador do cliente.

Infraestrutura:

- GitHub.
- Vercel.
- Supabase.
- HTTPS.
- PWA com Service Worker.

Testes:

- Vitest.
- React Testing Library.
- Playwright.
- Testes SQL para RLS.
- GitHub Actions.

Evitar serviços pagos em runtime.

Não depender de modelos de IA para gerar diálogos durante o uso da aplicação.

## 2.2 Arquitetura

Utilizar separação clara entre:

- Interface.
- Identidade e autenticação.
- Motor de foco.
- Motor narrativo.
- Motor de progressão.
- Sistema de personagens.
- Sistema de relacionamentos.
- Sistema familiar.
- Economia.
- Competição.
- Persistência.
- Administração de conteúdo.

Regras de negócio devem ser reutilizáveis e independentes da apresentação visual.

Não criar toda a lógica em componentes React.

Não depender de estado global mutável no servidor.

Considerar as características serverless da Vercel.

---

# 3. DIREÇÃO ARTÍSTICA

## 3.1 Identidade visual

Criar uma identidade original de jogo narrativo cozy.

A estética deve combinar:

- Visual novel.
- Ilustração digital 2D.
- Personagens chibi ou semi-chibi.
- Elementos de fantasia leve.
- Interfaces modernas de jogos mobile.
- Paleta pastel sofisticada.
- Cenários acolhedores.
- Sensação de história em quadrinhos ou novela ilustrada.

Evitar:

- Pixel art predominante.
- Modelos 3D.
- Personagens caminhando livremente por mapas.
- Cenários 3D navegáveis.
- Animação corporal quadro a quadro complexa.
- Interface genérica de dashboard.
- Personagens visualmente inconsistentes.
- Excesso de partículas e efeitos.

## 3.2 Paleta inicial

Usar como referência:

- Fundo principal: #F8F5F0.
- Superfícies: #FFFDF9.
- Lavanda: #B6A0E0.
- Rosa suave: #E7AEC1.
- Verde menta: #A8C7A1.
- Azul pastel: #A5C9E8.
- Amarelo suave: #F3D48D.
- Texto principal: #403933.
- Texto secundário: #81786F.

Criar design tokens e temas claro e escuro.

Garantir contraste acessível.

## 3.3 Tipografia

Usar fontes gratuitas e legíveis.

Diferenciar visualmente:

- Títulos.
- Narrador.
- Nome do personagem.
- Diálogos.
- Escolhas.
- Recompensas.
- Temporizador.
- Valores.
- Informações secundárias.

O texto da narrativa precisa ser confortável para leitura prolongada no celular.

## 3.4 Componentes

Criar:

- Botões principais.
- Botões secundários.
- Cards.
- Diálogos.
- Bottom sheets.
- Modais.
- Toasts.
- Inputs.
- Selects.
- Tabs.
- Progress bars.
- Indicadores de XP.
- Cards de acontecimentos.
- Retratos.
- Cards de relacionamento.
- Cards de personagens.
- Cards de família.
- Árvore genealógica.
- Cards de ranking.
- Skeletons.
- Empty states.
- Error states.

Não utilizar emojis como elementos definitivos de personagens.

---

# 4. MOBILE FIRST E IPHONE

A experiência será desenvolvida primeiro para smartphone.

O caso principal será o usuário iniciar o foco no iPhone e trabalhar em outro dispositivo, geralmente um computador.

## 4.1 Compatibilidade

Priorizar:

- Safari no iPhone.
- PWA instalada na tela inicial.
- Telas de aproximadamente 320 a 430 pixels de largura.
- iPhones com Dynamic Island.
- Safe areas superiores e inferiores.
- Barra de gestos.
- Teclado virtual.
- Orientação vertical.
- Variações de viewport.
- Leitores de tela.
- Controle por toque.

Suportar tablets e desktop de forma responsiva.

Não bloquear zoom.

Evitar áreas clicáveis pequenas.

## 4.2 PWA

Implementar:

- Manifest.
- Ícones.
- Apple touch icon.
- Display standalone.
- Theme color.
- Service Worker.
- Cache de assets estáticos.
- Tela offline.
- Controle de atualização.
- Indicador de nova versão.
- Persistência de sessão autenticada.

## 4.3 Wake Lock

Implementar a Screen Wake Lock API quando suportada.

O sistema deve:

- Solicitar Wake Lock ao iniciar foco.
- Detectar indisponibilidade.
- Detectar revogação.
- Liberar ao encerrar.
- Tentar recuperar quando permitido.
- Comunicar claramente quando o recurso não estiver ativo.

Não prometer tela sempre ligada em dispositivos incompatíveis.

## 4.4 Economia de bateria

As cenas de foco devem possuir animações mínimas.

Reduzir FPS e efeitos quando necessário.

Respeitar `prefers-reduced-motion`.

Não renderizar cenas complexas quando a página estiver oculta.

---

# 5. AUTENTICAÇÃO

Utilizar Supabase Auth.

Implementar:

- Cadastro com e-mail e senha.
- Confirmação de senha.
- Validação de e-mail.
- Login.
- Logout.
- Recuperação de senha.
- Redefinição de senha.
- Persistência de sessão.
- Proteção de rotas.
- Exclusão de conta.
- Configurações de privacidade.

Cada usuário possui um nickname público único.

Usar identificadores UUID internamente.

Não expor e-mail no ranking ou nos perfis públicos.

Tratar fluxos de autenticação corretamente no Next.js App Router.

Aplicar configurações SSR adequadas e validação de identidade no backend.

---

# 6. ONBOARDING

Criar um onboarding curto, acolhedor e visualmente atraente.

Fluxo:

1. Boas-vindas.
2. Explicação breve do universo.
3. Escolha entre humano e alienígena.
4. Personalização do personagem.
5. Escolha do nome.
6. Prévia da aparência.
7. Confirmação do nascimento.
8. Cena narrativa introdutória.
9. Apresentação do foco.
10. Primeira sessão de dois minutos.

Não exigir que o usuário configure profissão, romance, família ou dezenas de atributos durante o cadastro.

Começar rapidamente.

Permitir editar características cosméticas posteriormente.

---

# 7. CRIADOR DE PERSONAGENS

Desenvolver um sistema modular de personagens 2D baseado em camadas visuais.

Este sistema é fundamental para viabilizar humanos, alienígenas e futuras gerações com esforço artístico reduzido.

## 7.1 Espécies iniciais

- Humano.
- Alienígena.

Preparar estrutura para múltiplas subespécies alienígenas futuras.

## 7.2 Personalização humana

Oferecer opções de:

- Tom de pele.
- Formato de rosto.
- Olhos.
- Cor dos olhos.
- Sobrancelhas.
- Boca.
- Nariz.
- Cabelo.
- Cor do cabelo.
- Textura do cabelo.
- Estilo de cabelo.
- Roupas.
- Acessórios.

Não limitar tons de pele humanos a poucas opções estereotipadas.

Oferecer uma paleta diversa e consistente, preferencialmente com várias tonalidades bem ilustradas e testadas.

Não associar personalidade, inteligência, moralidade ou habilidades a características físicas.

## 7.3 Personalização alienígena

Oferecer opções de:

- Cor de pele.
- Tonalidades incomuns.
- Formato de olhos.
- Cor dos olhos.
- Antenas.
- Orelhas.
- Marcas faciais.
- Características especiais.
- Padrões corporais.
- Cabelos ou ausência de cabelo.
- Roupas.
- Acessórios.

Estruturar características por compatibilidade entre espécies.

## 7.4 Identidade e apresentação

Separar os atributos:

- Espécie.
- Aparência.
- Identidade de gênero.
- Pronomes.
- Expressão de gênero.
- Preferências românticas.
- Personalidade.

Não deduzir gênero, orientação ou identidade com base em aparência, corpo ou roupa.

Permitir diferentes pronomes e construções narrativas adequadas.

Não exigir que todas as escolhas sejam definidas no nascimento.

## 7.5 Camadas visuais

Usar composição visual com elementos como:

- Silhueta.
- Corpo.
- Pescoço.
- Cabeça.
- Orelhas.
- Antenas.
- Olhos.
- Pálpebras.
- Sobrancelhas.
- Nariz.
- Boca.
- Cabelo traseiro.
- Cabelo frontal.
- Roupa.
- Acessórios.
- Marcas especiais.

Definir ordem de renderização.

Implementar âncoras e offsets.

Garantir que as camadas permaneçam alinhadas em todas as combinações válidas.

## 7.6 Formatos visuais

Cada personagem deve poder ser exibido em:

- Retrato de diálogo.
- Meio corpo.
- Corpo inteiro estático.
- Miniatura.
- Avatar circular.
- Cartão de relacionamento.
- Árvore genealógica.

Reutilizar os mesmos atributos de aparência.

Não criar arquivos separados para todas as combinações possíveis.

## 7.7 Variação por idade

Representar as fases com conjuntos de proporções e componentes próprios:

- Bebê.
- Criança.
- Adolescente.
- Adulto.
- Idoso.

Reutilizar cores e características herdadas.

A aparência deve continuar reconhecível após o envelhecimento.

Planejar o sistema para que um atributo de aparência tenha uma representação adequada em cada idade.

---

# 8. ANIMAÇÃO SIMPLIFICADA

A aplicação não será um jogo de movimentação livre.

Usar apresentação de visual novel.

## 8.1 Animações permitidas

Priorizar:

- Fade in.
- Fade out.
- Deslizamento lateral.
- Pequenas alterações de escala.
- Piscar.
- Alteração de expressão.
- Respiração sutil.
- Pequena inclinação.
- Tremor discreto.
- Partículas pontuais.
- Transição de cenário.
- Efeito de revelação.
- Efeito de passagem de tempo.

Implementar com CSS e Motion.

Evitar introduzir PixiJS, Phaser ou motores grandes sem necessidade real.

## 8.2 Expressões

Criar sistema de expressões reutilizáveis:

- Neutro.
- Feliz.
- Triste.
- Surpreso.
- Irritado.
- Envergonhado.
- Pensativo.
- Preocupado.
- Apaixonado.
- Cansado.

As expressões devem reutilizar camadas de olhos, sobrancelhas e boca.

## 8.3 Sistema de cenas

Cada cena poderá definir:

- Background.
- Personagem esquerdo.
- Personagem central.
- Personagem direito.
- Expressões.
- Diálogo.
- Efeitos.
- Trilha opcional.
- Opções de resposta.
- Transições.

Evitar animações longas que atrasem a leitura.

Permitir reduzir ou pular transições.

## 8.4 Assets provisórios

Se não houver imagens finais, desenvolver um conjunto original de personagens vetoriais simples, mas apresentáveis.

Não usar imagens aleatórias da internet.

Criar documentação que permita substituir assets provisórios sem reescrever componentes.

Não declarar a arte final concluída quando houver placeholders.

---

# 9. MOTOR DE FOCO

Este é o sistema de maior prioridade técnica.

## 9.1 Durações

Oferecer:

- 2 minutos.
- 5 minutos.
- 10 minutos.
- 15 minutos.
- 25 minutos.
- 50 minutos.
- Duração personalizada dentro de limites definidos.

O modo de dois minutos deve ser destacado como "Só começar".

## 9.2 Estados

Definir máquina de estados:

- idle
- starting
- active
- paused
- interrupted
- completing
- completed
- cancelled
- expired

Impedir transições inválidas.

## 9.3 Modo estrito

Somente o modo estrito será implementado.

O tempo deverá ser pausado quando a página deixar de estar visível ou perder as condições exigidas de execução.

Utilizar:

- Page Visibility API.
- `visibilitychange`.
- `pagehide`.
- `pageshow`.
- Sinais complementares de foco da janela.
- Heartbeats.
- Relógio do servidor.
- Controle de expiração.
- Verificação de autenticação.
- Monitoramento de conectividade.

O iPhone será o dispositivo de foco, enquanto o usuário poderá trabalhar normalmente no computador.

## 9.4 Regra de segurança

Nenhuma informação enviada pelo frontend pode ser tratada como prova absoluta de trabalho.

O servidor valida os intervalos elegíveis.

Não confiar em minutos enviados diretamente pelo cliente.

Não utilizar o cronômetro visual como fonte de verdade.

Não contabilizar integralmente períodos sem confirmação.

Não permitir sessões concorrentes inconsistentes.

## 9.5 Heartbeats

Criar heartbeats periódicos durante o estado ativo.

Sugestão inicial: cinco segundos.

Implementar:

- Sequência de mensagens.
- Timestamps do servidor.
- Idempotência.
- Timeout.
- Tolerância pequena de rede.
- Deduplicação.
- Rejeição de mensagens atrasadas.
- Proteção contra duplicação de recompensas.
- Recuperação de estado.
- Limitação de frequência.

Documentar as limitações da validação baseada em sinais do navegador.

## 9.6 Interrupções

Tratar:

- Troca de aplicativo.
- Bloqueio de tela.
- Ligação.
- Minimização.
- Suspensão do Safari.
- Perda de Wake Lock.
- Queda de conexão.
- Fechamento da PWA.
- Recarregamento.
- Alteração do relógio local.
- Expiração de autenticação.
- Múltiplas abas.
- Requisições duplicadas.

Ao retornar, apresentar a sessão pausada, oferecendo retomada manual.

O tempo já validado permanece preservado.

## 9.7 Tela de foco

Exibir:

- Retrato do personagem ativo.
- Nome da atividade.
- Cronômetro.
- Progresso.
- Estado da sessão.
- Botão de pausar.
- Botão de encerrar.
- Indicação de tela ativa, quando apropriado.

O personagem pode possuir uma animação muito discreta, como respirar ou piscar.

Não mostrar diálogos da história.

Não mostrar novas opções narrativas durante a contagem.

Não abrir a loja ou ranking automaticamente.

## 9.8 Recompensas

Após validar uma sessão:

- Registrar tempo válido.
- Conceder XP de conta.
- Conceder XP de vida.
- Conceder moedas.
- Conceder energia narrativa.
- Calcular pontos competitivos.
- Atualizar estatísticas.
- Verificar conquistas.
- Verificar marcos de idade.
- Desbloquear histórias.
- Registrar recompensas.
- Exibir resumo.

Todas as recompensas devem ser idempotentes.

A operação não pode premiar duas vezes uma mesma sessão.

---

# 10. SISTEMA DE PROGRESSÃO

Separar progressão pessoal, narrativa e competitiva.

## 10.1 XP da conta

Representa a experiência total do usuário.

É permanente.

Não desaparece ao mudar de geração.

## 10.2 XP da vida

Representa o desenvolvimento do personagem atual.

Determina acesso a marcos de vida.

Não deve ser utilizado como pontuação competitiva.

## 10.3 Energia narrativa

É obtida com foco validado.

Permite desbloquear acontecimentos elegíveis.

Não deve obrigar o usuário a consumir o recurso imediatamente.

## 10.4 Moedas

Utilizadas para:

- Roupas.
- Acessórios.
- Decorações.
- Cosméticos.
- Personalizações especiais.

## 10.5 Pontos competitivos

Utilizados exclusivamente em rankings e temporadas.

Não podem ser comprados.

Não podem ser transferidos.

## 10.6 Balanceamento

Centralizar todas as regras de ganho e consumo.

Criar configuração versionada.

Evitar constantes de balanceamento espalhadas pelo código.

---

# 11. FASES DA VIDA

O envelhecimento dependerá de foco validado e marcos narrativos.

Não envelhecer personagens automaticamente com o passar dos dias reais.

## 11.1 Fases iniciais

Sugestão configurável:

| Fase | Foco acumulado |
|---|---|
| Recém-nascido | 0–1 hora |
| Bebê | 1–4 horas |
| Criança | 4–12 horas |
| Adolescente | 12–25 horas |
| Jovem adulto | 25–45 horas |
| Adulto | 45–75 horas |
| Idoso | 75–90 horas |

Esses valores são parâmetros iniciais, não regras imutáveis.

Usar progressão de marcos.

Quando o usuário atingir o tempo necessário, a próxima fase poderá ser desbloqueada por uma cena narrativa.

Não forçar o avanço durante uma sessão de foco.

## 11.2 Ritmo narrativo

Cada fase deve possuir acontecimentos próprios.

Evitar períodos longos em que o usuário apenas acumula pontos sem desbloquear nada.

Oferecer pequenas recompensas e acontecimentos entre marcos maiores.

## 11.3 Conclusão de uma vida

Não provocar morte automática por abandono.

Quando a personagem completar sua trajetória, oferecer uma conclusão narrativa.

Permitir escolher quando iniciar a próxima geração.

Criar registros permanentes de sua vida.

Não apagar automaticamente o personagem anterior.

---

# 12. MOTOR NARRATIVO

Construir um sistema genérico, escalável e baseado em dados.

## 12.1 Estrutura

Entidades narrativas:

- Histórias.
- Arcos.
- Capítulos.
- Cenas.
- Diálogos.
- Escolhas.
- Condições.
- Efeitos.
- Variáveis.
- Eventos.
- Marcos de vida.
- Memórias.
- Consequências.

## 12.2 Cena

Cada cena deve suportar:

- Identificador estável.
- Versão do conteúdo.
- Título.
- Cenário.
- Participantes.
- Expressões.
- Narrador.
- Texto.
- Transições.
- Escolhas.
- Condições de entrada.
- Consequências.
- Próxima cena.

## 12.3 Escolhas

Cada escolha pode alterar:

- Personalidade.
- Afinidade.
- Amizades.
- Romance.
- Carreira.
- Recursos.
- Memórias.
- Flags narrativas.
- Eventos futuros.
- Relações familiares.

Não permitir opções que produzam estados impossíveis.

## 12.4 Persistência

Registrar:

- Cena atual.
- Versão do capítulo.
- Decisões tomadas.
- Variáveis relevantes.
- Histórico de eventos.
- Capítulos concluídos.
- Capítulos disponíveis.
- Capítulos pendentes.

Atualizações do jogo não podem corromper histórias em andamento.

Criar estratégia de versionamento e migração de narrativas.

## 12.5 Segurança das escolhas

O frontend pode apresentar escolhas, mas o backend deve validar:

- Se o capítulo está desbloqueado.
- Se a cena pertence ao estado atual.
- Se a opção existe.
- Se as condições são atendidas.
- Se a decisão ainda não foi registrada.
- Se os recursos necessários estão disponíveis.
- Se a transição é válida.

A aplicação não pode permitir que o usuário envie arbitrariamente uma escolha com efeito de ganhar milhões de moedas ou desbloquear capítulos.

Aplicar consequências em transações seguras.

## 12.6 Qualidade narrativa

Escrever em português brasileiro natural.

Priorizar:

- Diálogos orgânicos.
- Personagens com personalidade.
- Humor leve.
- Afeto.
- Conflitos cotidianos.
- Escolhas significativas.
- Consequências compreensíveis.
- Coerência emocional.
- Variedade de trajetórias.

Evitar diálogos excessivamente artificiais e repetitivos.

Não utilizar textos genéricos como conteúdo final.

---

# 13. CONTEÚDO NARRATIVO INICIAL

Criar uma história de demonstração completa e jogável, que cubra uma vida e permita iniciar uma segunda geração.

O conteúdo inicial deve funcionar para um protagonista humano ou alienígena sem inconsistências.

## 13.1 Prólogo

- Criação do personagem.
- Introdução do universo.
- Nascimento.
- Primeiro vínculo familiar.
- Primeira memória.

## 13.2 Infância

- Primeira descoberta.
- Novo amigo.
- Interesse ou talento.
- Pequena decisão familiar.
- Primeiro objetivo.

## 13.3 Adolescência

- Formação de identidade.
- Escolha de interesse.
- Amizade importante.
- Dilema pessoal.
- Decisão sobre caminhos futuros.

## 13.4 Vida adulta

- Primeira oportunidade profissional.
- Mudança importante.
- Relacionamento opcional.
- Construção de vida independente.
- Decisão com consequência duradoura.

## 13.5 Família

- Formação opcional de parceria.
- Possibilidade de compromisso.
- Filho, adoção ou escolha de sucessor.
- Momento familiar marcante.

## 13.6 Legado

- Conclusão da trajetória.
- Álbum de memórias.
- Estatísticas da vida.
- Escolha da próxima geração.
- Introdução ao novo protagonista.

Cada fase deve apresentar escolhas reais e efeitos persistidos.

Preparar múltiplos caminhos sem tentar criar uma quantidade infinita de narrativas na primeira versão.

---

# 14. SISTEMA DE PERSONALIDADE

Cada personagem possui traços narrativos configuráveis.

Exemplos:

- Curiosidade.
- Coragem.
- Empatia.
- Criatividade.
- Ambição.
- Sociabilidade.
- Independência.

Representar atributos numericamente quando fizer sentido, com limites definidos.

Não atrelar automaticamente traços psicológicos à espécie, cor da pele ou características físicas.

As escolhas alteram esses atributos.

Os atributos podem:

- Desbloquear diálogos.
- Modificar reações.
- Abrir oportunidades.
- Alterar resultados.
- Influenciar interesses.

Evitar definir personalidade de forma determinística e rígida.

A pessoa deve continuar podendo escolher diferentes caminhos.

---

# 15. NPCs E RELACIONAMENTOS

Criar um sistema de personagens secundários.

NPCs devem possuir:

- ID.
- Nome.
- Espécie.
- Aparência.
- Faixa etária.
- Personalidade.
- Histórico.
- Papel narrativo.
- Relações.
- Disponibilidade de arcos.
- Condições de romance, quando aplicável.

## 15.1 Tipos de relação

- Familiar.
- Amizade.
- Colega.
- Rivalidade leve.
- Romance.
- Parceria.
- Parentalidade.
- Tutoria.

## 15.2 Afinidade

Criar pontuação de afinidade ou modelo equivalente.

As decisões podem fortalecer ou enfraquecer relações.

A afinidade não deve substituir escolhas explícitas.

Relacionamentos românticos precisam de consentimento narrativo e coerência.

## 15.3 Romance

Permitir relacionamentos entre personagens adultos elegíveis.

Não restringir romances exclusivamente a casais heterossexuais.

Permitir casais do mesmo gênero e diferentes identidades.

Usar preferências românticas configuradas para personagens e NPCs.

Não impor casamento como objetivo obrigatório.

## 15.4 Famílias diversas

Apoiar:

- Casais de diferentes gêneros.
- Pessoas solteiras.
- Famílias por adoção.
- Filhos biológicos.
- Famílias reconstituídas.
- Sucessores por vínculo familiar escolhido.

Não exigir reprodução biológica para progressão.

Não tratar a ausência de casamento ou filhos como fracasso.

## 15.5 Restrições

Não criar mecânicas sexualizadas envolvendo menores.

Romances envolvendo personagens menores, se existirem, devem permanecer em conteúdo apropriado à idade.

Decisões de casamento, parentalidade e reprodução devem pertencer apenas às fases adultas apropriadas.

---

# 16. SISTEMA DE GERAÇÕES

Este é um dos recursos centrais do produto.

## 16.1 Identidade geracional

Cada vida deve possuir:

- UUID.
- Usuário proprietário.
- Identificador de família.
- Número da geração.
- Espécie.
- Atributos cosméticos.
- Personalidade.
- Fase atual.
- Histórico de decisões.
- Relações.
- Memórias.
- Conquistas.
- Estado de vida.
- Referência de sucessão.

## 16.2 Família

Implementar estrutura que suporte:

- Pais.
- Filhos.
- Pais adotivos.
- Parceiros.
- Ancestrais.
- Descendentes.
- Outros vínculos familiares.

Usar tabelas de relações para representar diferentes estruturas familiares.

Não presumir que toda personagem terá exatamente um pai e uma mãe.

## 16.3 Hereditariedade

Criar sistema configurável de herança cosmética.

Características possíveis:

- Espécie.
- Tom ou cor da pele.
- Olhos.
- Cor dos olhos.
- Tipo de cabelo.
- Cor do cabelo.
- Formato facial.
- Antenas.
- Marcas alienígenas.
- Características especiais.

Para descendentes biológicos, produzir variações a partir de atributos elegíveis dos responsáveis genéticos.

Para personagens adotados, gerar atributos próprios, sem vincular aparência à família adotiva.

Evitar apresentar uma simulação simplificada como genética humana cientificamente precisa.

Tratar as regras como hereditariedade estilizada de jogo.

## 16.4 Humanos e alienígenas

Definir regras claras para:

- Humanos com humanos.
- Alienígenas da mesma espécie.
- Alienígenas de espécies diferentes.
- Possíveis híbridos humano-alienígenas.

Para reduzir complexidade, híbridos podem ser preparados na arquitetura e ativados somente quando houver assets visuais compatíveis.

Não gerar combinações que o renderizador não consegue representar.

## 16.5 Sucessão

Quando uma geração termina:

- Validar elegibilidade do sucessor.
- Registrar conclusão da vida atual.
- Criar ou ativar próxima geração.
- Preservar genealogia.
- Preservar histórico.
- Transferir apenas recursos permitidos.
- Atualizar contador geracional.
- Desbloquear prólogo seguinte.

A sucessão deve ocorrer em transação segura.

Impedir sucessões duplicadas.

## 16.6 Legado

Guardar:

- Principais conquistas.
- Profissões.
- Pessoas importantes.
- Relacionamentos.
- Descendentes.
- Decisões marcantes.
- Memórias.
- Marcos especiais.
- Tempo dedicado à geração.

Criar uma interface de álbum familiar.

## 16.7 Árvore genealógica

Desenvolver visualização responsiva.

No mobile:

- Permitir navegação por gerações.
- Expandir e recolher ramos.
- Visualizar fichas dos personagens.
- Exibir relações por símbolos e labels.
- Evitar árvore horizontal impossível de navegar.

Em desktop, permitir visualização expandida.

---

# 17. CARREIRAS E OBJETIVOS

Implementar um sistema inicial simplificado.

Carreiras não devem exigir minijogos complexos.

Criar profissões narrativas com:

- Identificador.
- Nome.
- Descrição.
- Condições.
- Eventos.
- Progressão.
- Recompensas.
- Escolhas.

Exemplos:

- Artista.
- Cientista.
- Professora.
- Exploradora.
- Comunicadora.
- Pesquisadora espacial.

A profissão pode influenciar capítulos e oportunidades.

Evitar simulação financeira complexa no MVP.

O sistema precisa ser expansível.

---

# 18. CENÁRIOS E UNIVERSO

Criar um universo original com dois tipos iniciais de ambientação:

- Comunidades humanas contemporâneas.
- Comunidades alienígenas de fantasia científica acolhedora.

Não criar um mapa aberto navegável.

Usar cenários ilustrados estáticos:

- Quarto.
- Berçário.
- Casa.
- Escola.
- Praça.
- Cafeteria.
- Ambiente profissional.
- Jardim alienígena.
- Cidade futurista.
- Espaço familiar.

Cenários devem ser reutilizáveis entre capítulos.

Criar sistema de background por ID.

Preparar variações de iluminação e horário por filtros e overlays, quando adequado.

Não gerar uma nova imagem para cada diálogo.

---

# 19. SISTEMA DE CAPÍTULOS DESBLOQUEADOS

O foco pode desbloquear:

- Cenas.
- Capítulos.
- Acontecimentos.
- Conversas.
- Oportunidades.
- Marcos de vida.
- Eventos especiais.

## 19.1 Fila narrativa

Criar uma fila persistente de acontecimentos.

O usuário pode:

- Consultar capítulos pendentes.
- Abrir um capítulo.
- Continuar uma história.
- Voltar ao jogo posteriormente.
- Ver capítulos concluídos.

Não executar cenas automaticamente ao terminar o cronômetro.

## 19.2 Organização

Classificar eventos por:

- História principal.
- Relacionamentos.
- Família.
- Carreira.
- Eventos especiais.
- Memórias.

## 19.3 Condições

Eventos podem depender de:

- Fase da vida.
- Tempo de foco.
- Escolhas anteriores.
- Afinidade.
- Profissão.
- Recursos.
- Espécie.
- Características narrativas.
- Número da geração.

Prevenir bloqueios narrativos irreversíveis sem alternativa.

O jogador sempre deve conseguir concluir uma vida, independentemente das decisões anteriores.

---

# 20. ECONOMIA DO JOGO

Manter moedas e recursos separados.

## 20.1 Recursos

- XP vitalício.
- XP da vida atual.
- Energia narrativa.
- Moedas.
- Pontos competitivos.

## 20.2 Ledger

Toda alteração deve possuir:

- ID.
- Usuário.
- Recurso.
- Quantidade.
- Origem.
- Referência.
- Data.
- Identificador de idempotência.

Saldo não deve ser modificável diretamente pelo cliente.

## 20.3 Loja

Criar loja de itens cosméticos:

- Roupas.
- Penteados.
- Acessórios.
- Decorações de perfil.
- Molduras.
- Efeitos visuais leves.
- Temas.

Não implementar compras com dinheiro real no MVP.

## 20.4 Inventário

Guardar itens permanentemente quando apropriado.

Definir compatibilidade por espécie e faixa etária.

Não permitir equipar itens incompatíveis.

---

# 21. RANKING E LIGAS

Manter sistema competitivo balanceado.

## 21.1 Pontuação

Sugestão:

- Primeiros 60 minutos diários: 2 pontos por minuto.
- Entre 61 e 180 minutos: 1 ponto por minuto.
- Acima de 180 minutos: 0,5 ponto por minuto.

Calcular exclusivamente com tempo validado.

Usar representação numérica segura para frações.

Centralizar parâmetros.

## 21.2 Temporadas

Criar temporadas semanais.

Guardar histórico de temporadas e classificações.

Definir regras transparentes de início, término, pontuação e recompensas.

## 21.3 Ligas

- Bronze.
- Prata.
- Ouro.
- Cristal.
- Lendária.

Preparar promoção e rebaixamento controlados.

## 21.4 Recompensas

Prêmios devem ser principalmente cosméticos.

Não permitir compra de pontos.

Não dar vantagem competitiva cumulativa aos vencedores.

## 21.5 Equilíbrio

Evitar mecanismos que incentivem jornadas excessivamente longas.

Permitir metas pessoais.

Oferecer ranking entre amigos.

Permitir que o usuário oculte sua participação pública.

A competição não deve interferir nas histórias durante a sessão de foco.

---

# 22. SISTEMA SOCIAL

Criar:

- Busca por nickname.
- Solicitação de amizade.
- Aceitação.
- Recusa.
- Remoção.
- Bloqueio.
- Ranking entre amigos.
- Perfil público limitado.
- Desafios cooperativos.

## 22.1 Desafios

Exemplo:

Dois amigos contribuem para alcançar 120 minutos de foco durante um período.

Cada usuário ganha progresso pelas próprias sessões.

Evitar compartilhamento de dados privados de tarefas.

## 22.2 Privacidade

Não expor:

- E-mail.
- Tarefas privadas.
- Detalhes sensíveis de rotina.
- Histórico completo de atividades sem autorização.

Permitir controlar o que aparece no perfil público.

---

# 23. FUNCIONALIDADES PARA DIFICULDADE DE INICIAR TAREFAS

## 23.1 Só começar

Oferecer sessão de dois minutos.

Mensagem sugerida:

"Dois minutinhos já podem começar uma nova história."

Não pressionar continuidade.

## 23.2 Dividir tarefas

Permitir registrar uma tarefa e seu primeiro passo pequeno.

Exemplo:

Tarefa: preparar apresentação.

Primeiro passo: abrir o arquivo.

## 23.3 Metas flexíveis

Permitir metas diárias configuráveis.

Não aplicar punições por não cumprir metas.

## 23.4 Dias difíceis

Permitir reduzir a meta.

Manter progresso já conquistado.

Nunca punir o personagem pela ausência do usuário.

## 23.5 Retorno após ausência

Mostrar mensagem acolhedora.

Não matar personagens.

Não destruir famílias.

Não descontar XP permanente.

Não obrigar o usuário a recuperar dias perdidos.

---

# 24. ESTATÍSTICAS

Criar dashboard com:

- Foco diário.
- Foco semanal.
- Foco mensal.
- Tempo validado total.
- Sessões concluídas.
- Sessões interrompidas.
- Histórico de tarefas.
- XP.
- Evolução da vida.
- Geração atual.
- Capítulos concluídos.
- Escolhas realizadas.
- Conquistas.
- Histórico competitivo.

Diferenciar tempo planejado, tempo transcorrido e tempo validado.

Não inventar informações.

---

# 25. MODELAGEM DO BANCO DE DADOS

Criar migrações SQL versionadas.

Tabelas sugeridas:

## Identidade

- profiles
- user_settings

## Foco

- tasks
- focus_sessions
- focus_intervals
- focus_events
- focus_rewards

## Economia

- wallets
- wallet_ledger
- inventory
- shop_items
- equipped_items

## Personagens

- species
- species_traits
- appearance_catalog
- appearance_assets
- characters
- character_appearance
- character_traits
- character_life_stages
- character_memories

## Famílias

- families
- family_memberships
- character_relationships
- parentage_links
- succession_events
- family_legacy_entries

## Narrativa

- story_arcs
- chapters
- scenes
- scene_choices
- choice_conditions
- choice_effects
- story_releases
- user_story_progress
- user_story_flags
- user_choices
- narrative_events
- unlocked_chapters

## Social

- friendships
- blocked_users
- challenges
- challenge_members
- challenge_progress

## Competição

- leagues
- seasons
- season_memberships
- season_scores
- season_rewards

## Progressão

- achievements
- user_achievements
- game_balance_configs

Não criar todas essas tabelas cegamente.

Validar normalização e responsabilidade de cada entidade.

Reduzir redundâncias sem sacrificar clareza.

## 25.1 Constraints

Implementar:

- Primary keys.
- Foreign keys.
- Unique constraints.
- Checks.
- Índices.
- Timestamps.
- Regras de exclusão.
- Limites de saldo.
- Uma sessão ativa por usuário.
- Uma vida jogável ativa por usuário.
- Proteção contra recompensas duplicadas.
- Proteção contra sucessão duplicada.

## 25.2 RLS

Ativar RLS adequadamente.

Validar acesso por identidade autenticada.

Impedir um usuário de modificar:

- Personagem de outro usuário.
- Família de outro usuário.
- Histórico de escolhas de outro usuário.
- Saldo de outro usuário.
- Tempo de foco de outro usuário.
- Pontuação de outro usuário.

## 25.3 Funções privilegiadas

Usar funções transacionais seguras para:

- Concluir sessão.
- Conceder recompensa.
- Comprar itens.
- Registrar escolha.
- Alterar relacionamento.
- Avançar fase.
- Gerar descendente.
- Realizar sucessão.
- Encerrar temporada.

Aplicar políticas de execução restritas.

Não expor funções administrativas diretamente ao cliente.

## 25.4 Auditoria

Registrar operações relevantes com identificadores e datas de servidor.

Preparar mecanismos de recuperação de estado em caso de falhas.

---

# 26. HEREDITARIEDADE — IMPLEMENTAÇÃO TÉCNICA

Criar um serviço desacoplado da interface.

Exemplo de contrato conceitual:

```ts
type InheritanceInput = {
  speciesRulesId: string;
  biologicalParents: CharacterGenetics[];
  generation: number;
  seed: string;
};

type InheritanceResult = {
  speciesId: string;
  appearanceTraits: Record<string, string>;
  specialTraits: string[];
};
```

A implementação real deve possuir tipos mais específicos.

A semente deve permitir reprodutibilidade e auditoria.

Gerar o resultado no servidor.

Não permitir que o cliente selecione diretamente atributos raros arbitrários.

Separar:

- Atributos herdados.
- Variações cosméticas.
- Atributos escolhidos pelo usuário.
- Características especiais de espécie.

A hereditariedade não precisa reproduzir genética biológica real.

Criar documentação explicando as simplificações.

---

# 27. SISTEMA DE EVENTOS E CONSISTÊNCIA

Separar eventos de domínio, por exemplo:

- FocusSessionCompleted.
- LifeXpEarned.
- LifeStageUnlocked.
- ChapterUnlocked.
- NarrativeChoiceMade.
- RelationshipUpdated.
- ChildCreated.
- SuccessorSelected.
- GenerationCompleted.
- AchievementUnlocked.

Aplicar operações sensíveis no servidor.

Garantir que eventos repetidos não produzam recompensas duplicadas.

Utilizar transações e idempotência.

Não depender de callbacks do frontend para completar operações financeiras.

---

# 28. TESTES AUTOMATIZADOS

## 28.1 Testes unitários

Criar testes para:

- Validação de tempo.
- Máquina de estados.
- Recompensas.
- Limites diários.
- XP.
- Evolução por idade.
- Desbloqueio de capítulos.
- Condições narrativas.
- Efeitos das escolhas.
- Afinidade.
- Geração de herança.
- Sucessão.
- Pontuação competitiva.

## 28.2 Integração

Testar:

- Cadastro.
- Login.
- Criação do primeiro personagem.
- Persistência da aparência.
- Nascimento.
- Início de sessão.
- Pausa.
- Retomada.
- Finalização.
- Recebimento de XP.
- Desbloqueio narrativo.
- Registro de escolha.
- Avanço de idade.
- Criação de filho.
- Sucessão.
- Atualização do ranking.

## 28.3 Segurança

Testar tentativas de:

- Alterar XP diretamente.
- Forjar tempo de foco.
- Duplicar recompensas.
- Repetir escolhas remuneradas.
- Comprar itens sem saldo.
- Gerar filhos sem cumprir condições.
- Realizar sucessão repetida.
- Ler dados de outros usuários.
- Manipular pontuação.
- Acessar capítulos bloqueados.

## 28.4 Narrativa

Criar testes de integridade que detectem:

- Cenas inexistentes.
- Escolhas sem destino.
- Referências quebradas.
- Variáveis não declaradas.
- Condições impossíveis.
- Caminhos obrigatórios sem saída.
- Referências a NPCs ausentes.
- Conteúdo incompatível com fase da vida.
- Histórias sem conclusão.
- Capítulos sem versão.

## 28.5 E2E

Usar Playwright.

Criar fluxos completos com relógio controlado em ambiente de teste.

Não obrigar o teste a aguardar 90 horas reais.

O mecanismo de aceleração deve ser impossível de utilizar em produção.

## 28.6 iPhone

Documentar testes manuais:

- Safari.
- PWA instalada.
- Wake Lock.
- Bloqueio de tela.
- Troca de app.
- Ligações.
- Perda de internet.
- Suspensão.
- Retorno.
- Atualização da PWA.

Não declarar testes físicos aprovados se não houver dispositivo disponível.

---

# 29. ACESSIBILIDADE

Garantir:

- Navegação por teclado.
- Labels acessíveis.
- Compatibilidade com VoiceOver.
- Alto contraste suficiente.
- Áreas de toque adequadas.
- Redução de movimento.
- Fontes legíveis.
- Estados de erro compreensíveis.
- Opções de pular efeitos.
- Diálogos com leitura acessível.
- Informações não transmitidas apenas por cores.
- Narrativa sem efeitos obrigatórios de texto lento.

Disponibilizar opção para mostrar imediatamente todo o diálogo, sem animação de digitação.

---

# 30. DESEMPENHO

Priorizar:

- Carregamento rápido.
- Code splitting.
- Lazy loading.
- Imagens otimizadas.
- Cache de cenários.
- Reutilização de retratos.
- Transições leves.
- Consultas SQL eficientes.
- Paginação.
- Evitar requisições redundantes.
- Limitar Realtime ao necessário.

A PWA deve permanecer fluida em iPhones intermediários.

Não carregar todos os capítulos, retratos e cenários ao abrir a home.

---

# 31. ADMINISTRAÇÃO DE CONTEÚDO

Preparar um painel administrativo protegido por autorização real no servidor.

O painel deve permitir, pelo menos:

- Consultar catálogo de histórias.
- Consultar capítulos.
- Consultar cenas.
- Gerenciar versões de conteúdo.
- Consultar personagens NPC.
- Gerenciar parâmetros de balanceamento.
- Consultar assets cadastrados.

Para o MVP, a edição pode ocorrer através de arquivos versionados e importadores seguros.

Não é obrigatório construir imediatamente um editor visual complexo.

Criar scripts de validação e publicação de conteúdo.

Não permitir que usuários comuns acessem o painel administrativo.

---

# 32. ESTRUTURA DO REPOSITÓRIO

Organizar por domínio.

Exemplo:

```text
src/
  app/
    (public)/
    (auth)/
    (game)/
      home/
      focus/
      story/
      character/
      family/
      relationships/
      wardrobe/
      shop/
      leaderboard/
      friends/
      statistics/
      settings/
    admin/
    api/

  components/
    ui/
    layout/
    narrative/
    characters/
    focus/
    family/
    gamification/

  features/
    auth/
    onboarding/
    focus-engine/
    character-creator/
    character-renderer/
    life-progression/
    narrative-engine/
    relationships/
    family/
    inheritance/
    succession/
    economy/
    leaderboard/
    social/
    statistics/

  lib/
    supabase/
    security/
    validation/
    date-time/
    utilities/

  hooks/
  stores/
  styles/
  types/

content/
  stories/
  characters/
  scenes/
  backgrounds/
  balance/

supabase/
  migrations/
  functions/
  tests/
  seed.sql

public/
  icons/
  assets/
    characters/
    backgrounds/
    clothing/
    accessories/
    interface/

tests/
  unit/
  integration/
  e2e/

docs/
  architecture/
  narrative/
  art/
  product/
  deployment/
  testing/
  security/
```

Adaptar quando necessário.

Evitar duplicação de responsabilidades.

---

# 33. FASES DE DESENVOLVIMENTO

## Fase 1 — Fundação

Implementar:

- Next.js.
- TypeScript strict.
- Design system.
- Layout mobile.
- PWA.
- Supabase.
- Autenticação.
- Banco inicial.
- RLS.
- Perfis.
- Infraestrutura de testes.

## Fase 2 — Motor de foco

Implementar:

- Cronômetro.
- Máquina de estados.
- Heartbeat.
- Wake Lock.
- Validação do servidor.
- Persistência.
- Pausa automática.
- Recuperação.
- Recompensas idempotentes.
- Testes.

Priorizar esta fase.

## Fase 3 — Criador de personagens

Implementar:

- Escolha de espécie.
- Personalização.
- Sistema de camadas.
- Salvar aparência.
- Prévia.
- Retratos.
- Idades.
- Primeiro nascimento.

## Fase 4 — Motor narrativo

Implementar:

- Estrutura de capítulos.
- Cenas.
- Diálogos.
- Escolhas.
- Condições.
- Consequências.
- Persistência.
- Versionamento.
- Fila de acontecimentos.

## Fase 5 — Progressão de vida

Implementar:

- XP de vida.
- Marcos de idade.
- Mudança visual por fase.
- Memórias.
- Desbloqueios.
- Eventos por idade.

## Fase 6 — Relacionamentos

Implementar:

- NPCs.
- Afinidade.
- Amizades.
- Romance adulto opcional.
- Parcerias.
- Eventos de relacionamento.

## Fase 7 — Famílias e gerações

Implementar:

- Filhos.
- Adoção.
- Hereditariedade.
- Árvore genealógica.
- Conclusão de vida.
- Sucessão.
- Segunda geração jogável.

## Fase 8 — Economia e competição

Implementar:

- Moedas.
- Loja.
- Inventário.
- Pontuação.
- Ranking.
- Ligas.
- Temporadas.

## Fase 9 — Social

Implementar:

- Amigos.
- Perfil público.
- Desafios.
- Ranking de amigos.

## Fase 10 — Refinamento

Implementar:

- Estatísticas.
- Acessibilidade.
- Otimizações.
- Polimento visual.
- Tratamento de erros.
- Documentação.
- Testes finais.

Cada fase deve terminar com uma versão executável.

Não construir todas as funcionalidades simultaneamente sem validação incremental.

---

# 34. DOCUMENTAÇÃO

Criar obrigatoriamente:

- README.md
- docs/ARCHITECTURE.md
- docs/DATABASE.md
- docs/FOCUS_ENGINE.md
- docs/NARRATIVE_ENGINE.md
- docs/CHARACTER_SYSTEM.md
- docs/INHERITANCE_SYSTEM.md
- docs/GENERATION_SYSTEM.md
- docs/GAME_BALANCE.md
- docs/ART_DIRECTION.md
- docs/ASSET_PRODUCTION.md
- docs/DEPLOYMENT.md
- docs/IOS_TEST_CHECKLIST.md
- docs/SECURITY.md
- docs/IMPLEMENTATION_STATUS.md

Documentar especialmente como:

1. Criar um novo capítulo.
2. Adicionar uma escolha.
3. Aplicar uma consequência.
4. Criar um NPC.
5. Adicionar um novo cabelo.
6. Adicionar uma nova espécie alienígena.
7. Configurar hereditariedade.
8. Adicionar uma nova geração.
9. Criar um cenário.
10. Ajustar XP e pontuação.
11. Implantar na Vercel.
12. Configurar o Supabase.

---

# 35. VARIÁVEIS DE AMBIENTE

Criar `.env.example`.

Utilizar as convenções atuais recomendadas pelo Supabase e Next.js.

Configurações previstas:

- URL do Supabase.
- Chave pública/publishable.
- Credenciais privilegiadas apenas no servidor, quando realmente necessárias.
- URL pública da aplicação.
- Configurações opcionais de monitoramento.

Não incluir credenciais verdadeiras.

Não expor chaves privilegiadas no frontend.

Se o projeto Supabase não estiver conectado, preparar migrações, exemplos e scripts.

---

# 36. CRITÉRIOS DE ACEITE DO MVP

O MVP estará funcional quando for possível:

1. Criar uma conta.
2. Fazer login.
3. Recuperar a senha.
4. Selecionar humano ou alienígena.
5. Personalizar um bebê.
6. Salvar sua aparência.
7. Assistir à cena de nascimento.
8. Iniciar uma sessão de foco.
9. Pausar ao ocultar a página.
10. Recuperar uma sessão interrompida.
11. Finalizar e validar tempo.
12. Receber XP sem duplicidade.
13. Desbloquear um capítulo.
14. Abrir o capítulo posteriormente.
15. Ler diálogos.
16. Escolher entre diferentes respostas.
17. Persistir consequências.
18. Avançar fases da vida.
19. Criar relacionamentos.
20. Escolher uma trajetória adulta.
21. Formar família opcionalmente.
22. Gerar ou adotar um sucessor.
23. Registrar a primeira vida na árvore genealógica.
24. Começar uma segunda geração.
25. Preservar a história anterior.
26. Consultar estatísticas.
27. Participar de ranking balanceado.
28. Instalar a PWA em um iPhone compatível.
29. Utilizar a interface em telas pequenas.
30. Recarregar o aplicativo sem perder progresso.

Os critérios devem ser demonstrados por testes ou evidências verificáveis.

Não marcar testes de hardware como aprovados sem executá-los.

---

# 37. ENTREGA E EXECUÇÃO

Execute o desenvolvimento diretamente no repositório.

Comece verificando o código existente e as dependências.

Em seguida:

1. Elabore um plano técnico.
2. Crie a arquitetura.
3. Defina os contratos de dados.
4. Modele o banco.
5. Implemente autenticação.
6. Desenvolva e teste o motor de foco.
7. Implemente o criador de personagens.
8. Desenvolva o motor narrativo.
9. Integre progressão de vida.
10. Implemente relacionamentos.
11. Implemente famílias e sucessão.
12. Adicione economia e rankings.
13. Refine a experiência mobile.
14. Execute testes.
15. Documente a implantação.

Trabalhe de forma incremental.

Quando houver limite de contexto, registre claramente o estado atual e as próximas tarefas no repositório, para permitir continuidade sem perda de decisões.

Ao concluir cada fase, informe:

- Funcionalidades entregues.
- Arquivos criados e modificados.
- Migrações.
- Testes executados.
- Resultado do build.
- Pendências.
- Limitações conhecidas.
- Próxima fase.

Não apresente apenas uma explicação de como desenvolver.

**Desenvolva efetivamente a aplicação.**

O resultado esperado é uma PWA real de foco e simulação de vida, com identidade visual própria, personagens personalizáveis, histórias ramificadas, relacionamentos, gerações persistentes, rankings e um sistema seguro de progresso baseado em concentração validada.

A experiência deve ser bonita, acolhedora, tecnicamente sólida e suficientemente envolvente para que cada sessão de foco represente um pequeno avanço na história de uma vida.