import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverClient } from '@/lib/supabase/server';
import { listGameSaves } from '@/features/game-saves/manager';
import { SaveContextError } from '@/features/game-saves/server';
import { SaveManager } from '@/features/game-saves/save-manager';
import styles from '@/features/game-saves/manager.module.css';
export const dynamic='force-dynamic';
export default async function SavesPage({searchParams}:{searchParams:Promise<{archived?:string}>}){
  const archived=(await searchParams).archived==='true';
  let result,error;
  try{result=await listGameSaves(await serverClient(),archived);}catch(e){
    if(e instanceof SaveContextError && e.status===401)redirect('/auth?next=/saves');
    error=e instanceof SaveContextError?e.message:'Não foi possível carregar suas partidas. Confira a configuração e tente novamente.';
  }
  return <main id="main" className={styles.page}>
    <Link href="/" className="brand">pomins.</Link>
    <header className={styles.header}><div><span className="eyebrow">CRIE. VIVA. CONTINUE.</span><h1>Suas partidas</h1><p>Cada história tem seu próprio mundo. Seu foco acompanha você.</p></div><Link href="/saves/new">Nova partida</Link></header>
    <nav className={styles.tabs} aria-label="Lista de partidas"><Link href="/saves" aria-current={!archived?'page':undefined}>Em andamento</Link><Link href="/saves?archived=true" aria-current={archived?'page':undefined}>Arquivadas</Link></nav>
    {error?<div role="alert" className={styles.alert}>{error} <Link href={archived?'/saves?archived=true':'/saves'}>Tentar novamente</Link></div>:result && <SaveManager key={`${result.userId}:${archived}`} entries={result.entries} archived={archived}/>}
  </main>;
}
