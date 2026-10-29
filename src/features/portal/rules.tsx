'use client';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pomin } from '@/components/characters/pomin';
import { PortalLink } from './navigation';
import styles from './portal.module.css';
import { completeTutorial } from './context-help';
import { usePreferences } from '../preferences/provider';
export const ruleSteps = [
  {
    title: 'Um momento para você',
    copy: 'Na partida, abra Meu foco. Escolha o tempo e comece. Mantenha o Pomins visível; os controles permitem pausar e retomar.',
    art: '02:00',
  },
  {
    title: 'Seu foco vira cuidado',
    copy: 'Uma sessão concluída gera minutos elegíveis. Distribua o saldo nas atividades do morador: só o tempo confirmado pode ser usado.',
    art: 'FOCO → MINUTOS',
  },
  {
    title: 'Pequenos gestos, uma vida',
    copy: 'Alimente, brinque e dê carinho. Uma interação visual pode ser gratuita; aplicar evolução usa os minutos disponíveis.',
    art: 'baby',
  },
  {
    title: 'Crescer é uma escolha',
    copy: 'Os cuidados preparam o próximo capítulo. O envelhecimento será voluntário; a passagem visual para criança ainda não está disponível.',
    art: 'CRIE · VIVA · CONTINUE',
  },
  {
    title: 'Cada história, um mundo',
    copy: 'Em Partidas, crie uma história ou continue uma anterior. Você pode arquivar e restaurar sem apagar seus moradores.',
    art: '01  02  03',
  },
  {
    title: 'Um foco, muitas histórias',
    copy: 'Saldo e constância pertencem à conta. Só o foco concluído e validado reinicia a contagem. Regras futuras: aviso em 3 dias, regressão temporária em 7 e encerramento em 30, com memórias preservadas. Consequências em preparação; nenhuma está ativa. Criar partidas não reinicia a constância nem multiplica minutos.',
    art: 'UM SÓ SALDO',
  },
];
function FullTutorial() {
  const [step, setStep] = useState(0),
    heading = useRef<HTMLHeadingElement>(null),
    item = ruleSteps[step];
  function change(next: number) {
    setStep(next);
    requestAnimationFrame(() => heading.current?.focus());
  }
  return (
    <>
      <div
        className={styles.steps}
        role="progressbar"
        aria-label="Progresso do tutorial"
        aria-valuemin={1}
        aria-valuemax={ruleSteps.length}
        aria-valuenow={step + 1}
        aria-valuetext={`Etapa ${step + 1} de ${ruleSteps.length}`}
      >
        {ruleSteps.map((_, i) => (
          <span key={i} data-current={i === step} />
        ))}
      </div>
      <section
        key={step}
        className={`${styles.panel} ${styles.tutorial}`}
        aria-labelledby={`rule-${step}`}
      >
        <div className={styles.illustration} aria-hidden="true">
          {item.art === 'baby' ? <Pomin /> : <span>{item.art}</span>}
        </div>
        <h2 ref={heading} tabIndex={-1} id={`rule-${step}`}>
          {item.title}
        </h2>
        <p>{item.copy}</p>
      </section>
      <div className={styles.actions}>
        <Button variant="secondary" disabled={step === 0} onClick={() => change(step - 1)}>
          Anterior
        </Button>
        {step < ruleSteps.length - 1 ? (
          <Button onClick={() => change(step + 1)}>Próximo</Button>
        ) : (
          <PortalLink href="/saves" className="button button-primary">
            Escolher partida
          </PortalLink>
        )}
      </div>
      <div className={styles.actions}>
        <PortalLink href="/menu">Voltar ao menu</PortalLink>
        <PortalLink href="/saves">Pular tutorial</PortalLink>
      </div>
    </>
  );
}
export function Rules() {
  const { userId } = usePreferences();
  return (
    <>
      <section className={styles.compactRules} aria-label="Regras essenciais">
        <p>
          <strong>Foco.</strong> Gire a borda, toque no centro e mantenha o app visível. Navegar
          dentro do jogo preserva a sessão; sair do app pausa a validação.
        </p>
        <p>
          <strong>Minutos.</strong> Só o foco concluído e validado gera saldo. Seus minutos são
          compartilhados por todas as partidas.
        </p>
        <p>
          <strong>Cuidados.</strong> Cada cuidado guardado custa 2 min. Reações gratuitas não salvam
          evolução. Necessidades usam horário do servidor quando o desgaste temporal é ativado.
        </p>
        <p>
          <strong>Constância.</strong> Regras futuras: aviso em 3 dias, regressão temporária em 7 e
          encerramento em 30, preservando as memórias.{' '}
          <strong>Regressão e encerramento não estão ativos.</strong>
        </p>
        <p>
          <strong>Evolução.</strong> Crescer é uma escolha. A passagem para a infância ainda está em
          preparação.
        </p>
      </section>
      <details>
        <summary>Tutorial completo</summary>
        <FullTutorial />
        <button className="button" onClick={() => completeTutorial(userId)}>
          Marcar tutorial como concluído
        </button>
      </details>
    </>
  );
}
