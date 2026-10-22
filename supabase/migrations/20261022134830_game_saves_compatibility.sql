-- Delivery 5A/5B. LOCAL REHEARSAL ONLY until explicit remote authorization.
-- Expand + backfill + compatibility; no focus time or previous progress is recalculated.
begin;
set local lock_timeout = '5s';

do $$ begin
 if exists(select 1 from public.profiles p left join public.households h on h.user_id=p.id where h.id is null)
 or exists(select 1 from public.characters c left join public.households h on h.id=c.household_id and h.user_id=c.user_id where h.id is null)
 then raise exception 'Resolve missing or foreign households before migrating'; end if;
end $$;

create table public.game_saves (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 name text not null check(char_length(trim(name)) between 2 and 80),
 protagonist_id uuid, primary_household_id uuid,
 current_generation integer not null default 1 check(current_generation>0),
 state text not null default 'draft' check(state in ('draft','pending_selection','ready')),
 format_version integer not null default 1 check(format_version=1),
 world_revision bigint not null default 0 check(world_revision>=0),
 progression jsonb not null default '{}' check(jsonb_typeof(progression)='object'),
 created_at timestamptz not null default now(),last_used_at timestamptz,archived_at timestamptz,
 origin_save_id uuid,origin_snapshot_id uuid check(origin_snapshot_id is null),
 unique(id,user_id),
 foreign key(origin_save_id,user_id) references public.game_saves(id,user_id) deferrable initially deferred,
 check(origin_save_id is distinct from id),
 check(state<>'ready' or (protagonist_id is not null and primary_household_id is not null))
);
create index game_saves_by_owner on public.game_saves(user_id,created_at,id);
alter table public.profiles add column compatibility_save_id uuid;
alter table public.profiles add column focus_revision bigint not null default 0 check(focus_revision>=0);
alter table public.households add column save_id uuid;
alter table public.characters add column save_id uuid;
alter table public.character_memories add column save_id uuid;
alter table public.game_events add column save_id uuid;
alter table public.focus_allocations add column save_id uuid;
alter table public.focus_allocations add column effects_snapshot jsonb;
alter table public.focus_allocations add column effects_version integer;
alter table public.focus_allocations add column effect_status text not null default 'legacy_unknown'
 check(effect_status in ('legacy_unknown','recorded'));
alter table public.focus_sessions add column origin_save_id uuid;

create table public.game_save_migration_audit (
 save_id uuid primary key,user_id uuid not null references public.profiles(id) on delete cascade,
 household_id uuid not null,candidate_ids uuid[] not null,
 strategy text not null check(strategy in ('single_active_character','pending_multiple','empty')),
 previous_household_revision bigint not null,migrated_at timestamptz not null default now(),
 foreign key(save_id,user_id) references public.game_saves(id,user_id) on delete cascade
);

-- One save per existing household. UUIDs of all previous entities remain untouched.
do $$ declare h public.households;s uuid;ids uuid[];n integer;begin
 for h in select * from public.households order by id loop
  select coalesce(array_agg(id order by id) filter(where archived_at is null),'{}'::uuid[])
    into ids from public.characters where household_id=h.id and user_id=h.user_id;
  n:=cardinality(ids);
  insert into public.game_saves(user_id,name,primary_household_id,protagonist_id,current_generation,state,world_revision,progression)
   values(h.user_id,'Minha primeira partida',h.id,case when n=1 then ids[1] end,
    case when n=1 then (select generation from public.characters where id=ids[1]) else 1 end,
    case when n=1 then 'ready' when n>1 then 'pending_selection' else 'draft' end,h.revision,
    jsonb_build_object('migration','existing_household','protagonistSelection',case when n=1 then 'single_active_character' when n>1 then 'pending_multiple' else 'empty' end))
   returning id into s;
  update public.profiles set compatibility_save_id=s where id=h.user_id;
  update public.households set save_id=s where id=h.id;
  update public.characters set save_id=s where household_id=h.id and user_id=h.user_id;
  insert into public.game_save_migration_audit(save_id,user_id,household_id,candidate_ids,strategy,previous_household_revision)
   values(s,h.user_id,h.id,ids,case when n=1 then 'single_active_character' when n>1 then 'pending_multiple' else 'empty' end,h.revision);
 end loop;
end $$;
update public.character_memories m set save_id=c.save_id from public.characters c where c.id=m.character_id and c.user_id=m.user_id;
update public.game_events e set save_id=coalesce(c.save_id,p.compatibility_save_id)
 from public.profiles p left join public.characters c on c.user_id=p.id
 where e.user_id=p.id and (e.character_id=c.id or (e.character_id is null and c.id is null));
-- Account-owned legacy events without a character still belong to the compatibility world.
update public.game_events e set save_id=p.compatibility_save_id from public.profiles p where e.user_id=p.id and e.save_id is null and e.character_id is null;
update public.focus_allocations a set save_id=c.save_id from public.characters c where c.id=a.character_id and c.user_id=a.user_id;
update public.focus_sessions f set origin_save_id=c.save_id from public.characters c where c.id=f.character_id and c.user_id=f.user_id;

-- Flush deferred origin-FK checks before adding further constraints to game_saves.
set constraints all immediate;

alter table public.households alter column save_id set not null;
alter table public.characters alter column save_id set not null;
alter table public.character_memories alter column save_id set not null;
alter table public.game_events alter column save_id set not null;
alter table public.focus_allocations alter column save_id set not null;
alter table public.focus_sessions alter column origin_save_id set not null;
alter table public.households drop constraint households_user_id_key;
drop index public.one_legacy_life;
alter table public.households add unique(id,save_id,user_id);
alter table public.characters add unique(id,save_id,user_id);
alter table public.focus_sessions add unique(id,user_id);
alter table public.focus_credits add unique(session_id,user_id);
alter table public.allocation_requests add unique(id,user_id);
alter table public.households add foreign key(save_id,user_id) references public.game_saves(id,user_id);
alter table public.characters add foreign key(household_id,save_id,user_id) references public.households(id,save_id,user_id);
alter table public.character_memories add foreign key(character_id,save_id,user_id) references public.characters(id,save_id,user_id);
alter table public.game_events add foreign key(character_id,save_id,user_id) references public.characters(id,save_id,user_id);
alter table public.game_events add foreign key(save_id,user_id) references public.game_saves(id,user_id);
alter table public.focus_allocations add foreign key(character_id,save_id,user_id) references public.characters(id,save_id,user_id);
alter table public.focus_allocations add foreign key(session_id,user_id) references public.focus_credits(session_id,user_id);
alter table public.focus_allocations add foreign key(request_id,user_id) references public.allocation_requests(id,user_id);
alter table public.focus_credits add foreign key(session_id,user_id) references public.focus_sessions(id,user_id);
alter table public.focus_sessions add foreign key(character_id,origin_save_id,user_id) references public.characters(id,save_id,user_id);
alter table public.profiles add foreign key(compatibility_save_id,id) references public.game_saves(id,user_id) deferrable initially deferred;
alter table public.game_saves add foreign key(primary_household_id,id,user_id) references public.households(id,save_id,user_id) deferrable initially deferred;
alter table public.game_saves add foreign key(protagonist_id,id,user_id) references public.characters(id,save_id,user_id) deferrable initially deferred;
create index households_by_save on public.households(save_id,user_id);
create index characters_by_save on public.characters(save_id,user_id,archived_at);
create index memories_by_save on public.character_memories(save_id,user_id);
create index events_by_save on public.game_events(save_id,user_id,created_at desc);
create index allocations_by_save on public.focus_allocations(save_id,user_id,created_at desc);
create index sessions_by_origin_save on public.focus_sessions(origin_save_id,user_id);

alter table public.game_saves enable row level security;
alter table public.game_save_migration_audit enable row level security;
revoke all on public.game_saves,public.game_save_migration_audit from public,anon,authenticated;
grant select on public.game_saves,public.game_save_migration_audit to authenticated;
create policy own_saves on public.game_saves for select to authenticated using(user_id=(select auth.uid()));
create policy own_save_migration on public.game_save_migration_audit for select to authenticated using(user_id=(select auth.uid()));

create schema game_private;
revoke all on schema game_private from public,anon,authenticated;
create function game_private.checked_save(p_save uuid) returns public.game_saves
 language plpgsql security definer set search_path='' as $$
declare s public.game_saves;begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select * into s from public.game_saves where id=p_save and user_id=auth.uid() and archived_at is null;
 if not found then raise exception 'Save not found';end if;
 return s;
end $$;
create function game_private.compatibility_save() returns uuid
 language plpgsql security definer set search_path='' as $$
declare s uuid;begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select compatibility_save_id into s from public.profiles where id=auth.uid();
 perform game_private.checked_save(s);return s;
end $$;
create function public.get_game_context(p_save uuid default null) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare s public.game_saves;begin
 perform 1 from public.profiles where id=auth.uid() for share;
 s:=game_private.checked_save(coalesce(p_save,game_private.compatibility_save()));
 if s.last_used_at is null or s.last_used_at<clock_timestamp()-interval '1 minute' then
  update public.game_saves set last_used_at=clock_timestamp() where id=s.id returning * into s;
 end if;
 return jsonb_build_object('save',to_jsonb(s),'focus_revision',(select focus_revision from public.profiles where id=auth.uid()));
end $$;

-- Preserve signup behavior, but never select an arbitrary household by owner.
create or replace function public.new_household() returns trigger language plpgsql security definer set search_path='' as $$
declare s uuid;h uuid;begin
 insert into public.game_saves(user_id,name) values(new.id,'Minha primeira partida') returning id into s;
 insert into public.households(user_id,save_id) values(new.id,s) returning id into h;
 update public.game_saves set primary_household_id=h where id=s;
 update public.profiles set compatibility_save_id=s where id=new.id;
 return new;
end $$;
create or replace function public.assign_household() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.save_id is null then select compatibility_save_id into new.save_id from public.profiles where id=new.user_id;end if;
 if new.household_id is null then select primary_household_id into new.household_id from public.game_saves where id=new.save_id and user_id=new.user_id;end if;
 if not exists(select 1 from public.households where id=new.household_id and save_id=new.save_id and user_id=new.user_id) then raise exception 'Invalid household/save';end if;
 return new;
end $$;
create function game_private.character_world_revision() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.game_saves set world_revision=world_revision+1,last_used_at=clock_timestamp() where id=new.save_id and user_id=new.user_id;
 update public.households set revision=revision+1 where id=new.household_id and save_id=new.save_id;
 update public.game_saves set current_generation=new.generation where id=new.save_id and protagonist_id=new.id;
 if new.archived_at is not null then
  update public.game_saves set protagonist_id=null,state='pending_selection' where id=new.save_id and protagonist_id=new.id;
 end if;
 if tg_op='INSERT' then
  update public.game_saves set protagonist_id=new.id,current_generation=new.generation,state='ready'
   where id=new.save_id and state='draft' and protagonist_id is null;
 end if;
 return new;
end $$;
create trigger character_save_revision after insert or update on public.characters for each row execute function game_private.character_world_revision();
create or replace function public.credit_completed_focus() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='completed' and new.validated_ms>=new.planned_seconds::bigint*1000 then
  insert into public.focus_credits(session_id,user_id,eligible_minutes) values(new.id,new.user_id,floor(new.validated_ms/60000.0)::integer) on conflict(session_id) do nothing;
 end if;return new;
end $$;
create function game_private.focus_balance_revision() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' or new.allocated_minutes is distinct from old.allocated_minutes then
  update public.profiles set focus_revision=focus_revision+1 where id=new.user_id;
 end if;return new;
end $$;
create trigger focus_balance_revision after insert or update of allocated_minutes on public.focus_credits for each row execute function game_private.focus_balance_revision();
create function game_private.assign_focus_origin() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and (new.character_id<>old.character_id or new.user_id<>old.user_id or new.origin_save_id is distinct from old.origin_save_id) then raise exception 'Focus origin is immutable';end if;
 if tg_op='INSERT' and new.origin_save_id is null then select save_id into new.origin_save_id from public.characters where id=new.character_id and user_id=new.user_id;end if;
 return new;
end $$;
create trigger focus_origin before insert or update of character_id,user_id,origin_save_id on public.focus_sessions for each row execute function game_private.assign_focus_origin();

create function game_private.assign_record_save() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.save_id is null then
  select save_id into new.save_id from public.characters where id=new.character_id and user_id=new.user_id;
  if new.character_id is null then select compatibility_save_id into new.save_id from public.profiles where id=new.user_id;end if;
 end if;return new;
end $$;
create trigger memory_save before insert on public.character_memories for each row execute function game_private.assign_record_save();
create trigger event_save before insert on public.game_events for each row execute function game_private.assign_record_save();
create trigger allocation_save before insert on public.focus_allocations for each row execute function game_private.assign_record_save();
alter table public.focus_allocations add check(
 (effect_status='legacy_unknown' and effects_snapshot is null and effects_version is null) or
 (effect_status='recorded' and jsonb_typeof(effects_snapshot)='object' and effects_version>0)
);

-- Scoped RPC implementations and compatibility wrappers follow below.

create function public.room_state_for_save(p_save uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();h public.households;s public.game_saves;begin
 if u is null then raise exception 'Authentication required';end if;
 perform 1 from public.profiles where id=u for share;s:=game_private.checked_save(p_save);
 select * into h from public.households where id=s.primary_household_id and save_id=p_save and user_id=u;if not found then raise exception 'Household not found';end if;
 return jsonb_build_object('revision',s.world_revision,'save_id',s.id,'world_revision',s.world_revision,'focus_revision',(select focus_revision from public.profiles where id=u),'household',jsonb_build_object('id',h.id,'name',h.name),
 'residents',coalesce((select jsonb_agg(to_jsonb(c) order by c.born_at) from public.characters c where c.user_id=u and c.household_id=h.id and c.archived_at is null and c.render_system='lpc'),'[]'::jsonb),
 'credits',coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at desc) from public.focus_credits f where f.user_id=u),'[]'::jsonb),
 'allocations',coalesce((select jsonb_agg(to_jsonb(a)) from (select * from public.focus_allocations where user_id=u and save_id=p_save order by created_at desc limit 100) a),'[]'::jsonb),
 'historical_ms',(select coalesce(sum(validated_ms),0) from public.focus_sessions where user_id=u));
end;$$;

create function public.room_command_for_save(p_save uuid,p_action text,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();h uuid;c public.characters;a public.activities;line jsonb;credit public.focus_credits;req public.allocation_requests;request_id uuid;idx integer:=0;mins integer;updated_skills jsonb;updated_needs jsonb;effect record;requirement record;
begin
 if u is null then raise exception 'Authentication required';end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>12000 then raise exception 'Invalid payload';end if;
 perform 1 from public.profiles where id=u for update;
 perform game_private.checked_save(p_save);
 select primary_household_id into h from public.game_saves where id=p_save and user_id=u;
 if h is null then raise exception 'Household not found';end if;
 if p_action='create' then
   if char_length(trim(p_payload->>'name')) not between 2 and 32 or p_payload->>'name' is null or not public.valid_adult_appearance(p_payload->'appearance') then raise exception 'Invalid appearance or name';end if;
   if exists(select 1 from public.characters where user_id=u and save_id=p_save and render_system='lpc' and archived_at is null) then return public.room_state_for_save(p_save);end if;
   insert into public.characters(user_id,household_id,save_id,name,appearance,life_stage,render_system) values(u,h,p_save,trim(p_payload->>'name'),p_payload->'appearance','adult','lpc') returning * into c;
   insert into public.game_events(user_id,character_id,kind,payload) values(u,c.id,'ResidentCreated',jsonb_build_object('stage','adult'));
 elsif p_action in ('appearance','activity','arrive') then
   select * into c from public.characters where id=(p_payload->>'characterId')::uuid and user_id=u and household_id=h and archived_at is null and render_system='lpc' for update;
   if not found then raise exception 'Resident not found';end if;
   if p_action='appearance' then
     if not public.valid_adult_appearance(p_payload->'appearance') then raise exception 'Invalid appearance';end if;
     update public.characters set appearance=p_payload->'appearance' where id=c.id;
     insert into public.game_events(user_id,character_id,kind,payload) values(u,c.id,'AppearanceChanged','{}');
   else
     select * into a from public.activities where id=p_payload->>'activity';
     if not found or not(a.allowed_stages ? c.life_stage) then raise exception 'Activity unavailable for this life stage';end if;
     if a.narrative_conditions<>'{}'::jsonb then raise exception 'Narrative conditions require the next engine version';end if;
     for requirement in select * from jsonb_each_text(a.requirements) loop if coalesce((c.skills->>requirement.key)::integer,0)<requirement.value::integer then raise exception 'Activity requirements not met';end if;end loop;
     if p_action='activity' then
       update public.characters set current_activity=a.id,animation_state='walking',activity_revision=activity_revision+1 where id=c.id;
     elsif c.current_activity=a.id and c.activity_revision=(p_payload->>'revision')::integer then
       update public.characters set animation_state=a.animation,position=a.destination where id=c.id;
     end if;
   end if;
 elsif p_action='allocate' then
   request_id:=(p_payload->>'requestId')::uuid;if request_id is null then raise exception 'Request ID required';end if;
   select * into req from public.allocation_requests where id=request_id;
   if found then if req.user_id=u and req.payload=p_payload and not exists(select 1 from public.focus_allocations fa where fa.request_id=req.id and fa.save_id<>p_save) then return public.room_state_for_save(p_save);else raise exception 'Request ID already used';end if;end if;
   if jsonb_typeof(p_payload->'lines') is distinct from 'array' or jsonb_array_length(p_payload->'lines') not between 1 and 20 then raise exception 'Invalid allocation lines';end if;
   insert into public.allocation_requests(id,user_id,payload) values(request_id,u,p_payload);
   for line in select * from jsonb_array_elements(p_payload->'lines') loop
     idx:=idx+1;if line ? 'saveId' and (line->>'saveId')::uuid is distinct from p_save then raise exception 'Allocation save mismatch';end if;mins:=(line->>'minutes')::integer;
     if mins is null or mins not between 1 and 120 or jsonb_typeof(line->'minutes')<>'number' or (line->>'minutes')::numeric<>mins then raise exception 'Invalid minutes';end if;
     select * into c from public.characters where id=(line->>'characterId')::uuid and user_id=u and household_id=h and archived_at is null and render_system='lpc' for update;
     if not found then raise exception 'Resident not found';end if;
     select * into a from public.activities where id=line->>'activity';
     if not found or not(a.allowed_stages ? c.life_stage) then raise exception 'Incompatible activity';end if;
     if a.narrative_conditions<>'{}'::jsonb then raise exception 'Narrative conditions require the next engine version';end if;
     for requirement in select * from jsonb_each_text(a.requirements) loop if coalesce((c.skills->>requirement.key)::integer,0)<requirement.value::integer then raise exception 'Activity requirements not met';end if;end loop;
     select * into credit from public.focus_credits where session_id=(line->>'sessionId')::uuid and user_id=u for update;
     if not found or credit.eligible_minutes-credit.allocated_minutes<mins then raise exception 'Insufficient minutes';end if;
     update public.focus_credits set allocated_minutes=allocated_minutes+mins where session_id=credit.session_id;
     updated_skills:=c.skills;updated_needs:=c.needs;
     for effect in select * from jsonb_each_text(a.effects) loop
       if effect.key='energy' then updated_needs:=jsonb_set(updated_needs,array['energy'],to_jsonb(least(100,(updated_needs->>'energy')::integer+effect.value::integer*mins)));
       elsif effect.key in ('knowledge','creativity','sociability','autonomy','wellbeing') then updated_skills:=jsonb_set(updated_skills,array[effect.key],to_jsonb((updated_skills->>effect.key)::integer+effect.value::integer*mins));
       else raise exception 'Invalid activity effect';end if;
     end loop;
     update public.characters set skills=updated_skills,needs=updated_needs,progress_minutes=progress_minutes+mins where id=c.id;
     insert into public.focus_allocations(request_id,line,session_id,user_id,character_id,activity_id,minutes,effects_snapshot,effects_version,effect_status) values(request_id,idx,credit.session_id,u,c.id,a.id,mins,jsonb_build_object('effects',a.effects,'before',jsonb_build_object('skills',c.skills,'needs',c.needs),'after',jsonb_build_object('skills',updated_skills,'needs',updated_needs)),1,'recorded');
     insert into public.game_events(user_id,character_id,kind,payload) values(u,c.id,'FocusMinutesAllocated',jsonb_build_object('requestId',request_id,'sessionId',credit.session_id,'activity',a.id,'minutes',mins,'skills',updated_skills,'needs',updated_needs));
   end loop;
 else raise exception 'Unknown room action';end if;
 -- Character trigger advances only this world revision; credit trigger advances account revision.
 return public.room_state_for_save(p_save);
end;$$;

create function public.baby_state_for_save(p_save uuid,p_character uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); c public.characters; h public.households; r jsonb;
begin
 if u is null then raise exception 'Authentication required'; end if;
 perform 1 from public.profiles where id=u for share;
 perform game_private.checked_save(p_save);
 select * into h from public.households where save_id=p_save and user_id=u and id=(select primary_household_id from public.game_saves where id=p_save);
 select * into c from public.characters where id=p_character and user_id=u and household_id=h.id
   and archived_at is null and render_system='legacy' and life_stage='baby';
 if not found then raise exception 'Baby not found'; end if;
 select rules into r from public.baby_care_config where id;
 return jsonb_build_object('revision',(select world_revision from public.game_saves where id=p_save),'save_id',p_save,'world_revision',(select world_revision from public.game_saves where id=p_save),'focus_revision',(select focus_revision from public.profiles where id=u),'household_id',h.id,'character',to_jsonb(c),'rules',r,
   'stats',jsonb_build_object('needs',c.needs,'skills',c.skills,'traits',c.care_traits,'progress_minutes',c.progress_minutes,
     'care_types',coalesce((select jsonb_agg(distinct payload->>'activity') from public.game_events where user_id=u and character_id=c.id and kind='BabyCare'),'[]'::jsonb),
     'history',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'created_at',e.created_at,'activity',e.payload->>'activity','minutes',e.payload->'minutes','rules_version',e.payload->'rules_version') order by e.created_at desc,e.id) from
       (select * from public.game_events where user_id=u and character_id=c.id and kind='BabyCare' order by created_at desc,id limit 50) e),'[]'::jsonb)),
   'credits',coalesce((select jsonb_agg(to_jsonb(f) order by created_at,session_id) from public.focus_credits f where user_id=u),'[]'::jsonb));
end; $$;

create function public.baby_care_for_save(p_save uuid,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); h uuid; c public.characters; req public.allocation_requests;
 rid uuid; action text; l jsonb; credit public.focus_credits; mins integer; total integer:=0; idx integer:=0;
 r jsonb; effects jsonb; e record; n jsonb; s jsonb; t jsonb; request_payload jsonb;
begin
 if u is null then raise exception 'Authentication required'; end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>12000 then raise exception 'Invalid payload'; end if;
 -- Same lock order as room_command/focus_command. Serializes adult/baby spending.
 perform 1 from public.profiles where id=u for update;
 perform game_private.checked_save(p_save);
 select primary_household_id into h from public.game_saves where id=p_save and user_id=u;
 if h is null then raise exception 'Household not found'; end if;
 select * into c from public.characters where id=(p_payload->>'characterId')::uuid and user_id=u and household_id=h
   and archived_at is null and render_system='legacy' and life_stage='baby' for update;
 if not found then raise exception 'Baby not found'; end if;
 rid:=(p_payload->>'requestId')::uuid;
 if rid is null then raise exception 'Request ID required'; end if;
 request_payload:=jsonb_build_object('babyCare',p_payload);
 select * into req from public.allocation_requests where id=rid;
 if found then
   if req.user_id=u and req.payload=request_payload and not exists(select 1 from public.focus_allocations fa where fa.request_id=req.id and fa.save_id<>p_save) then return public.baby_state_for_save(p_save,c.id); end if;
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
   insert into public.focus_allocations(request_id,line,session_id,user_id,character_id,activity_id,minutes,effects_snapshot,effects_version,effect_status)
     values(rid,idx,credit.session_id,u,c.id,action,mins,jsonb_build_object('per_minute',effects,'care_request',rid), (r->>'version')::integer,'recorded');
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
 update public.focus_allocations set effects_snapshot=effects_snapshot||jsonb_build_object('effect_scope','care_request_total','request_minutes',total,'before',jsonb_build_object('needs',c.needs,'skills',c.skills,'traits',c.care_traits),'after',jsonb_build_object('needs',n,'skills',s,'traits',t)) where request_id=rid and user_id=u;
 insert into public.game_events(user_id,character_id,kind,payload) values(u,c.id,'BabyCare',jsonb_build_object(
   'requestId',rid,'activity',action,'minutes',total,'rules_version',r->'version','effects',effects,'needs',n,'skills',s,'traits',t));
 -- Character and credit triggers maintain separate revisions.
 return public.baby_state_for_save(p_save,c.id);
end; $$;

create function public.create_character_for_save(p_save uuid,p_name text,p_appearance jsonb) returns public.characters language plpgsql security definer set search_path='' as $$
declare c public.characters; u uuid:=auth.uid();
begin
  if u is null then raise exception 'Authentication required'; end if;
  perform 1 from public.profiles where id=u for update;perform game_private.checked_save(p_save);
  if char_length(trim(p_name)) not between 2 and 32 or p_appearance is null or jsonb_typeof(p_appearance)<>'object' then raise exception 'Invalid character'; end if;
  if not(p_appearance ?& array['species','skin','hair','hairColor','eyes','eyeColor','outfit','accessory','antennas','marks']) then raise exception 'Missing appearance traits'; end if;
  if p_appearance->>'species' not in ('human','alien') or p_appearance->>'hair' not in ('tuft','curly','swept','none') or p_appearance->>'eyes' not in ('round','sleepy','sparkle') or p_appearance->>'accessory' not in ('none','bow','star') then raise exception 'Invalid traits'; end if;
  if exists(select 1 from jsonb_each_text(p_appearance) t where t.key in ('skin','hairColor','eyeColor','outfit') and (t.value is null or t.value !~ '^#[0-9a-fA-F]{6}$')) or jsonb_typeof(p_appearance->'antennas')<>'boolean' or jsonb_typeof(p_appearance->'marks')<>'boolean' then raise exception 'Invalid colors or flags'; end if;
  if exists(select 1 from jsonb_each(p_appearance) t where t.value='null'::jsonb) or octet_length(p_appearance::text)>2000 then raise exception 'Invalid appearance'; end if;
  select * into c from public.characters where user_id=u and save_id=p_save and archived_at is null and render_system='legacy';
  if found then return c; end if;
  insert into public.characters(user_id,save_id,name,appearance) values(u,p_save,trim(p_name),p_appearance) returning * into c;
  return c;
end; $$;

create function public.read_birth_for_save(p_save uuid,p_character uuid,p_memory text) returns public.characters language plpgsql security definer set search_path='' as $$
declare c public.characters;u uuid:=auth.uid();
begin
  if u is null or p_memory is null or p_memory not in ('sky','home') then raise exception 'Invalid choice'; end if;
  perform 1 from public.profiles where id=u for update;perform game_private.checked_save(p_save);
  select * into c from public.characters where id=p_character and user_id=u and save_id=p_save and archived_at is null and render_system='legacy' for update;
  if not found then raise exception 'Character required'; end if;
  if c.birth_read then return c; end if;
  if exists(select 1 from public.focus_sessions where user_id=u and status='active') then raise exception 'Pause focus before reading'; end if;
  insert into public.character_memories(character_id,user_id,chapter_id,content_version,choice_id) values(c.id,u,'birth',1,p_memory);
  update public.characters set birth_read=true,first_memory=p_memory where id=c.id returning * into c;
  return c;
end; $$;

create function public.start_save_focus(p_save uuid,p_id uuid,p_client uuid,p_character uuid,p_seconds integer,p_task text,p_step text) returns public.focus_sessions language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();s public.focus_sessions;c public.characters;t timestamptz:=clock_timestamp();begin
 if u is null or p_id is null or p_client is null or p_seconds is null or p_seconds not between 120 and 7200 or char_length(p_task)>160 or char_length(p_step)>160 then raise exception 'Invalid session';end if;
 perform 1 from public.profiles where id=u for update;
 perform game_private.checked_save(p_save);
 select * into c from public.characters where id=p_character and save_id=p_save and user_id=u and archived_at is null;
 if not found then raise exception 'Resident not found';end if;
 select * into s from public.focus_sessions where id=p_id;
 if found then if s.user_id<>u or s.client_id<>p_client or s.character_id<>p_character then raise exception 'Invalid session';end if;return s;end if;
 update public.focus_sessions set status='expired',ended_at=t where user_id=u and status in ('active','paused','interrupted') and created_at<t-interval '24 hours';
 insert into public.focus_sessions(id,user_id,character_id,status,planned_seconds,client_id,task,first_step,last_seen_at) values(p_id,u,c.id,'active',p_seconds,p_client,coalesce(p_task,''),coalesce(p_step,''),t) returning * into s;
 insert into public.focus_events(session_id,sequence,client_id,action) values(s.id,0,p_client,'start');return s;
end;$$;

-- Keep the validated heartbeat/pause/recovery/completion engine byte-for-byte.
-- Only starts get explicit save/character context. The private engine is not callable by clients.
alter function public.focus_command(text,uuid,uuid,integer,integer,text,text) set schema game_private;
alter function game_private.focus_command(text,uuid,uuid,integer,integer,text,text) rename to focus_engine;
create function game_private.legacy_character(p_save uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare ids uuid[];begin
 perform game_private.checked_save(p_save);
 select array_agg(id order by id) into ids from public.characters where save_id=p_save and user_id=auth.uid() and render_system='legacy' and archived_at is null;
 if coalesce(cardinality(ids),0)<>1 then raise exception 'Explicit legacy character required';end if;
 return ids[1];
end $$;
create function game_private.character_save(p_character uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare s uuid;begin
 select save_id into s from public.characters where id=p_character and user_id=auth.uid() and archived_at is null;
 perform game_private.checked_save(s);return s;
end $$;
-- Old clients only understand one revision. Preserve their stale-response protection.
create function game_private.compat_snapshot(p_snapshot jsonb) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_set(p_snapshot,'{revision}',to_jsonb((p_snapshot->>'world_revision')::bigint+(p_snapshot->>'focus_revision')::bigint));
$$;
create or replace function public.room_state() returns jsonb language sql security definer set search_path='' as $$
 select game_private.compat_snapshot(public.room_state_for_save(game_private.compatibility_save()));
$$;
create or replace function public.room_command(p_action text,p_payload jsonb) returns jsonb language sql security definer set search_path='' as $$
 select game_private.compat_snapshot(public.room_command_for_save(game_private.compatibility_save(),p_action,p_payload));
$$;
create or replace function public.create_character(p_name text,p_appearance jsonb) returns public.characters language sql security definer set search_path='' as $$
 select public.create_character_for_save(game_private.compatibility_save(),p_name,p_appearance);
$$;
create or replace function public.read_birth(p_memory text) returns public.characters language sql security definer set search_path='' as $$
 select public.read_birth_for_save(game_private.compatibility_save(),game_private.legacy_character(game_private.compatibility_save()),p_memory);
$$;
create or replace function public.baby_state(p_character uuid) returns jsonb language sql security definer set search_path='' as $$
 select game_private.compat_snapshot(public.baby_state_for_save(game_private.character_save(p_character),p_character));
$$;
create or replace function public.baby_care(p_payload jsonb) returns jsonb language sql security definer set search_path='' as $$
 select game_private.compat_snapshot(public.baby_care_for_save(game_private.character_save((p_payload->>'characterId')::uuid),p_payload));
$$;
create or replace function public.start_resident_focus(p_id uuid,p_client uuid,p_character uuid,p_seconds integer,p_task text,p_step text) returns public.focus_sessions language sql security definer set search_path='' as $$
 select public.start_save_focus(game_private.character_save(p_character),p_id,p_client,p_character,p_seconds,p_task,p_step);
$$;
create function public.focus_command(p_action text,p_id uuid,p_client uuid,p_sequence integer,p_seconds integer default 1500,p_task text default '',p_step text default '') returns public.focus_sessions language plpgsql security definer set search_path='' as $$
declare s uuid;c uuid;previous public.focus_sessions;begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if p_action='start' then
  -- Preserve the legacy start validation and lock order, without guessing a character globally.
  if p_sequence is null or p_sequence<0 or p_sequence>100000 then raise exception 'Invalid command';end if;
  perform 1 from public.profiles where id=auth.uid() for update;
  select * into previous from public.focus_sessions where id=p_id;
  if found then
   if previous.user_id<>auth.uid() or previous.client_id<>p_client then raise exception 'Invalid session';end if;
   return previous;
  end if;
  s:=game_private.compatibility_save();c:=game_private.legacy_character(s);
  return public.start_save_focus(s,p_id,p_client,c,p_seconds,p_task,p_step);
 end if;
 return game_private.focus_engine(p_action,p_id,p_client,p_sequence,p_seconds,p_task,p_step);
end $$;

revoke all on all functions in schema game_private from public,anon,authenticated;
revoke all on function public.get_game_context(uuid),public.room_state_for_save(uuid),public.room_command_for_save(uuid,text,jsonb),public.create_character_for_save(uuid,text,jsonb),public.read_birth_for_save(uuid,uuid,text),public.baby_state_for_save(uuid,uuid),public.baby_care_for_save(uuid,jsonb),public.start_save_focus(uuid,uuid,uuid,uuid,integer,text,text),public.focus_command(text,uuid,uuid,integer,integer,text,text) from public,anon,authenticated;
grant execute on function public.get_game_context(uuid),public.room_state_for_save(uuid),public.room_command_for_save(uuid,text,jsonb),public.create_character_for_save(uuid,text,jsonb),public.read_birth_for_save(uuid,uuid,text),public.baby_state_for_save(uuid,uuid),public.baby_care_for_save(uuid,jsonb),public.start_save_focus(uuid,uuid,uuid,uuid,integer,text,text),public.focus_command(text,uuid,uuid,integer,integer,text,text) to authenticated;
-- Existing public compatibility wrappers keep their restricted authenticated grants.
commit;
