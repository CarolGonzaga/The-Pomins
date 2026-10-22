import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase/server';
import { archiveSaveSchema,createSaveSchema,listGameSaves,managerError,requireSaveUser,validateManagedSave } from '@/features/game-saves/manager';
import { SaveContextError } from '@/features/game-saves/server';
const headers={'Cache-Control':'private, no-store'};
function failure(e:unknown){
  return NextResponse.json({error:e instanceof SaveContextError?e.message:'Não foi possível acessar suas partidas.'},{status:e instanceof SaveContextError?e.status:503,headers});
}
export async function GET(request:Request){
  try{
    const filter=new URL(request.url).searchParams.get('archived');
    if(filter!==null && filter!=='true' && filter!=='false') throw new SaveContextError('Filtro inválido.',400);
    return NextResponse.json(await listGameSaves(await serverClient(),filter==='true'),{headers});
  }catch(e){return failure(e);}
}
async function mutate(request:Request,archive:boolean){
  let sameOrigin=false;
  try{const origin=new URL(request.headers.get('origin')??'');sameOrigin=origin.host===request.headers.get('host') && ['http:','https:'].includes(origin.protocol);}catch{}
  if(!sameOrigin)return NextResponse.json({error:'Origem não autorizada.'},{status:403,headers});
  try{
    const raw=await request.text();
    if(raw.length>2000)throw new SaveContextError('Requisição inválida.',400);
    let body:unknown;
    try{body=JSON.parse(raw);}catch{throw new SaveContextError('Requisição inválida.',400);}
    const db=await serverClient(),user=await requireSaveUser(db);
    let result,saveId:string|undefined;
    if(archive){
      const parsed=archiveSaveSchema.safeParse(body);
      if(!parsed.success)throw new SaveContextError('Revise a partida.',400);
      const x=parsed.data;saveId=x.saveId;
      result=await db.rpc('set_game_save_archived',{p_save:x.saveId,p_archived:x.archived,p_expected_revision:x.expectedRevision});
    }else{
      const parsed=createSaveSchema.safeParse(body);
      if(!parsed.success)throw new SaveContextError('Escolha um nome de 2 a 80 caracteres.',400);
      result=await db.rpc('create_game_save',{p_request:parsed.data.requestId,p_name:parsed.data.name});
    }
    if(result.error)throw managerError(result.error.code);
    return NextResponse.json({save:validateManagedSave(result.data,user.id,saveId)},{headers});
  }catch(e){return failure(e);}
}
export async function POST(request:Request){return mutate(request,false);}
export async function PATCH(request:Request){return mutate(request,true);}
