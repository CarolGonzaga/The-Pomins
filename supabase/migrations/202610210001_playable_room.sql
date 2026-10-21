-- Etapa 1: non-destructive extension. Legacy babies and focus history are preserved.
create table public.households(id uuid primary key default gen_random_uuid(),user_id uuid not null unique references public.profiles(id) on delete cascade,name text not null default 'Casa em Vila Aurora',revision bigint not null default 0);
insert into public.households(user_id) select id from public.profiles;
alter table public.characters add column household_id uuid references public.households(id) on delete cascade;
update public.characters c set household_id=h.id from public.households h where h.user_id=c.user_id;
alter table public.characters alter column household_id set not null;
alter table public.characters add column render_system text not null default 'legacy' check(render_system in ('legacy','lpc'));
alter table public.characters add column life_stage text not null default 'baby' check(life_stage in ('baby','child','teen','adult','elder'));
alter table public.characters add column needs jsonb not null default '{"satiety":75,"hygiene":75,"energy":75,"affection":75,"fun":75}';
alter table public.characters add column skills jsonb not null default '{"knowledge":0,"creativity":0,"sociability":0,"autonomy":0,"wellbeing":0}';
alter table public.characters add column relationships jsonb not null default '[]';
alter table public.characters add column current_activity text;
alter table public.characters add column animation_state text not null default 'idle' check(animation_state in ('idle','walking','studying','reading','sleeping'));
alter table public.characters add column position jsonb not null default '{"x":7,"y":8}';
alter table public.characters add column activity_revision integer not null default 0;
alter table public.characters add column progress_minutes integer not null default 0 check(progress_minutes>=0);
drop index public.one_playable_life;
create unique index one_legacy_life on public.characters(user_id) where archived_at is null and render_system='legacy';
create index residents_by_household on public.characters(household_id);

create function public.new_household() returns trigger language plpgsql security definer set search_path='' as $$ begin insert into public.households(user_id) values(new.id);return new;end;$$;
create trigger profile_household after insert on public.profiles for each row execute function public.new_household();
create function public.assign_household() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.household_id is null then select id into new.household_id from public.households where user_id=new.user_id;end if;
 if not exists(select 1 from public.households where id=new.household_id and user_id=new.user_id) then raise exception 'Invalid household';end if;return new;end;$$;
create trigger character_household before insert on public.characters for each row execute function public.assign_household();

create table public.activities(id text primary key,allowed_stages jsonb not null,destination jsonb not null,animation text not null,effects jsonb not null,requirements jsonb not null default '{}',narrative_conditions jsonb not null default '{}');
insert into public.activities(id,allowed_stages,destination,animation,effects) values
 ('study','["child","teen","adult","elder"]','{"x":4,"y":5}','studying','{"knowledge":2,"autonomy":1}'),
 ('read','["child","teen","adult","elder"]','{"x":11,"y":4}','reading','{"knowledge":1,"creativity":1}'),
 ('sleep','["baby","child","teen","adult","elder"]','{"x":10,"y":8}','sleeping','{"energy":3,"wellbeing":1}');
alter table public.characters add constraint character_activity foreign key(current_activity) references public.activities(id);
create table public.focus_credits(session_id uuid primary key references public.focus_sessions(id) on delete cascade,user_id uuid not null references public.profiles(id) on delete cascade,eligible_minutes integer not null check(eligible_minutes between 2 and 120),allocated_minutes integer not null default 0 check(allocated_minutes>=0 and allocated_minutes<=eligible_minutes),created_at timestamptz not null default now());
insert into public.focus_credits(session_id,user_id,eligible_minutes,created_at) select id,user_id,floor(validated_ms/60000.0)::integer,coalesce(ended_at,created_at) from public.focus_sessions where status='completed' and validated_ms>=planned_seconds::bigint*1000;
create table public.allocation_requests(id uuid primary key,user_id uuid not null references public.profiles(id) on delete cascade,payload jsonb not null,created_at timestamptz not null default now());
create table public.focus_allocations(id uuid primary key default gen_random_uuid(),request_id uuid not null references public.allocation_requests(id) on delete cascade,line integer not null,session_id uuid not null references public.focus_credits(session_id) on delete cascade,user_id uuid not null references public.profiles(id) on delete cascade,character_id uuid not null references public.characters(id) on delete cascade,activity_id text not null references public.activities(id),minutes integer not null check(minutes between 1 and 120),created_at timestamptz not null default now(),unique(request_id,line));
create index allocations_by_user on public.focus_allocations(user_id,created_at desc);
create table public.game_events(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,character_id uuid references public.characters(id) on delete cascade,kind text not null,payload jsonb not null,created_at timestamptz not null default now());
create function public.credit_completed_focus() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.status='completed' and new.validated_ms>=new.planned_seconds::bigint*1000 then
 insert into public.focus_credits(session_id,user_id,eligible_minutes) values(new.id,new.user_id,floor(new.validated_ms/60000.0)::integer) on conflict(session_id) do nothing;
 if found then update public.households set revision=revision+1 where user_id=new.user_id;end if;end if;return new;end;$$;
create trigger completed_focus_credit after insert or update of status on public.focus_sessions for each row execute function public.credit_completed_focus();

alter table public.households enable row level security;
alter table public.activities enable row level security;
alter table public.focus_credits enable row level security;
alter table public.allocation_requests enable row level security;
alter table public.focus_allocations enable row level security;
alter table public.game_events enable row level security;
create policy own_household on public.households for select to authenticated using(user_id=(select auth.uid()));
create policy activity_catalog on public.activities for select to authenticated using(true);
create policy own_credits on public.focus_credits for select to authenticated using(user_id=(select auth.uid()));
create policy own_requests on public.allocation_requests for select to authenticated using(user_id=(select auth.uid()));
create policy own_allocations on public.focus_allocations for select to authenticated using(user_id=(select auth.uid()));
create policy own_events on public.game_events for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.households,public.activities,public.focus_credits,public.allocation_requests,public.focus_allocations,public.game_events from public,anon,authenticated;
grant select on public.households,public.activities,public.focus_credits,public.allocation_requests,public.focus_allocations,public.game_events to authenticated;

create function public.valid_adult_appearance(a jsonb) returns boolean language sql immutable set search_path='' as $$
 select coalesce(jsonb_typeof(a)='object' and a ?& array['body','skin','hairStyle','hairColor','eyeColor','clothing','clothingColor'] and a->>'body'='male' and a->>'hairStyle' in ('plain','afro','bob','none') and a->>'clothing' in ('longsleeve','shortsleeve') and not exists(select 1 from jsonb_each_text(a) t where (t.value is null) or (t.key in ('skin','hairColor','eyeColor','clothingColor') and t.value!~'^#[0-9a-fA-F]{6}$')) and octet_length(a::text)<2000,false);
$$;
create function public.room_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();h public.households;begin
 if u is null then raise exception 'Authentication required';end if;
 select * into h from public.households where user_id=u;if not found then raise exception 'Household not found';end if;
 return jsonb_build_object('revision',(select revision from public.households where user_id=u),'household',jsonb_build_object('id',h.id,'name',h.name),
 'residents',coalesce((select jsonb_agg(to_jsonb(c) order by c.born_at) from public.characters c where c.user_id=u and c.household_id=h.id and c.archived_at is null and c.render_system='lpc'),'[]'::jsonb),
 'credits',coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at desc) from public.focus_credits f where f.user_id=u),'[]'::jsonb),
 'allocations',coalesce((select jsonb_agg(to_jsonb(a)) from (select * from public.focus_allocations where user_id=u order by created_at desc limit 100) a),'[]'::jsonb),
 'historical_ms',(select coalesce(sum(validated_ms),0) from public.focus_sessions where user_id=u));
end;$$;

create function public.room_command(p_action text,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();h uuid;c public.characters;a public.activities;line jsonb;credit public.focus_credits;req public.allocation_requests;request_id uuid;idx integer:=0;mins integer;updated_skills jsonb;updated_needs jsonb;effect record;requirement record;
begin
 if u is null then raise exception 'Authentication required';end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>12000 then raise exception 'Invalid payload';end if;
 perform 1 from public.profiles where id=u for update;
 select id into h from public.households where user_id=u;
 if h is null then raise exception 'Household not found';end if;
 if p_action='create' then
   if char_length(trim(p_payload->>'name')) not between 2 and 32 or p_payload->>'name' is null or not public.valid_adult_appearance(p_payload->'appearance') then raise exception 'Invalid appearance or name';end if;
   if exists(select 1 from public.characters where user_id=u and render_system='lpc' and archived_at is null) then return public.room_state();end if;
   insert into public.characters(user_id,household_id,name,appearance,life_stage,render_system) values(u,h,trim(p_payload->>'name'),p_payload->'appearance','adult','lpc') returning * into c;
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
   if found then if req.user_id=u and req.payload=p_payload then return public.room_state();else raise exception 'Request ID already used';end if;end if;
   if jsonb_typeof(p_payload->'lines') is distinct from 'array' or jsonb_array_length(p_payload->'lines') not between 1 and 20 then raise exception 'Invalid allocation lines';end if;
   insert into public.allocation_requests(id,user_id,payload) values(request_id,u,p_payload);
   for line in select * from jsonb_array_elements(p_payload->'lines') loop
     idx:=idx+1;mins:=(line->>'minutes')::integer;
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
     insert into public.focus_allocations(request_id,line,session_id,user_id,character_id,activity_id,minutes) values(request_id,idx,credit.session_id,u,c.id,a.id,mins);
     insert into public.game_events(user_id,character_id,kind,payload) values(u,c.id,'FocusMinutesAllocated',jsonb_build_object('requestId',request_id,'sessionId',credit.session_id,'activity',a.id,'minutes',mins,'skills',updated_skills,'needs',updated_needs));
   end loop;
 else raise exception 'Unknown room action';end if;
 update public.households set revision=revision+1 where id=h;
 return public.room_state();
end;$$;

create function public.start_resident_focus(p_id uuid,p_client uuid,p_character uuid,p_seconds integer,p_task text,p_step text) returns public.focus_sessions language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();s public.focus_sessions;c public.characters;t timestamptz:=clock_timestamp();begin
 if u is null or p_id is null or p_client is null or p_seconds is null or p_seconds not between 120 and 7200 or char_length(p_task)>160 or char_length(p_step)>160 then raise exception 'Invalid session';end if;
 perform 1 from public.profiles where id=u for update;
 select * into c from public.characters where id=p_character and user_id=u and render_system='lpc' and archived_at is null;
 if not found then raise exception 'Resident not found';end if;
 select * into s from public.focus_sessions where id=p_id;
 if found then if s.user_id<>u or s.client_id<>p_client or s.character_id<>p_character then raise exception 'Invalid session';end if;return s;end if;
 update public.focus_sessions set status='expired',ended_at=t where user_id=u and status in ('active','paused','interrupted') and created_at<t-interval '24 hours';
 insert into public.focus_sessions(id,user_id,character_id,status,planned_seconds,client_id,task,first_step,last_seen_at) values(p_id,u,c.id,'active',p_seconds,p_client,coalesce(p_task,''),coalesce(p_step,''),t) returning * into s;
 insert into public.focus_events(session_id,sequence,client_id,action) values(s.id,0,p_client,'start');return s;
end;$$;

revoke all on function public.new_household(),public.assign_household(),public.credit_completed_focus(),public.valid_adult_appearance(jsonb),public.room_state(),public.room_command(text,jsonb),public.start_resident_focus(uuid,uuid,uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.room_state(),public.room_command(text,jsonb),public.start_resident_focus(uuid,uuid,uuid,integer,text,text) to authenticated;

-- Keep the original flow explicitly scoped to legacy characters. Adult focus rewards become distributable minutes.
create or replace function public.create_character(p_name text,p_appearance jsonb) returns public.characters language plpgsql security definer set search_path='' as $$
declare c public.characters; u uuid:=auth.uid();
begin
  if u is null then raise exception 'Authentication required'; end if;
  perform 1 from public.profiles where id=u for update;
  if char_length(trim(p_name)) not between 2 and 32 or p_appearance is null or jsonb_typeof(p_appearance)<>'object' then raise exception 'Invalid character'; end if;
  if not(p_appearance ?& array['species','skin','hair','hairColor','eyes','eyeColor','outfit','accessory','antennas','marks']) then raise exception 'Missing appearance traits'; end if;
  if p_appearance->>'species' not in ('human','alien') or p_appearance->>'hair' not in ('tuft','curly','swept','none') or p_appearance->>'eyes' not in ('round','sleepy','sparkle') or p_appearance->>'accessory' not in ('none','bow','star') then raise exception 'Invalid traits'; end if;
  if exists(select 1 from jsonb_each_text(p_appearance) t where t.key in ('skin','hairColor','eyeColor','outfit') and (t.value is null or t.value !~ '^#[0-9a-fA-F]{6}$')) or jsonb_typeof(p_appearance->'antennas')<>'boolean' or jsonb_typeof(p_appearance->'marks')<>'boolean' then raise exception 'Invalid colors or flags'; end if;
  if exists(select 1 from jsonb_each(p_appearance) t where t.value='null'::jsonb) or octet_length(p_appearance::text)>2000 then raise exception 'Invalid appearance'; end if;
  select * into c from public.characters where user_id=u and archived_at is null and render_system='legacy';
  if found then return c; end if;
  insert into public.characters(user_id,name,appearance) values(u,trim(p_name),p_appearance) returning * into c;
  return c;
end; $$;
create or replace function public.read_birth(p_memory text) returns public.characters language plpgsql security definer set search_path='' as $$
declare c public.characters;u uuid:=auth.uid();
begin
  if u is null or p_memory is null or p_memory not in ('sky','home') then raise exception 'Invalid choice'; end if;
  select * into c from public.characters where user_id=u and archived_at is null and render_system='legacy' for update;
  if not found then raise exception 'Character required'; end if;
  if c.birth_read then return c; end if;
  if exists(select 1 from public.focus_sessions where user_id=u and status='active') then raise exception 'Pause focus before reading'; end if;
  insert into public.character_memories(character_id,user_id,chapter_id,content_version,choice_id) values(c.id,u,'birth',1,p_memory);
  update public.characters set birth_read=true,first_memory=p_memory where id=c.id returning * into c;
  return c;
end; $$;
create or replace function public.focus_command(p_action text,p_id uuid,p_client uuid,p_sequence integer,p_seconds integer default 1500,p_task text default '',p_step text default '') returns public.focus_sessions language plpgsql security definer set search_path='' as $$
declare
  u uuid:=auth.uid(); s public.focus_sessions; c public.characters;
  t timestamptz:=clock_timestamp(); gap bigint; credit integer:=0; daily integer; mins integer; reward integer; ev public.focus_events;
begin
  if u is null then raise exception 'Authentication required'; end if;
  if p_action is null or p_id is null or p_client is null or p_sequence is null or p_sequence<0 or p_sequence>100000 then raise exception 'Invalid command'; end if;
  -- Lock order: profile, session, character. Serializes reward budget and starts per user.
  perform 1 from public.profiles where id=u for update;
  if p_action='start' then
    select * into s from public.focus_sessions where id=p_id;
    if found then
      if s.user_id<>u or s.client_id<>p_client then raise exception 'Invalid session'; end if;
      return s;
    end if;
    if p_seconds is null or p_seconds not between 120 and 7200 or char_length(p_task)>160 or char_length(p_step)>160 then raise exception 'Invalid duration or task'; end if;
    update public.focus_sessions set status='expired',ended_at=t where user_id=u and status in ('active','paused','interrupted') and created_at<t-interval '24 hours';
    select * into c from public.characters where user_id=u and archived_at is null and render_system='legacy';
    if not found then raise exception 'Character required'; end if;
    insert into public.focus_sessions(id,user_id,character_id,status,planned_seconds,client_id,task,first_step,last_seen_at)
      values(p_id,u,c.id,'active',p_seconds,p_client,coalesce(p_task,''),coalesce(p_step,''),t) returning * into s;
    insert into public.focus_events(session_id,sequence,client_id,action) values(s.id,0,p_client,'start');
    return s;
  end if;
  select * into s from public.focus_sessions where id=p_id and user_id=u for update;
  if not found then raise exception 'Session not found'; end if;
  if s.status in ('completed','cancelled','expired') then return s; end if;
  if s.created_at<t-interval '24 hours' then
    update public.focus_sessions set status='expired',ended_at=t where id=s.id returning * into s;return s;
  end if;
  if p_action='recover' then
    update public.focus_sessions set status='interrupted',client_id=p_client,last_seen_at=t,sequence=sequence+1 where id=s.id returning * into s;
    insert into public.focus_events(session_id,sequence,client_id,action) values(s.id,s.sequence,p_client,'recover');return s;
  end if;
  if s.client_id<>p_client then raise exception 'Session belongs to another tab. Recover first.'; end if;
  if p_sequence<=s.sequence then
    select * into ev from public.focus_events where session_id=s.id and sequence=p_sequence;
    if found and ev.client_id=p_client and ev.action=p_action then return s; end if;
    raise exception 'Stale command';
  end if;
  if p_sequence<>s.sequence+1 then raise exception 'Out of sequence'; end if;
  if p_action='heartbeat' then
    if s.status<>'active' then raise exception 'Session not active'; end if;
    gap:=floor(extract(epoch from(t-s.last_seen_at))*1000);
    if gap<3000 then raise exception 'Heartbeat too frequent'; end if;
    if gap>7500 then s.status:='interrupted';else credit:=least(gap,5000,s.planned_seconds::bigint*1000-s.validated_ms)::integer;end if;
    s.validated_ms:=s.validated_ms+credit;
  elsif p_action='pause' then
    if s.status not in ('active','paused','interrupted') then raise exception 'Cannot pause'; end if;
    s.status:='paused';
  elsif p_action='resume' then
    if s.status not in ('paused','interrupted') then raise exception 'Cannot resume'; end if;
    s.status:='active';
  elsif p_action='cancel' then s.status:='cancelled';s.ended_at:=t;
  elsif p_action='complete' then
    if s.validated_ms<s.planned_seconds::bigint*1000 then raise exception 'Insufficient confirmed time'; end if;
    select coalesce(sum(rewarded_minutes),0)::integer into daily from public.focus_rewards where user_id=u and created_at>=date_trunc('day',t at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
    mins:=least(floor(s.validated_ms/60000.0)::integer,greatest(0,240-daily));reward:=mins*10;
    insert into public.focus_rewards(session_id,user_id,life_xp,account_xp,coins,energy,rewarded_minutes) values(s.id,u,reward,reward,mins*2,mins,mins);
    update public.characters set life_xp=life_xp+reward where id=s.character_id and render_system='legacy';
    update public.profiles set account_xp=account_xp+reward where id=u;
    update public.wallets set coins=coins+mins*2,energy=energy+mins where user_id=u;
    s.status:='completed';s.reward_xp:=reward;s.ended_at:=t;
  else raise exception 'Unknown action';end if;
  update public.focus_sessions set status=s.status,validated_ms=s.validated_ms,sequence=p_sequence,last_seen_at=t,reward_xp=s.reward_xp,ended_at=s.ended_at where id=s.id returning * into s;
  insert into public.focus_events(session_id,sequence,client_id,action,credited_ms,created_at) values(s.id,s.sequence,p_client,p_action,credit,t);
  return s;
end; $$;
