import {gameSaveSchema} from './model';
export async function saveManagerMutation(method:'POST'|'PATCH',body:unknown){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch('/api/game-saves',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
    const data=await response.json();
    if(!response.ok)throw Error(data.error??'Não foi possível salvar.');
    return gameSaveSchema.parse(data.save);
  }catch(e){
    if(e instanceof Error && e.name==='AbortError')throw Error('A confirmação demorou. Confira a conexão e repita o mesmo pedido.');
    throw e;
  }finally{clearTimeout(timeout);}
}
