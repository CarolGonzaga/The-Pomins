import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {z} from 'zod';
import {serverClient} from '@/lib/supabase/server';
const headers={'Cache-Control':'private, no-store'};
const schema=z.discriminatedUnion('action',[
  z.object({action:z.literal('email'),email:z.email().max(254),password:z.string().min(1).max(256)}).strict(),
  z.object({action:z.literal('password-link')}).strict(),
  z.object({action:z.literal('logout')}).strict(),
]);
export async function POST(request:Request){
  let sameOrigin=false;
  try{const origin=new URL(request.headers.get('origin')??'');sameOrigin=origin.host===request.headers.get('host')&&['http:','https:'].includes(origin.protocol);}catch{}
  if(!sameOrigin)return NextResponse.json({error:'Origem não autorizada.'},{status:403,headers});
  let verifier:ReturnType<typeof createClient>|undefined;
  try{
    const raw=await request.text();if(raw.length>3000)return NextResponse.json({error:'Pedido inválido.'},{status:400,headers});
    const parsed=schema.safeParse(JSON.parse(raw));if(!parsed.success)return NextResponse.json({error:'Revise os dados da conta.'},{status:400,headers});
    const db=await serverClient(),{data:{user},error}=await db.auth.getUser();
    if(error||!user||!user.email)return NextResponse.json({error:'Entre novamente.'},{status:401,headers});
    if(request.headers.get('x-pomins-account')!==user.id)return NextResponse.json({error:'A conta mudou. Recarregue antes de continuar.'},{status:409,headers});
    const active=await db.from('focus_sessions').select('id').eq('user_id',user.id).eq('status','active').limit(1);
    if(active.error)return NextResponse.json({error:'Não foi possível conferir a sessão de foco.'},{status:503,headers});
    if(active.data?.length)return NextResponse.json({error:'Use os controles do foco para pausar antes de alterar sua conta ou sair.'},{status:409,headers});
    const input=parsed.data;
    if(input.action==='logout'){
      const result=await db.auth.signOut({scope:'local'});
      return result.error?NextResponse.json({error:'Não foi possível sair.'},{status:503,headers}):NextResponse.json({message:'Sessão encerrada neste navegador.'},{headers});
    }
    const appUrl=process.env.NEXT_PUBLIC_APP_URL;
    if(!appUrl)return NextResponse.json({error:'O endereço de retorno da conta precisa ser configurado.'},{status:503,headers});
    const callback=new URL('/auth/callback',new URL(appUrl).origin).href;
    if(input.action==='password-link'){
      const result=await db.auth.resetPasswordForEmail(user.email,{redirectTo:callback+'?next=/auth?mode=update'});
      return result.error?NextResponse.json({error:'Não foi possível enviar. Aguarde um pouco e tente novamente.'},{status:503,headers}):NextResponse.json({message:'Confira seu e-mail e abra o link neste mesmo navegador para escolher uma nova senha.'},{headers});
    }
    const current=await db.auth.getSession();
    if(current.error || !current.data.session?.access_token)return NextResponse.json({error:'Entre novamente para confirmar sua conta.'},{status:401,headers});
    // The JWT was verified by getUser above. Passing it explicitly makes the SDK fetch
    // verified factors instead of trusting the user object stored in a browser cookie.
    const assurance=await db.auth.mfa.getAuthenticatorAssuranceLevel(current.data.session.access_token);
    if(assurance.error || (assurance.data?.nextLevel==='aal2' && assurance.data.currentLevel!=='aal2'))return NextResponse.json({error:'Confirme a verificação adicional da sua conta antes de continuar.'},{status:403,headers});
    verifier=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const reauth=await verifier.auth.signInWithPassword({email:user.email,password:input.password});
    if(reauth.error || reauth.data.user?.id!==user.id)return NextResponse.json({error:'Não foi possível confirmar sua senha atual.'},{status:403,headers});
    const result=await db.auth.updateUser({email:input.email},{emailRedirectTo:callback});
    return result.error?NextResponse.json({error:'Não foi possível solicitar a alteração de e-mail. Confira os dados e tente novamente.'},{status:409,headers}):NextResponse.json({message:'Solicitação enviada. Confirme os links de e-mail solicitados pelo Supabase. A troca só termina após a confirmação.'},{headers});
  }catch{return NextResponse.json({error:'Não foi possível concluir. Confira a conexão e tente novamente.'},{status:503,headers});}
  finally{if(verifier)await verifier.auth.signOut({scope:'local'}).catch(()=>{});}
}
