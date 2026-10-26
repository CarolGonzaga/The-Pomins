-- 6D-B: activate fixed-price baby care only. Continuity/cosmetics remain locked.
-- Apply remotely only with separate authorization and a fresh verified backup.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';

alter table public.economy_offer_versions drop constraint economy_offers_6da_locked;
alter table public.economy_offer_versions add constraint economy_offers_6db_locked check(enabled_at is null or kind='care');
alter table public.economy_purchase_requests drop constraint economy_purchases_6da_locked;
alter table public.economy_purchase_requests add constraint economy_purchases_6db_locked check(
 (state='planned' and committed_at is null) or
 (kind='care' and price_minutes=2 and state='committed' and committed_at is not null)
);
insert into public.economy_offer_versions(id,version,kind,activity_id,price_minutes,effects_snapshot,enabled_at)
 select a.id,2,'care',a.id,2,jsonb_build_object('per_minute',r.rules->'effects'->a.id,'care_rules_version',r.rules->'version'),clock_timestamp()
 from public.activities a cross join public.baby_care_config r
 where a.id in ('baby_feed','baby_bath','baby_diaper','baby_play','baby_cuddle','baby_sleep');

create function game_private.freeze_care_price_version() returns trigger language plpgsql set search_path='' as $$
begin
 if (old.enabled_at is not null or (old.kind='care' and old.version>=2)) and (new.id,new.version,new.kind,new.activity_id,new.cosmetic_id,new.cosmetic_free,new.price_minutes,new.effects_snapshot)
  is distinct from (old.id,old.version,old.kind,old.activity_id,old.cosmetic_id,old.cosmetic_free,old.price_minutes,old.effects_snapshot) then
  raise exception 'Published offer version is immutable';
 end if;return new;
end $$;
create trigger freeze_published_care_version before update on public.economy_offer_versions for each row execute function game_private.freeze_care_price_version();

create function public.baby_care_catalog() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 return jsonb_build_object('ready',true,'offers',coalesce((select jsonb_agg(jsonb_build_object('activity',activity_id,'price_minutes',price_minutes,'version',version) order by activity_id) from
  (select distinct on(activity_id) activity_id,price_minutes,version from public.economy_offer_versions where kind='care' and enabled_at<=clock_timestamp() order by activity_id,version desc) offers),'[]'::jsonb));
end $$;

create function public.purchase_baby_care(p_save uuid,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid();c public.characters;p public.economy_purchase_requests;o public.economy_offer_versions;
 rid uuid;char_id uuid;action text;intent jsonb;cr public.focus_credits;left_minutes integer;use_minutes integer;idx integer:=0;allocation uuid;
 effects jsonb;n jsonb;s jsonb;t jsonb;e record;sources jsonb:='[]';v_receipt jsonb;balance integer;rule_version integer;
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
 n:=c.needs;s:=c.skills;t:=c.care_traits;
 for e in select * from jsonb_each_text(effects->'needs') loop
  if e.key not in ('satiety','hygiene','energy','affection','fun') or e.value::integer<0 then raise exception 'Invalid care need';end if;
  n:=jsonb_set(n,array[e.key],to_jsonb(least(100,(n->>e.key)::integer+e.value::integer*o.price_minutes)));
 end loop;
 for e in select * from jsonb_each_text(effects->'skills') loop
  if e.key not in ('knowledge','creativity','sociability','autonomy','wellbeing') or e.value::integer<0 then raise exception 'Invalid care skill';end if;
  s:=jsonb_set(s,array[e.key],to_jsonb((s->>e.key)::integer+e.value::integer*o.price_minutes));
 end loop;
 for e in select * from jsonb_each_text(effects->'traits') loop
  if e.key not in ('curiosity','sociability','secure_attachment') or e.value::integer<0 then raise exception 'Invalid care trait';end if;
  t:=jsonb_set(t,array[e.key],to_jsonb((t->>e.key)::integer+e.value::integer*o.price_minutes));
 end loop;
 update public.characters set needs=n,skills=s,care_traits=t,progress_minutes=progress_minutes+o.price_minutes where id=c.id;
 update public.focus_allocations set effects_snapshot=effects_snapshot||jsonb_build_object('effect_scope','care_request_total','request_minutes',o.price_minutes,'before',jsonb_build_object('needs',c.needs,'skills',c.skills,'traits',c.care_traits),'after',jsonb_build_object('needs',n,'skills',s,'traits',t)) where request_id=rid and user_id=u;
 insert into public.game_events(user_id,save_id,character_id,kind,payload) values(u,p_save,c.id,'BabyCare',jsonb_build_object('requestId',rid,'purchaseId',p.id,'activity',action,'minutes',o.price_minutes,'rules_version',rule_version,'offer_version',o.version,'effects',effects,'needs',n,'skills',s,'traits',t));
 v_receipt:=jsonb_build_object('purchaseId',p.id,'requestId',rid,'saveId',p_save,'characterId',c.id,'activity',action,'offerVersion',o.version,'chargedMinutes',o.price_minutes,'balanceAfter',balance-o.price_minutes,'sources',sources,'createdAt',clock_timestamp());
 update public.economy_purchase_requests set state='committed',committed_at=clock_timestamp(),receipt=v_receipt where id=p.id;
 return public.baby_state_for_save(p_save,c.id)||jsonb_build_object('receipt',v_receipt,'care_pricing',public.baby_care_catalog());
end $$;

-- One executor for new and old RPC names. Historical retries remain read-only.
create or replace function public.baby_care_for_save(p_save uuid,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();r public.allocation_requests;char_id uuid;begin
 if u is null then raise exception 'Authentication required';end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>12000 then raise exception 'Invalid care intent';end if;
 if p_payload ? 'lines' then
  perform 1 from public.profiles where id=u for update;perform game_private.checked_save(p_save);
  char_id:=(p_payload->>'characterId')::uuid;
  select * into r from public.allocation_requests where id=(p_payload->>'requestId')::uuid and user_id=u;
  if not found or r.payload<>jsonb_build_object('babyCare',p_payload)
   or not exists(select 1 from public.focus_allocations where request_id=r.id)
   or exists(select 1 from public.focus_allocations where request_id=r.id and (user_id<>u or save_id<>p_save or character_id<>char_id)) then
    raise exception 'Legacy care disabled; use fixed-price intent';
  end if;
  return public.baby_state_for_save(p_save,char_id);
 end if;
 return public.purchase_baby_care(p_save,p_payload);
end $$;

create or replace function public.get_economy_foundation() returns jsonb
 language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();r public.economy_rule_versions; f public.focus_sessions; v_release game_private.economy_release;
begin
 if u is null then raise exception 'Authentication required';end if;
 select * into strict v_release from game_private.economy_release where singleton;
 select * into strict r from public.economy_rule_versions where version=v_release.rules_version;
 -- Always derive the latest completion from the validated ledger, not the migration observation.
 select * into f from public.focus_sessions where user_id=u and status='completed'
   and validated_ms>=planned_seconds::bigint*1000 and ended_at is not null order by ended_at desc,id desc limit 1;
 return jsonb_build_object('active',false,'activation_at',v_release.activation_at,'server_now',clock_timestamp(),
  'rules_version',r.version,'rules',to_jsonb(r),
  'last_valid_focus',case when f.id is null then null else jsonb_build_object('session_id',f.id,'completed_at',f.ended_at) end,
  'available_minutes',coalesce((select sum(eligible_minutes-allocated_minutes) from public.focus_credits where user_id=u),0),
  'care_offers',(select coalesce(jsonb_agg(jsonb_build_object('activity_id',activity_id,'version',version,'price_minutes',price_minutes,'enabled',coalesce(enabled_at<=clock_timestamp(),false)) order by activity_id),'[]') from (select distinct on(activity_id) * from public.economy_offer_versions where kind='care' order by activity_id,(enabled_at is not null and enabled_at<=clock_timestamp()) desc,version desc) care));
end $$;

revoke all on function public.purchase_baby_care(uuid,jsonb),public.baby_care_catalog(),game_private.freeze_care_price_version() from public,anon,authenticated;
grant execute on function public.purchase_baby_care(uuid,jsonb),public.baby_care_catalog() to authenticated;
comment on function public.purchase_baby_care(uuid,jsonb) is '6D-B fixed price; account -> character -> FIFO credits; atomic debit/effects/receipt. No continuity activation.';
commit;

