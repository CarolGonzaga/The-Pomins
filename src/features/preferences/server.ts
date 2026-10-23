import {cache} from 'react';
import {redirect} from 'next/navigation';
import {serverClient} from '@/lib/supabase/server';
import {readPreferences} from './model';
export const getAccount=cache(async()=>{
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)return null;
  const db=await serverClient();
  const {data:{user},error}=await db.auth.getUser();
  if(!user){
    if(error && error.name!=='AuthSessionMissingError' && ![400,401,403].includes(error.status??0))throw Error('Não foi possível verificar sua conta. Tente novamente.');
    return null;
  }
  return {id:user.id,email:user.email??'',nickname:typeof user.user_metadata?.nickname==='string'?user.user_metadata.nickname:'Seu espaço',preferences:readPreferences(user.user_metadata)};
});
export async function requireAccount(path:'/menu'|'/rules'|'/settings'){
  const account=await getAccount();
  if(!account)redirect('/auth?next='+encodeURIComponent(path));
  return account;
}
