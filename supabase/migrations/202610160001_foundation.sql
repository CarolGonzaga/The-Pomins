-- Pomins / Entrega 1. Apply as postgres through Supabase migrations.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique check (nickname ~ '^[a-z0-9_]{3,24}$'),
  is_public boolean not null default false,
  account_xp bigint not null default 0 check(account_xp>=0),
  created_at timestamptz not null default now()
);
create table public.characters (
  id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check(char_length(name) between 2 and 32),appearance jsonb not null,
  life_xp bigint not null default 0 check(life_xp>=0),generation integer not null default 1 check(generation>0),
  birth_read boolean not null default false,first_memory text check(first_memory in ('sky','home')),
  born_at timestamptz not null default now(),archived_at timestamptz
);
create unique index one_playable_life on public.characters(user_id) where archived_at is null;
create table public.focus_sessions (
  id uuid primary key,user_id uuid not null references public.profiles(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  status text not null check(status in ('active','paused','interrupted','completed','cancelled','expired')),
  planned_seconds integer not null check(planned_seconds between 120 and 7200),
  validated_ms bigint not null default 0 check(validated_ms>=0 and validated_ms<=planned_seconds::bigint*1000),
  sequence integer not null default 0 check(sequence>=0),client_id uuid not null,
  task text not null default '' check(char_length(task)<=160),first_step text not null default '' check(char_length(first_step)<=160),
  reward_xp integer not null default 0 check(reward_xp>=0),
  created_at timestamptz not null default now(),last_seen_at timestamptz not null default now(),ended_at timestamptz
);
create unique index one_open_session on public.focus_sessions(user_id) where status in ('active','paused','interrupted');
create index focus_history on public.focus_sessions(user_id,created_at desc);
create table public.focus_events (
  session_id uuid not null references public.focus_sessions(id) on delete cascade,
  sequence integer not null,client_id uuid not null,action text not null,credited_ms integer not null default 0,
  created_at timestamptz not null default now(),primary key(session_id,sequence)
);
create table public.focus_rewards (
  session_id uuid primary key references public.focus_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  life_xp integer not null check(life_xp>=0),account_xp integer not null check(account_xp>=0),
  coins integer not null check(coins>=0),energy integer not null check(energy>=0),
  rewarded_minutes integer not null check(rewarded_minutes between 0 and 120),balance_version integer not null default 1,
  created_at timestamptz not null default now()
);
create index rewards_daily on public.focus_rewards(user_id,created_at);
create table public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  coins bigint not null default 0 check(coins>=0),energy bigint not null default 0 check(energy>=0)
);
create table public.character_memories (
  id uuid primary key default gen_random_uuid(),character_id uuid not null references public.characters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,chapter_id text not null,content_version integer not null,
  choice_id text not null,created_at timestamptz not null default now(),unique(character_id,chapter_id)
);

alter table public.profiles enable row level security;
alter table public.characters enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.focus_events enable row level security;
alter table public.focus_rewards enable row level security;
alter table public.wallets enable row level security;
alter table public.character_memories enable row level security;
create policy read_self on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy privacy_self on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy read_self on public.characters for select to authenticated using(user_id=(select auth.uid()));
create policy read_self on public.focus_sessions for select to authenticated using(user_id=(select auth.uid()));
create policy read_self on public.focus_rewards for select to authenticated using(user_id=(select auth.uid()));
create policy read_self on public.wallets for select to authenticated using(user_id=(select auth.uid()));
create policy read_self on public.character_memories for select to authenticated using(user_id=(select auth.uid()));
create policy read_self on public.focus_events for select to authenticated using(exists(select 1 from public.focus_sessions s where s.id=session_id and s.user_id=(select auth.uid())));
revoke all on public.profiles,public.characters,public.focus_sessions,public.focus_events,public.focus_rewards,public.wallets,public.character_memories from anon,authenticated;
grant select on public.profiles,public.characters,public.focus_sessions,public.focus_events,public.focus_rewards,public.wallets,public.character_memories to authenticated;
grant update(is_public) on public.profiles to authenticated;

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
declare n text;
begin
  n:=lower(coalesce(new.raw_user_meta_data->>'nickname','pomin_'||substr(replace(new.id::text,'-',''),1,16)));
  if n !~ '^[a-z0-9_]{3,24}$' then raise exception 'Invalid nickname'; end if;
  insert into public.profiles(id,nickname) values(new.id,n);
  insert into public.wallets(user_id) values(new.id);
  return new;
end; $$;
revoke all on function public.handle_new_user() from public,anon,authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.create_character(p_name text,p_appearance jsonb) returns public.characters language plpgsql security definer set search_path='' as $$
declare c public.characters; u uuid:=auth.uid();
begin
  if u is null then raise exception 'Authentication required'; end if;
  perform 1 from public.profiles where id=u for update;
  if char_length(trim(p_name)) not between 2 and 32 or p_appearance is null or jsonb_typeof(p_appearance)<>'object' then raise exception 'Invalid character'; end if;
  if not(p_appearance ?& array['species','skin','hair','hairColor','eyes','eyeColor','outfit','accessory','antennas','marks']) then raise exception 'Missing appearance traits'; end if;
  if p_appearance->>'species' not in ('human','alien') or p_appearance->>'hair' not in ('tuft','curly','swept','none') or p_appearance->>'eyes' not in ('round','sleepy','sparkle') or p_appearance->>'accessory' not in ('none','bow','star') then raise exception 'Invalid traits'; end if;
  if exists(select 1 from jsonb_each_text(p_appearance) t where t.key in ('skin','hairColor','eyeColor','outfit') and (t.value is null or t.value !~ '^#[0-9a-fA-F]{6}$')) or jsonb_typeof(p_appearance->'antennas')<>'boolean' or jsonb_typeof(p_appearance->'marks')<>'boolean' then raise exception 'Invalid colors or flags'; end if;
  if exists(select 1 from jsonb_each(p_appearance) t where t.value='null'::jsonb) or octet_length(p_appearance::text)>2000 then raise exception 'Invalid appearance'; end if;
  select * into c from public.characters where user_id=u and archived_at is null;
  if found then return c; end if;
  insert into public.characters(user_id,name,appearance) values(u,trim(p_name),p_appearance) returning * into c;
  return c;
end; $$;

create function public.read_birth(p_memory text) returns public.characters language plpgsql security definer set search_path='' as $$
declare c public.characters;u uuid:=auth.uid();
begin
  if u is null or p_memory is null or p_memory not in ('sky','home') then raise exception 'Invalid choice'; end if;
  select * into c from public.characters where user_id=u and archived_at is null for update;
  if not found then raise exception 'Character required'; end if;
  if c.birth_read then return c; end if;
  if exists(select 1 from public.focus_sessions where user_id=u and status='active') then raise exception 'Pause focus before reading'; end if;
  insert into public.character_memories(character_id,user_id,chapter_id,content_version,choice_id) values(c.id,u,'birth',1,p_memory);
  update public.characters set birth_read=true,first_memory=p_memory where id=c.id returning * into c;
  return c;
end; $$;

-- All time comes from clock_timestamp(). The browser never supplies elapsed time.
-- A lease (client_id) prevents concurrent tabs from heartbeating the same session.
create function public.focus_command(p_action text,p_id uuid,p_client uuid,p_sequence integer,p_seconds integer default 1500,p_task text default '',p_step text default '') returns public.focus_sessions language plpgsql security definer set search_path='' as $$
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
    select * into c from public.characters where user_id=u and archived_at is null;
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
    update public.characters set life_xp=life_xp+reward where id=s.character_id;
    update public.profiles set account_xp=account_xp+reward where id=u;
    update public.wallets set coins=coins+mins*2,energy=energy+mins where user_id=u;
    s.status:='completed';s.reward_xp:=reward;s.ended_at:=t;
  else raise exception 'Unknown action';end if;
  update public.focus_sessions set status=s.status,validated_ms=s.validated_ms,sequence=p_sequence,last_seen_at=t,reward_xp=s.reward_xp,ended_at=s.ended_at where id=s.id returning * into s;
  insert into public.focus_events(session_id,sequence,client_id,action,credited_ms,created_at) values(s.id,s.sequence,p_client,p_action,credit,t);
  return s;
end; $$;

create function public.delete_my_account() returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required';end if;
  delete from auth.users where id=auth.uid();
end; $$;
revoke all on function public.create_character(text,jsonb),public.read_birth(text),public.focus_command(text,uuid,uuid,integer,integer,text,text),public.delete_my_account() from public,anon,authenticated;
grant execute on function public.create_character(text,jsonb),public.read_birth(text),public.focus_command(text,uuid,uuid,integer,integer,text,text),public.delete_my_account() to authenticated;
