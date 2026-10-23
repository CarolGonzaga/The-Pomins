import {NextResponse} from 'next/server';
import {serverClient} from '@/lib/supabase/server';
import {preferencesSchema,readPreferences} from '@/features/preferences/model';
const headers={'Cache-Control':'private, no-store'};
export async function PATCH(request:Request){
  let sameOrigin=false;
  try{const origin=new URL(request.headers.get('origin')??'');sameOrigin=origin.host===request.headers.get('host')&&['http:','https:'].includes(origin.protocol);}catch{}
  if(!sameOrigin)return NextResponse.json({error:'Origem não autorizada.'},{status:403,headers});
  try{
    const raw=await request.text();if(raw.length>2000)return NextResponse.json({error:'Pedido inválido.'},{status:400,headers});
    const input=preferencesSchema.safeParse(JSON.parse(raw));
    if(!input.success)return NextResponse.json({error:'Revise suas preferências.'},{status:400,headers});
    const db=await serverClient(),{data:{user},error}=await db.auth.getUser();
    if(error||!user)return NextResponse.json({error:'Entre novamente.'},{status:401,headers});
    if(request.headers.get('x-pomins-account')!==user.id)return NextResponse.json({error:'A conta mudou. Recarregue antes de salvar.'},{status:409,headers});
    const result=await db.auth.updateUser({data:{pomins_preferences:input.data}});
    if(result.error||!result.data.user||result.data.user.id!==user.id)return NextResponse.json({error:'Não foi possível salvar as preferências. Tente novamente.'},{status:503,headers});
    return NextResponse.json({userId:user.id,preferences:readPreferences(result.data.user.user_metadata)},{headers});
  }catch{return NextResponse.json({error:'Não foi possível salvar. Confira a conexão e o formulário.'},{status:400,headers});}
}
