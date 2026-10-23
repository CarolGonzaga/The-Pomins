'use client';
import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {browserClient} from '@/lib/supabase/browser';
import {Button} from '@/components/ui/button';
import {preferencesSchema,type Preferences} from './model';
import {usePreferences} from './provider';
import {PixelAvatar,avatarLabels} from './avatar';
import styles from '../portal/portal.module.css';
import {PortalLink} from '../portal/navigation';
async function request(path:string,method:string,body:unknown,userId:string|null){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{const r=await fetch(path,{method,headers:{'Content-Type':'application/json','X-Pomins-Account':userId??''},body:JSON.stringify(body),signal:controller.signal});
    const data=await r.json();if(!r.ok)throw Error(data.error??'Não foi possível concluir.');return data;
  }catch(e){if(e instanceof Error && e.name==='AbortError')throw Error('A confirmação demorou. Confira a conexão e tente novamente.');throw e;}
  finally{clearTimeout(timer);}
}
export function Settings({email}:{email:string}){
  const context=usePreferences(),router=useRouter(),[draft,setDraft]=useState(context.preferences),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[newEmail,setEmail]=useState(''),[password,setPassword]=useState(''),lock=useRef(false);
  const set=<K extends keyof Preferences>(key:K,value:Preferences[K])=>setDraft(x=>({...x,[key]:value}));
  async function perform(work:()=>Promise<void>){
    if(lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');
    try{await work();}catch(e){setError(e instanceof Error?e.message:'Não foi possível conectar.');}finally{lock.current=false;setBusy(false);}
  }
  return <>
    {message && <p role="status" className={styles.status}>{message}</p>}{error && <p role="alert" className={styles.status}>{error}</p>}
    <form className={`${styles.panel} ${styles.form}`} onSubmit={e=>{e.preventDefault();void perform(async()=>{
      const value=preferencesSchema.parse(draft),data=await request('/api/preferences','PATCH',value,context.userId);
      if(data.userId!==context.userId)throw Error('Entre novamente antes de salvar.');
      const saved=preferencesSchema.parse(data.preferences);context.setPreferences(saved);setDraft(saved);setMessage('Preferências salvas na sua conta.');
    });}}>
      <h2>Seu ritmo, seu espaço</h2>
      <label>Duração padrão do foco (minutos)<input type="number" min={2} max={120} required value={draft.focus_minutes} onChange={e=>set('focus_minutes',Number(e.target.value))}/></label>
      <p className={styles.hint}>Vale para novas sessões. Uma sessão em andamento mantém sua duração.</p>
      <label>Tema<select value={draft.theme} onChange={e=>set('theme',e.target.value as Preferences['theme'])}><option value="system">Acompanhar o sistema</option><option value="light">Claro</option><option value="dark">Escuro</option></select></label>
      <label className={styles.toggle}><input type="checkbox" checked={draft.reduce_motion} onChange={e=>set('reduce_motion',e.target.checked)}/>Reduzir animações da interface</label>
      <p className={styles.hint}>A preferência de movimento reduzido do dispositivo também é respeitada.</p>
      <fieldset><legend>Avatar do perfil</legend><div className={styles.avatars}>{(Object.keys(avatarLabels) as Preferences['avatar'][]).map(kind=><label key={kind}><input type="radio" aria-label={avatarLabels[kind]} name="avatar" value={kind} checked={draft.avatar===kind} onChange={()=>set('avatar',kind)}/><PixelAvatar kind={kind}/><span>{avatarLabels[kind]}</span></label>)}</div></fieldset>
      <Button disabled={busy} type="submit">{busy?'Salvando…':'Salvar preferências'}</Button>
    </form>
    <section className={`${styles.panel} ${styles.form}`}><h2>Sua conta</h2><p>E-mail atual: <strong>{email}</strong></p>
      <p className={styles.hint}>A senha é alterada pelo link de recuperação enviado ao seu e-mail.</p>
      <Button disabled={busy} variant="secondary" onClick={()=>perform(async()=>{const data=await request('/api/account','POST',{action:'password-link'},context.userId);setMessage(data.message);})}>Receber link para alterar senha</Button>
    </section>
    <form className={`${styles.panel} ${styles.form}`} onSubmit={e=>{e.preventDefault();void perform(async()=>{try{const data=await request('/api/account','POST',{action:'email',email:newEmail,password},context.userId);setMessage(data.message);}finally{setPassword('');}});}}>
      <h2>Alterar e-mail</h2><p className={styles.hint}>Confirme sua senha atual. O Supabase pedirá a confirmação por e-mail antes de concluir.</p>
      <label>Novo e-mail<input type="email" autoComplete="email" maxLength={254} required value={newEmail} onChange={e=>setEmail(e.target.value)}/></label>
      <label>Senha atual<input type="password" autoComplete="current-password" maxLength={256} required value={password} onChange={e=>setPassword(e.target.value)}/></label>
      <Button variant="secondary" type="submit" disabled={busy}>Solicitar alteração de e-mail</Button>
    </form>
    <section className={styles.panel}><h2>Até o próximo capítulo</h2><p className={styles.hint}>Seu progresso permanece salvo. Pause o foco pelos controles antes de sair.</p><div className={styles.actions}><Button variant="secondary" disabled={busy} onClick={()=>perform(async()=>{await request('/api/account','POST',{action:'logout'},context.userId);await browserClient().auth.signOut({scope:'local'});router.replace('/auth');router.refresh();})}>Sair da conta</Button></div></section>
    <div className={styles.actions}><PortalLink href="/?panel=preferences">Privacidade e dados do universo</PortalLink></div>
  </>;
}
