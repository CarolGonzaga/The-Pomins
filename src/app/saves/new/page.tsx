import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverClient } from '@/lib/supabase/server';
import { requireSaveUser } from '@/features/game-saves/manager';
import { NewSaveForm } from '@/features/game-saves/new-save-form';
import { SaveContextError } from '@/features/game-saves/server';
import styles from '@/features/game-saves/manager.module.css';
export const dynamic='force-dynamic';
export default async function NewSavePage(){
  let user;
  try{user=await requireSaveUser(await serverClient());}catch(e){
    if(e instanceof SaveContextError && e.status===401)redirect('/auth?next=/saves/new');
    return <main id="main" className={styles.page}><h1>Nova partida</h1><p role="alert">Não foi possível conectar. Confira a configuração e tente novamente.</p><Link href="/menu">Voltar ao menu</Link></main>;
  }
  return <main id="main" className={styles.page}><Link href="/menu">Voltar ao menu</Link><h1>Nova partida</h1><NewSaveForm key={user.id} userId={user.id}/></main>;
}
