-- PROPOSED ONLY. Apply after both existing migrations, with explicit remote approval.
-- CLI is unavailable in this workspace; promote with `supabase migration new baby_care`
-- and copy this reviewed SQL before deployment. Never reapply the initial remote batch.
-- No existing rows, functions, migrations, focus rules or balances are replaced.
begin;

alter table public.characters add column care_traits jsonb not null default '{"curiosity":0,"sociability":0,"secure_attachment":0}';
create table public.baby_care_config (
  id boolean primary key default true check(id),
  rules jsonb not null check(jsonb_typeof(rules)='object')
);
insert into public.baby_care_config(rules) values ('{
 "version":1,"growth":{"minutes":30,"distinctCare":4,"requiresBirth":true},
 "effects":{
 "baby_feed":{"needs":{"satiety":12},"skills":{"wellbeing":1},"traits":{}},
 "baby_bath":{"needs":{"hygiene":10},"skills":{"wellbeing":1},"traits":{}},
 "baby_diaper":{"needs":{"hygiene":12},"skills":{"wellbeing":1},"traits":{}},
 "baby_play":{"needs":{"fun":12},"skills":{"creativity":1},"traits":{"curiosity":1}},
 "baby_cuddle":{"needs":{"affection":12},"skills":{"sociability":1},"traits":{"sociability":1,"secure_attachment":1}},
 "baby_sleep":{"needs":{"energy":12},"skills":{"wellbeing":1},"traits":{}}
 }}');
alter table public.baby_care_config enable row level security;
revoke all on public.baby_care_config from public,anon,authenticated;
grant select on public.baby_care_config to authenticated;
create policy read_care_rules on public.baby_care_config for select to authenticated using(true);

-- Reuse the existing allocation ledger/FK without offering baby actions to adult RPCs.
insert into public.activities(id,allowed_stages,destination,animation,effects)
select action,'["baby"]'::jsonb,'{}'::jsonb,'idle','{}'::jsonb
from unnest(array['baby_feed','baby_bath','baby_diaper','baby_play','baby_cuddle','baby_sleep']) action;
create index baby_care_history on public.game_events(user_id,character_id,created_at desc) where kind='BabyCare';

create function public.baby_state(p_character uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); c public.characters; h public.households; r jsonb;
begin
 if u is null then raise exception 'Authentication required'; end if;
 perform 1 from public.profiles where id=u for share;
 select * into h from public.households where user_id=u;
 select * into c from public.characters where id=p_character and user_id=u and household_id=h.id
   and archived_at is null and render_system='legacy' and life_stage='baby';
 if not found then raise exception 'Baby not found'; end if;
 select rules into r from public.baby_care_config where id;
 return jsonb_build_object('revision',h.revision,'household_id',h.id,'character',to_jsonb(c),'rules',r,
   'stats',jsonb_build_object('needs',c.needs,'skills',c.skills,'traits',c.care_traits,'progress_minutes',c.progress_minutes,
     'care_types',coalesce((select jsonb_agg(distinct payload->>'activity') from public.game_events where user_id=u and character_id=c.id and kind='BabyCare'),'[]'::jsonb),
     'history',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'created_at',e.created_at,'activity',e.payload->>'activity','minutes',e.payload->'minutes','rules_version',e.payload->'rules_version') order by e.created_at desc,e.id) from
       (select * from public.game_events where user_id=u and character_id=c.id and kind='BabyCare' order by created_at desc,id limit 50) e),'[]'::jsonb)),
   'credits',coalesce((select jsonb_agg(to_jsonb(f) order by created_at,session_id) from public.focus_credits f where user_id=u),'[]'::jsonb));
end; $$;

create function public.baby_care(p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); h uuid; c public.characters; req public.allocation_requests;
 rid uuid; action text; l jsonb; credit public.focus_credits; mins integer; total integer:=0; idx integer:=0;
 r jsonb; effects jsonb; e record; n jsonb; s jsonb; t jsonb; request_payload jsonb;
begin
 if u is null then raise exception 'Authentication required'; end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>12000 then raise exception 'Invalid payload'; end if;
 -- Same lock order as room_command/focus_command. Serializes adult/baby spending.
 perform 1 from public.profiles where id=u for update;
 select id into h from public.households where user_id=u;
 if h is null then raise exception 'Household not found'; end if;
 select * into c from public.characters where id=(p_payload->>'characterId')::uuid and user_id=u and household_id=h
   and archived_at is null and render_system='legacy' and life_stage='baby' for update;
 if not found then raise exception 'Baby not found'; end if;
 rid:=(p_payload->>'requestId')::uuid;
 if rid is null then raise exception 'Request ID required'; end if;
 request_payload:=jsonb_build_object('babyCare',p_payload);
 select * into req from public.allocation_requests where id=rid;
 if found then
   if req.user_id=u and req.payload=request_payload then return public.baby_state(c.id); end if;
   raise exception 'Request ID already used';
 end if;
 action:=p_payload->>'activity';
 if action is null or action not in ('baby_feed','baby_bath','baby_diaper','baby_play','baby_cuddle','baby_sleep') then raise exception 'Invalid care'; end if;
 if jsonb_typeof(p_payload->'lines') is distinct from 'array' or jsonb_array_length(p_payload->'lines') not between 1 and 20 then raise exception 'Invalid lines'; end if;
 select rules into r from public.baby_care_config where id;
 effects:=r->'effects'->action;
 if effects is null then raise exception 'Care configuration unavailable'; end if;
 insert into public.allocation_requests(id,user_id,payload) values(rid,u,request_payload);
 for l in select * from jsonb_array_elements(p_payload->'lines') loop
   idx:=idx+1;
   if jsonb_typeof(l->'minutes') is distinct from 'number' then raise exception 'Invalid minutes'; end if;
   mins:=(l->>'minutes')::integer;
   if mins not between 1 and 120 or (l->>'minutes')::numeric<>mins then raise exception 'Invalid minutes'; end if;
   select * into credit from public.focus_credits where session_id=(l->>'sessionId')::uuid and user_id=u for update;
   if not found or credit.eligible_minutes-credit.allocated_minutes<mins then raise exception 'Insufficient minutes'; end if;
   update public.focus_credits set allocated_minutes=allocated_minutes+mins where session_id=credit.session_id;
   insert into public.focus_allocations(request_id,line,session_id,user_id,character_id,activity_id,minutes)
     values(rid,idx,credit.session_id,u,c.id,action,mins);
   total:=total+mins;
 end loop;
 n:=c.needs; s:=c.skills; t:=c.care_traits;
 for e in select * from jsonb_each_text(effects->'needs') loop
   if e.key not in ('satiety','hygiene','energy','affection','fun') or e.value::integer<0 then raise exception 'Invalid care need'; end if;
   n:=jsonb_set(n,array[e.key],to_jsonb(least(100,(n->>e.key)::integer+e.value::integer*total)));
 end loop;
 for e in select * from jsonb_each_text(effects->'skills') loop
   if e.key not in ('knowledge','creativity','sociability','autonomy','wellbeing') or e.value::integer<0 then raise exception 'Invalid care skill'; end if;
   s:=jsonb_set(s,array[e.key],to_jsonb((s->>e.key)::integer+e.value::integer*total));
 end loop;
 for e in select * from jsonb_each_text(effects->'traits') loop
   if e.key not in ('curiosity','sociability','secure_attachment') or e.value::integer<0 then raise exception 'Invalid care trait'; end if;
   t:=jsonb_set(t,array[e.key],to_jsonb((t->>e.key)::integer+e.value::integer*total));
 end loop;
 update public.characters set needs=n,skills=s,care_traits=t,progress_minutes=progress_minutes+total where id=c.id;
 insert into public.game_events(user_id,character_id,kind,payload) values(u,c.id,'BabyCare',jsonb_build_object(
   'requestId',rid,'activity',action,'minutes',total,'rules_version',r->'version','effects',effects,'needs',n,'skills',s,'traits',t));
 update public.households set revision=revision+1 where id=h;
 return public.baby_state(c.id);
end; $$;

revoke all on function public.baby_state(uuid),public.baby_care(jsonb) from public,anon,authenticated;
grant execute on function public.baby_state(uuid),public.baby_care(jsonb) to authenticated;
commit;
