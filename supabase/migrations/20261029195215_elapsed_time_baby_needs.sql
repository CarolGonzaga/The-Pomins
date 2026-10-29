-- 6F: local proposal. Inactive until a separately approved server-time activation.
-- No historical backfill, no account clock, no focus/economy migration replay.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
alter table public.characters add column needs_settled_at timestamptz;
create function game_private.valid_baby_need_values(v jsonb) returns boolean
language sql immutable set search_path='' as $$
 select jsonb_typeof(v)='object' and v ?& array['satiety','hygiene','energy','affection','fun']
 and (v-array['satiety','hygiene','energy','affection','fun'])='{}'::jsonb
 and not exists(select 1 from jsonb_each(v) e where jsonb_typeof(e.value)<>'number' or e.value::numeric<0 or e.value::numeric>100);
$$;
create table game_private.baby_need_rule_versions(
 version integer primary key check(version>0),
 rates_per_hour jsonb not null check(game_private.valid_baby_need_values(rates_per_hour)),
 effective_at timestamptz unique, created_at timestamptz not null default clock_timestamp()
);
create table game_private.baby_need_release(singleton boolean primary key default true check(singleton),activation_at timestamptz);
alter table game_private.baby_need_rule_versions enable row level security;
alter table game_private.baby_need_release enable row level security;
revoke all on game_private.baby_need_rule_versions,game_private.baby_need_release from public,anon,authenticated;
insert into game_private.baby_need_release(singleton) values(true);
insert into game_private.baby_need_rule_versions(version,rates_per_hour) values(1,'{"satiety":2.5,"hygiene":1.5,"energy":1.8,"affection":1.3,"fun":2.0}');
create function game_private.freeze_baby_need_rules() returns trigger language plpgsql set search_path='' as $$
begin
 if old.effective_at is not null then
  if tg_op='DELETE' then raise exception 'Published need rules are immutable';end if;
  if new is distinct from old then raise exception 'Published need rules are immutable';end if;
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
create trigger baby_need_rules_immutable before update or delete on game_private.baby_need_rule_versions for each row execute function game_private.freeze_baby_need_rules();
create function game_private.freeze_baby_need_activation() returns trigger language plpgsql set search_path='' as $$
begin
 if old.activation_at is not null then
  if tg_op='DELETE' then raise exception 'Need activation is immutable';end if;
  if new is distinct from old then raise exception 'Need activation is immutable';end if;
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
create trigger baby_need_activation_immutable before update or delete on game_private.baby_need_release for each row execute function game_private.freeze_baby_need_activation();

-- Pure projection: the only public callers supply clock_timestamp(), never browser dates.
-- Numeric JSONB retains fractional points through repeated settlements.
create function game_private.project_baby_needs(c public.characters,p_now timestamptz) returns jsonb
language plpgsql stable set search_path='' as $$
declare activation timestamptz;anchor timestamptz;v integer;result jsonb:=c.needs;r record;e record;seconds numeric;value numeric;
begin
 select activation_at into strict activation from game_private.baby_need_release where singleton;
 if activation is null or activation>p_now then
  return jsonb_build_object('needs',c.needs,'clock',jsonb_build_object('active',false,'server_now',p_now,'activation_at',activation,'version',null));
 end if;
 if not exists(select 1 from game_private.baby_need_rule_versions where effective_at<=activation) then raise exception 'Need configuration unavailable';end if;
 if not game_private.valid_baby_need_values(c.needs) then raise exception 'Invalid need baseline';end if;
 anchor:=greatest(activation,c.born_at,c.needs_settled_at);
 for r in select *,lead(effective_at) over(order by effective_at) next_at from game_private.baby_need_rule_versions where effective_at is not null order by effective_at loop
  seconds:=greatest(0,extract(epoch from least(p_now,coalesce(r.next_at,p_now))-greatest(anchor,r.effective_at)));
  if r.effective_at<=p_now then v:=r.version;end if;
  if seconds>0 then
   for e in select * from jsonb_each_text(r.rates_per_hour) loop
    value:=greatest(0,least(100,(result->>e.key)::numeric-e.value::numeric*seconds/3600));
    result:=jsonb_set(result,array[e.key],to_jsonb(value));
   end loop;
  end if;
 end loop;
 return jsonb_build_object('needs',result,'clock',jsonb_build_object('active',true,'server_now',p_now,'activation_at',activation,'version',v,'anchor_at',anchor));
end $$;

create or replace function public.baby_state_for_save(p_save uuid,p_character uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); c public.characters; h public.households; r jsonb; projection jsonb;
begin
 if u is null then raise exception 'Authentication required'; end if;
 perform 1 from public.profiles where id=u for share;
 perform game_private.checked_save(p_save);
 select * into h from public.households where save_id=p_save and user_id=u and id=(select primary_household_id from public.game_saves where id=p_save);
 select * into c from public.characters where id=p_character and user_id=u and household_id=h.id
   and archived_at is null and render_system='legacy' and life_stage='baby';
 if not found then raise exception 'Baby not found'; end if;
 projection:=game_private.project_baby_needs(c,clock_timestamp());c.needs:=projection->'needs';
 select rules into r from public.baby_care_config where id;
 return jsonb_build_object('needs_clock',projection->'clock','revision',(select world_revision from public.game_saves where id=p_save),'save_id',p_save,'world_revision',(select world_revision from public.game_saves where id=p_save),'focus_revision',(select focus_revision from public.profiles where id=u),'household_id',h.id,'character',to_jsonb(c),'rules',r,
   'stats',jsonb_build_object('needs',c.needs,'skills',c.skills,'traits',c.care_traits,'progress_minutes',c.progress_minutes,
     'care_types',coalesce((select jsonb_agg(distinct payload->>'activity') from public.game_events where user_id=u and character_id=c.id and kind='BabyCare'),'[]'::jsonb),
     'history',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'created_at',e.created_at,'activity',e.payload->>'activity','minutes',e.payload->'minutes','rules_version',e.payload->'rules_version') order by e.created_at desc,e.id) from
       (select * from public.game_events where user_id=u and character_id=c.id and kind='BabyCare' order by created_at desc,id limit 50) e),'[]'::jsonb)),
   'credits',coalesce((select jsonb_agg(to_jsonb(f) order by created_at,session_id) from public.focus_credits f where user_id=u),'[]'::jsonb));
end; $$;

create or replace function public.purchase_baby_care(p_save uuid,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid();c public.characters;p public.economy_purchase_requests;o public.economy_offer_versions;
 rid uuid;char_id uuid;action text;intent jsonb;cr public.focus_credits;left_minutes integer;use_minutes integer;idx integer:=0;allocation uuid;
 effects jsonb;n jsonb;s jsonb;t jsonb;e record;sources jsonb:='[]';v_receipt jsonb;balance integer;rule_version integer;projection jsonb;settled_at timestamptz;
begin
 if u is null then raise exception 'Authentication required';end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>2000
  or not(p_payload ?& array['requestId','characterId','activity'])
  or (p_payload-array['requestId','characterId','activity'])<>'{}'::jsonb then raise exception 'Invalid care intent';end if;
 rid:=(p_payload->>'requestId')::uuid;char_id:=(p_payload->>'characterId')::uuid;action:=p_payload->>'activity';
 if rid is null or char_id is null or action not in ('baby_feed','baby_bath','baby_diaper','baby_play','baby_cuddle','baby_sleep') or action is null then raise exception 'Invalid care intent';end if;
 -- Existing outer lock, then destination character, then FIFO credits. No focus engine changes.
 perform 1 from public.profiles where id=u for update;if not found then raise exception 'Account not found';end if;
 perform game_private.checked_save(p_save);
 select * into c from public.characters where id=char_id and user_id=u and save_id=p_save and archived_at is null and render_system='legacy' and life_stage='baby' for update;
 if not found then raise exception 'Baby not found';end if;
 intent:=jsonb_build_object('saveId',p_save,'characterId',char_id,'activity',action);
 select * into p from public.economy_purchase_requests where user_id=u and request_id=rid;
 if found then
  if p.state<>'committed' or p.request_payload<>intent or p.kind<>'care' then raise exception 'Request ID already used';end if;
  return public.baby_state_for_save(p_save,c.id)||jsonb_build_object('receipt',p.receipt,'care_pricing',public.baby_care_catalog());
 end if;
 if exists(select 1 from public.allocation_requests where id=rid) then raise exception 'Request ID already used';end if;
 select * into o from public.economy_offer_versions where kind='care' and activity_id=action and enabled_at<=clock_timestamp() order by version desc limit 1 for share;
 if not found or o.price_minutes<>2 then raise exception 'Care price unavailable';end if;
 effects:=o.effects_snapshot->'per_minute';rule_version:=(o.effects_snapshot->>'care_rules_version')::integer;
 if effects is null or rule_version is null then raise exception 'Care configuration unavailable';end if;
 select coalesce(sum(eligible_minutes-allocated_minutes),0)::integer into balance from public.focus_credits where user_id=u;
 if balance<o.price_minutes then raise exception using message='Insufficient minutes',errcode='P0001';end if;
 insert into public.economy_purchase_requests(user_id,request_id,request_payload,kind,offer_id,offer_version,price_minutes,save_id,character_id)
  values(u,rid,intent,'care',o.id,o.version,o.price_minutes,p_save,c.id) returning * into p;
 insert into public.allocation_requests(id,user_id,payload) values(rid,u,jsonb_build_object('paidCare',intent));
 left_minutes:=o.price_minutes;
 for cr in select * from public.focus_credits where user_id=u and allocated_minutes<eligible_minutes order by created_at,session_id for update loop
  use_minutes:=least(left_minutes,cr.eligible_minutes-cr.allocated_minutes);idx:=idx+1;
  update public.focus_credits set allocated_minutes=allocated_minutes+use_minutes where session_id=cr.session_id;
  insert into public.focus_allocations(request_id,line,session_id,user_id,save_id,character_id,activity_id,minutes,effects_snapshot,effects_version,effect_status)
   values(rid,idx,cr.session_id,u,p_save,c.id,action,use_minutes,jsonb_build_object('per_minute',effects,'purchase_id',p.id,'offer_version',o.version),o.version,'recorded') returning id into allocation;
  insert into public.economy_purchase_sources(purchase_id,user_id,line,session_id,minutes,allocation_id) values(p.id,u,idx,cr.session_id,use_minutes,allocation);
  sources:=sources||jsonb_build_array(jsonb_build_object('sessionId',cr.session_id,'minutes',use_minutes,'allocationId',allocation));
  left_minutes:=left_minutes-use_minutes;exit when left_minutes=0;
 end loop;
 if left_minutes<>0 then raise exception 'Insufficient minutes';end if;
 settled_at:=clock_timestamp();projection:=game_private.project_baby_needs(c,settled_at);c.needs:=projection->'needs';
 n:=c.needs;s:=c.skills;t:=c.care_traits;
 for e in select * from jsonb_each_text(effects->'needs') loop
  if e.key not in ('satiety','hygiene','energy','affection','fun') or e.value::integer<0 then raise exception 'Invalid care need';end if;
  n:=jsonb_set(n,array[e.key],to_jsonb(least(100,(n->>e.key)::numeric+e.value::numeric*o.price_minutes)));
 end loop;
 for e in select * from jsonb_each_text(effects->'skills') loop
  if e.key not in ('knowledge','creativity','sociability','autonomy','wellbeing') or e.value::integer<0 then raise exception 'Invalid care skill';end if;
  s:=jsonb_set(s,array[e.key],to_jsonb((s->>e.key)::integer+e.value::integer*o.price_minutes));
 end loop;
 for e in select * from jsonb_each_text(effects->'traits') loop
  if e.key not in ('curiosity','sociability','secure_attachment') or e.value::integer<0 then raise exception 'Invalid care trait';end if;
  t:=jsonb_set(t,array[e.key],to_jsonb((t->>e.key)::integer+e.value::integer*o.price_minutes));
 end loop;
 update public.characters set needs=n,needs_settled_at=case when (projection->'clock'->>'active')::boolean then settled_at else needs_settled_at end,skills=s,care_traits=t,progress_minutes=progress_minutes+o.price_minutes where id=c.id;
 update public.focus_allocations set effects_snapshot=effects_snapshot||jsonb_build_object('needs_clock',projection->'clock','effect_scope','care_request_total','request_minutes',o.price_minutes,'before',jsonb_build_object('needs',c.needs,'skills',c.skills,'traits',c.care_traits),'after',jsonb_build_object('needs',n,'skills',s,'traits',t)) where request_id=rid and user_id=u;
 insert into public.game_events(user_id,save_id,character_id,kind,payload) values(u,p_save,c.id,'BabyCare',jsonb_build_object('requestId',rid,'purchaseId',p.id,'activity',action,'minutes',o.price_minutes,'rules_version',rule_version,'offer_version',o.version,'effects',effects,'needs',n,'skills',s,'traits',t));
 v_receipt:=jsonb_build_object('purchaseId',p.id,'requestId',rid,'saveId',p_save,'characterId',c.id,'activity',action,'offerVersion',o.version,'chargedMinutes',o.price_minutes,'balanceAfter',balance-o.price_minutes,'sources',sources,'createdAt',clock_timestamp());
 update public.economy_purchase_requests set state='committed',committed_at=clock_timestamp(),receipt=v_receipt where id=p.id;
 return public.baby_state_for_save(p_save,c.id)||jsonb_build_object('receipt',v_receipt,'care_pricing',public.baby_care_catalog());
end $$;

revoke all on function game_private.valid_baby_need_values(jsonb),game_private.freeze_baby_need_rules(),game_private.freeze_baby_need_activation(),game_private.project_baby_needs(public.characters,timestamptz) from public,anon,authenticated;
revoke all on function public.baby_state_for_save(uuid,uuid),public.purchase_baby_care(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.baby_state_for_save(uuid,uuid),public.purchase_baby_care(uuid,jsonb) to authenticated;
comment on function game_private.project_baby_needs(public.characters,timestamptz) is '6F on-demand numeric projection. No writes, spending, cron or continuity consequences.';
commit;
