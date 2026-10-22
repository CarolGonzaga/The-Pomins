'use client';
import Link from 'next/link';
import { useRef,useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Pomin } from '@/components/characters/pomin';
import { appearanceSchema } from '../character-creator/model';
import { SpritePreview } from '../room/sprite-preview';
import { adultAppearanceSchema } from '../room/domain';
import type { SaveEntry } from './manager';
import type { GameSave } from './model';
import { saveManagerMutation } from './manager-client';
import styles from './manager.module.css';

const stages:Record<string,string>={baby:'Bebê',child:'Criança',teen:'Adolescente',adult:'Adulto',elder:'Idoso'};
const states={draft:'Criação em andamento',pending_selection:'Protagonista pendente',ready:'Pronta para continuar'};
function Portrait({character:c}:{character:SaveEntry['protagonist']}){
  if(!c)return <p>Protagonista ainda não definido.</p>;
  const baby=appearanceSchema.safeParse(c.appearance),adult=adultAppearanceSchema.safeParse(c.appearance);
  return <div className={styles.portrait}>
    {c.render_system==='legacy' && c.life_stage==='baby' && baby.success
      ? <Pomin appearance={baby.data} label={`Aparência de ${c.name}`}/>
      : c.render_system==='lpc' && c.life_stage==='adult' && adult.success
        ? <SpritePreview appearance={adult.data} label={`Aparência de ${c.name}`}/>
        : <span>Prévia indisponível</span>}
    <div><strong>{c.name}</strong><p>{stages[c.life_stage]??'Fase não reconhecida'}</p></div>
  </div>;
}
export function SaveManager({entries,archived}:{entries:SaveEntry[];archived:boolean}){
  const router=useRouter(),lock=useRef(false);
  const [confirm,setConfirm]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function update(s:GameSave){
    if(lock.current)return;
    lock.current=true;setBusy(true);setError('');
    try{
      await saveManagerMutation('PATCH',{saveId:s.id,archived:!archived,expectedRevision:s.world_revision});
      setConfirm(null);router.refresh();
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.');}
    finally{lock.current=false;setBusy(false);}
  }
  return <>
    {error && <div className={styles.alert} role="alert">{error} <button onClick={()=>router.refresh()}>Atualizar lista</button></div>}
    {!entries.length && <section className={styles.panel}><h2>{archived?'Nenhuma partida arquivada':'Sua próxima história começa aqui'}</h2><p>{archived?'Suas histórias arquivadas aparecerão aqui.':'Crie uma partida para dar boas-vindas a um novo Pomin.'}</p></section>}
    <div className={styles.grid}>{entries.map(({save:s,protagonist,focus_pending})=><article className={styles.card} key={s.id} aria-label={s.name}>
      <h2>{s.name}</h2><Portrait character={protagonist}/>
      <dl className={styles.details}>
        <div><dt>Geração:</dt><dd>{s.current_generation}</dd></div>
        <div><dt>Estado:</dt><dd>{archived?'Arquivada':states[s.state]}</dd></div>
        <div><dt>Última visita:</dt><dd>{s.last_used_at?<time dateTime={s.last_used_at}>{new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(s.last_used_at))}</time>:'Ainda não aberta'}</dd></div>
      </dl>
      {focus_pending && <p>Há uma sessão de foco pendente nesta partida. Continue por ela antes de arquivar.</p>}
      <div className={styles.actions}>
        {!archived && <Link className="button" href={`/game/${s.id}`} prefetch={false}>{s.state==='draft'?'Retomar criação':s.state==='pending_selection'?'Escolher protagonista':'Continuar'}</Link>}
        {archived?<Button disabled={busy} variant="secondary" onClick={()=>update(s)}>Restaurar</Button>:<Button variant="secondary" disabled={busy||focus_pending} onClick={()=>{setConfirm(s.id);setError('');}}>Arquivar</Button>}
      </div>
      {confirm===s.id && <div className={styles.confirmation} role="group" aria-label={`Confirmar arquivamento de ${s.name}`}>
        <p>Arquivar “{s.name}”? Personagens e histórico serão mantidos. Você poderá restaurar a partida.</p>
        <Button disabled={busy} onClick={()=>update(s)}>Confirmar arquivamento</Button>
        <Button disabled={busy} variant="secondary" onClick={()=>setConfirm(null)}>Manter partida</Button>
      </div>}
    </article>)}</div>
  </>;
}
