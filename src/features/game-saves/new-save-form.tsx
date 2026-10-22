'use client';
import { useEffect,useRef,useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createSaveSchema,newSaveStorageKey } from './manager';
import { saveManagerMutation } from './manager-client';
import styles from './manager.module.css';
type Pending={requestId:string;name:string};
export function NewSaveForm({userId}:{userId:string}){
  const router=useRouter(),lock=useRef(false),key=newSaveStorageKey(userId);
  const [name,setName]=useState(''),[pending,setPending]=useState<Pending|null>(null),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  // Hydrate browser-only durable request state after SSR, as in the existing game.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(()=>{
    try{
      const raw=localStorage.getItem(key);
      if(raw){const data=createSaveSchema.parse(JSON.parse(raw));setPending(data);setName(data.name);}
      setReady(true);
    }catch{setError('Não foi possível recuperar o pedido neste navegador. Preserve os dados locais e confira suas partidas antes de tentar novamente.');}
  },[key]);
  /* eslint-enable react-hooks/set-state-in-effect */
  async function create(event:React.FormEvent){
    event.preventDefault();if(lock.current||!ready)return;
    const parsed=createSaveSchema.safeParse(pending??{requestId:crypto.randomUUID(),name});
    if(!parsed.success){setError('Escolha um nome de 2 a 80 caracteres.');return;}
    lock.current=true;setBusy(true);setError('');
    try{
      // Persist the exact payload before sending. Never generate a new UUID on a retry.
      localStorage.setItem(key,JSON.stringify(parsed.data));setPending(parsed.data);
      const save=await saveManagerMutation('POST',parsed.data);
      localStorage.removeItem(key);
      router.push(save.archived_at?'/saves?archived=true':`/game/${save.id}`);
      router.refresh();
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível criar. Tente o mesmo pedido novamente.');}
    finally{lock.current=false;setBusy(false);}
  }
  return <form onSubmit={create} className={`${styles.form} ${styles.panel}`}>
    <label>Nome da partida<input required minLength={2} maxLength={80} autoComplete="off" value={name} readOnly={pending!==null} onChange={e=>setName(e.target.value)}/></label>
    <p>Uma residência independente e uma nova história. Seus minutos de foco continuam compartilhados pela conta.</p>
    {pending && <p role="status">Há um pedido guardado. Continuar recupera a mesma partida, mesmo após uma falha de conexão.</p>}
    {error && <p role="alert">{error}</p>}
    <Button disabled={busy||!ready} type="submit">{busy?'Preparando história…':pending?'Continuar pedido de criação':'Criar partida'}</Button>
  </form>;
}
