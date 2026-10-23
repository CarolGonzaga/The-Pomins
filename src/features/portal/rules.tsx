'use client';
import {useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Pomin} from '@/components/characters/pomin';
import {PortalLink} from './navigation';
import styles from './portal.module.css';
export const ruleSteps=[
  {title:'Um momento para você',copy:'Na partida, abra Meu foco. Escolha o tempo e comece. Mantenha o Pomins visível; os controles permitem pausar e retomar.',art:'02:00'},
  {title:'Seu foco vira cuidado',copy:'Uma sessão concluída gera minutos elegíveis. Distribua o saldo nas atividades do morador: só o tempo confirmado pode ser usado.',art:'FOCO → MINUTOS'},
  {title:'Pequenos gestos, uma vida',copy:'Alimente, brinque e dê carinho. Uma interação visual pode ser gratuita; aplicar evolução usa os minutos disponíveis.',art:'baby'},
  {title:'Crescer é uma escolha',copy:'Os cuidados preparam o próximo capítulo. O envelhecimento será voluntário; a passagem visual para criança ainda não está disponível.',art:'CRIE · VIVA · CONTINUE'},
  {title:'Cada história, um mundo',copy:'Em Partidas, crie uma história ou continue uma anterior. Você pode arquivar e restaurar sem apagar seus moradores.',art:'01  02  03'},
  {title:'Um foco, muitas histórias',copy:'Seu saldo pertence à conta. Trocar ou criar partidas não multiplica minutos; cada distribuição tem um personagem e uma atividade de destino.',art:'UM SÓ SALDO'},
];
export function Rules(){
  const [step,setStep]=useState(0),heading=useRef<HTMLHeadingElement>(null),item=ruleSteps[step];
  function change(next:number){setStep(next);requestAnimationFrame(()=>heading.current?.focus());}
  return <>
    <div className={styles.steps} aria-label={`Etapa ${step+1} de ${ruleSteps.length}`}>{ruleSteps.map((_,i)=><span key={i} data-current={i===step}/>)}</div>
    <section key={step} className={`${styles.panel} ${styles.tutorial}`} aria-labelledby={`rule-${step}`}>
      <div className={styles.illustration} aria-hidden="true">{item.art==='baby'?<Pomin/>:<span>{item.art}</span>}</div>
      <h2 ref={heading} tabIndex={-1} id={`rule-${step}`}>{item.title}</h2><p>{item.copy}</p>
    </section>
    <div className={styles.actions}><Button variant="secondary" disabled={step===0} onClick={()=>change(step-1)}>Anterior</Button>{step<ruleSteps.length-1?<Button onClick={()=>change(step+1)}>Próximo</Button>:<PortalLink href="/saves" className="button button-primary">Escolher partida</PortalLink>}</div>
    <div className={styles.actions}><PortalLink href="/menu">Voltar ao menu</PortalLink><PortalLink href="/saves">Pular tutorial</PortalLink></div>
  </>;
}
