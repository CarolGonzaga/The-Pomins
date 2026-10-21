# THE POMINS — O MUNDO DOS POMINS
## Especificação funcional e regras do jogo — v1.0

**Status:** Regras fundamentais aprovadas; balanceamento e conteúdo ainda sujeitos a testes.

### 1. Visão do produto

The Pomins é um aplicativo de foco gamificado combinado com um simulador de vida 2D em pixel art.

O usuário realiza sessões Pomodoro, acumula minutos de foco e utiliza esses minutos para desenvolver personagens, tomar decisões, desbloquear eventos, construir famílias e acompanhar diferentes gerações.

O jogador decide o que acontece; os personagens realizam automaticamente as atividades no cenário.

### 2. Princípios obrigatórios

1. O jogo deve incentivar a concentração, não competir com ela.
2. Os personagens não exigem monitoramento contínuo.
3. Nenhum progresso é perdido simplesmente porque o usuário ficou sem abrir o aplicativo.
4. O envelhecimento é voluntário, condicionado ao cumprimento dos requisitos.
5. Os minutos de foco podem ser distribuídos entre membros da família.
6. Todos os moradores são selecionáveis e controláveis por escolhas.
7. A progressão narrativa não depende obrigatoriamente de casamento ou filhos.
8. O jogo deve aceitar expansões de conteúdo sem mudanças estruturais extensas.
9. O aplicativo será mobile-first, com prioridade para iPhone, e também funcionará no desktop.
10. O progresso será persistido na conta do usuário.

### 3. Criação de personagens

A personalização inicial será semelhante à dos RPGs clássicos em pixel art.

Características:
- Nome;
- Corpo-base compatível com a fase de vida;
- Tom de pele;
- Cor dos olhos;
- Penteado;
- Cor do cabelo;
- Roupas e suas cores.

Utilizar sprites 2D e camadas do ecossistema Universal LPC sempre que compatíveis.

A aparência deve ser salva como configurações de personagem, separadamente das imagens utilizadas para representá-lo.

Ao envelhecer, o personagem deve preservar suas características essenciais, adaptando-as à nova base corporal.

### 4. Ciclo de vida

**Bebê:** experiência semelhante a Tamagotchi. Personagem estático, com animações simples e ações de alimentação, higiene, sono, brincadeira e carinho. O histórico de cuidados pode influenciar características futuras, mas não deve produzir punições permanentes.

**Criança:** movimentação automática dentro do quarto. Ações de estudar, brincar, comer, dormir, tomar banho e desenvolver interesses.

**Adolescente:** novas atividades, amizades, interações com NPCs, desenvolvimento de habilidades e preparação para oportunidades profissionais.

**Adulto:** principal fase do jogo. Carreira, empregos, relacionamentos, casamento opcional, filhos opcionais, ampliação da casa, hobbies, objetivos pessoais e aposentadoria.

**Idoso:** aposentadoria, hobbies, convivência familiar, conquistas e legado. O personagem continua jogável. A sucessão só fica disponível quando houver um descendente apto a assumir o protagonismo.

### 5. Envelhecimento

O avanço de fase depende de requisitos configuráveis.

Ao cumprir os requisitos, a interface apresenta uma opção de envelhecimento.

O usuário pode aceitar ou permanecer indefinidamente na fase atual.

A transição é uma decisão explícita, não uma consequência automática de acumular minutos.

A fase adulta deve ser substancialmente mais longa do que as demais.

### 6. Sistema de foco

Cada sessão de foco válida produz um saldo de minutos.

O sistema deverá manter:
- Tempo total histórico do usuário;
- Minutos disponíveis para distribuição;
- Minutos efetivamente distribuídos;
- Registro de cada distribuição;
- Personagem e atividade beneficiados;
- Histórico de progresso resultante.

O usuário pode distribuir os minutos de uma sessão entre múltiplos personagens e atividades compatíveis.

A soma das distribuições não pode ultrapassar a quantidade de minutos elegíveis da sessão.

A distribuição não pode ser duplicada ao atualizar a página, perder conexão ou repetir uma requisição.

Uma distribuição deve ser persistida junto aos efeitos de progresso correspondentes, de maneira atômica.

### 7. Personagens controláveis

Todos os moradores podem ser selecionados, inclusive crianças e bebês.

As ações disponíveis dependem da fase de vida e do contexto.

Personagens não selecionados executam rotinas automáticas simples.

A falta de controle manual não deve provocar consequências negativas graves.

### 8. Atividades e movimentação

Cada atividade possui:
- Identificador;
- Fases de vida permitidas;
- Requisitos;
- Objeto ou destino do cenário;
- Animação;
- Efeitos no progresso;
- Possíveis eventos narrativos.

Exemplo de estudar:

Escolha da atividade → definição do destino → caminhada automática → interação com cadeira e mesa → animação de estudo → registro do progresso correspondente.

Atividades devem continuar funcionando logicamente mesmo quando não existir uma animação específica. A interface deve oferecer um estado visual alternativo coerente, sem falsificar sprites inexistentes.

### 9. Necessidades

Necessidades iniciais:
- Fome;
- Higiene;
- Energia;
- Socialização/afeto;
- Diversão.

As necessidades são mecânicas leves, não punições em tempo real.

Enquanto o jogo estiver fechado, não haverá deterioração contínua baseada no relógio real.

Necessidades podem influenciar atividades, diálogos e preferências narrativas.

### 10. Atributos e habilidades

Atributos iniciais propostos:
- Conhecimento;
- Criatividade;
- Sociabilidade;
- Autonomia;
- Bem-estar.

Novos atributos podem ser adicionados por configuração.

Experiências na infância e adolescência influenciam habilidades, preferências e oportunidades profissionais futuras.

As escolhas anteriores nunca devem impedir permanentemente a mudança de carreira.

### 11. Carreiras

Na fase adulta, o Pomin pode escolher uma profissão, trabalhar, receber remuneração fictícia e desenvolver uma carreira.

As carreiras poderão ter níveis, requisitos e eventos narrativos.

O tempo investido nos estudos pode desbloquear novas oportunidades, mas não determina irrevogavelmente o futuro do personagem.

### 12. Casa e economia

A casa será composta por ambientes 2D.

Inicialmente, haverá apenas um quarto.

No futuro, o usuário poderá ampliar a casa, desbloquear cômodos e adquirir móveis.

Objetos podem funcionar como pontos de interação para atividades.

A economia fictícia será separada do saldo de tempo de foco.

### 13. Relacionamentos

NPCs poderão desenvolver vínculos com os Pomins.

Tipos iniciais:
- Conhecido;
- Amizade;
- Interesse romântico;
- Namoro;
- Casamento;
- Parentesco.

As relações terão histórico e progresso próprios.

O casamento poderá adicionar outro morador à casa.

Casamento não obriga a ter filhos.

### 14. Família

O jogador poderá ter vários personagens na mesma residência.

Cada morador possui:
- Identidade;
- Aparência;
- Fase de vida;
- Necessidades;
- Habilidades;
- Relacionamentos;
- Atividade atual;
- Histórico de progressão.

Os minutos de foco poderão ser distribuídos entre os moradores.

Membros não selecionados terão comportamentos automáticos.

O jogo deverá admitir diferentes estruturas familiares.

### 15. Filhos e gerações

Ter filhos será opcional e poderá ser implementado por diferentes caminhos narrativos.

Cada filho terá ciclo de vida próprio.

O jogador poderá distribuir tempo para o desenvolvimento dos filhos.

Quando um descendente atingir a fase adulta, poderá se tornar protagonista de uma nova geração.

A troca de protagonista não elimina os personagens anteriores.

Sem descendentes aptos, o jogador continuará com seu personagem atual, inclusive na velhice.

### 16. Narrativa e decisões

A narrativa será baseada em eventos, condições e consequências.

As escolhas podem depender de:
- Fase de vida;
- Habilidades;
- Relacionamentos;
- Carreira;
- Histórico de decisões;
- Objetivos concluídos;
- Tempo de foco disponível.

A história deverá utilizar conteúdo configurável, preferencialmente em JSON ou estrutura equivalente, evitando diálogos fixos diretamente nos componentes.

### 17. Experiência durante o foco

Durante o Pomodoro, a interface deve priorizar o cronômetro.

O Pomin pode executar uma animação ambiente correspondente à atividade escolhida.

Não serão exibidas decisões obrigatórias que interrompam a sessão.

Após concluir a sessão, os minutos ficam disponíveis para distribuição e desenvolvimento.

### 18. Salvamento

Utilizar Supabase para persistir usuários, personagens, aparência, famílias, sessões de foco, distribuição de minutos, atividades, habilidades, decisões e progresso.

O sistema deverá permitir retomar uma sessão de jogo sem perder o estado salvo.

### 19. Escopo do MVP técnico

A primeira entrega deverá conter:
- Um quarto navegável;
- Um personagem adulto LPC;
- Personalização básica;
- Movimentação automática;
- Três atividades: estudar, ler e dormir;
- Cronômetro funcional;
- Registro persistente de sessões;
- Distribuição segura de minutos;
- Registro de progresso do personagem.

A arquitetura deverá suportar múltiplos personagens e fases da vida, mesmo que o protótipo inicial contenha apenas um personagem e um cenário.

### 20. Fora do MVP inicial

- Árvore genealógica completa;
- Sistema completo de casamento;
- Gravidez, adoção e criação de filhos;
- Expansões de casa;
- Catálogo amplo de profissões;
- Todas as animações das cinco fases;
- NPCs com comportamento social complexo;
- Centenas de eventos narrativos;
- Sistema econômico aprofundado.

Essas funcionalidades fazem parte da visão de produto, mas serão implementadas progressivamente.

### 21. Critério de sucesso da primeira entrega

O usuário deve conseguir criar e personalizar um Pomin, visualizar o personagem em um quarto, selecionar uma atividade, observar o movimento automático, concluir uma sessão de foco, distribuir os minutos e verificar que seu progresso permanece salvo depois de recarregar a aplicação.

Essa experiência deve funcionar no navegador de um iPhone e no desktop.