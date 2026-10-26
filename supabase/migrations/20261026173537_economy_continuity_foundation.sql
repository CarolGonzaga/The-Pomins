-- 6D-A: INERT foundation. No hooks on existing tables, charges, jobs or penalties.
-- Remote application requires separate authorization, backup and restore rehearsal.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table public.economy_rule_versions (
 version integer primary key check(version>0),
 mandatory boolean not null default true check(mandatory),
 warning_seconds integer not null check(warning_seconds>0),
 regression_seconds integer not null,
 closure_seconds integer not null,
 regression_basis_points integer not null check(regression_basis_points between 0 and 10000),
 regression_skill_cap integer not null check(regression_skill_cap>=0),
 recovery_on_valid_focus boolean not null default true check(recovery_on_valid_focus),
 created_at timestamptz not null default clock_timestamp(),
 check(warning_seconds<regression_seconds and regression_seconds<closure_seconds)
);
insert into public.economy_rule_versions(version,warning_seconds,regression_seconds,closure_seconds,regression_basis_points,regression_skill_cap)
 values(1,259200,604800,2592000,500,5);

create table game_private.economy_release (
 singleton boolean primary key default true check(singleton),
 rules_version integer not null references public.economy_rule_versions(version),
 planned_activation_at timestamptz,
 activation_at timestamptz,
 -- Intentional launch lock, removable only in a separately authorized migration.
 constraint economy_6da_activation_locked check(activation_at is null)
);
insert into game_private.economy_release(rules_version) values(1);

create table public.account_continuity (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 rules_version integer not null references public.economy_rule_versions(version),
 activation_at timestamptz,
 last_valid_session_id uuid,
 last_valid_completed_at timestamptz,
 observed_at timestamptz not null default clock_timestamp(),
 revision bigint not null default 0 check(revision>=0),
 foreign key(last_valid_session_id,user_id) references public.focus_sessions(id,user_id),
 check((last_valid_session_id is null)=(last_valid_completed_at is null)),
 constraint account_continuity_6da_locked check(activation_at is null)
);
-- An observation only. No session date, profile revision or credit is rewritten.
insert into public.account_continuity(user_id,rules_version,last_valid_session_id,last_valid_completed_at)
 select p.id,1,f.id,f.ended_at from public.profiles p left join lateral (
   select id,ended_at from public.focus_sessions where user_id=p.id and status='completed'
    and validated_ms>=planned_seconds::bigint*1000 and ended_at is not null
   order by ended_at desc,id desc limit 1
 ) f on true;

create table public.save_continuity (
 save_id uuid primary key,
 user_id uuid not null,
 rules_version integer not null references public.economy_rule_versions(version),
 journey_started_at timestamptz,
 activation_at timestamptz,
 lifecycle text not null default 'open' check(lifecycle in ('open','closed')),
 closed_at timestamptz,
 closure_reason text,
 revision bigint not null default 0 check(revision>=0),
 unique(save_id,user_id),
 foreign key(save_id,user_id) references public.game_saves(id,user_id) on delete cascade,
 check((lifecycle='open' and closed_at is null and closure_reason is null) or
       (lifecycle='closed' and closed_at is not null and closure_reason='inactivity')),
 constraint save_continuity_6da_locked check(activation_at is null and journey_started_at is null and lifecycle='open')
);
insert into public.save_continuity(save_id,user_id,rules_version) select id,user_id,1 from public.game_saves;
create index save_continuity_owner on public.save_continuity(user_id,save_id);

create table public.inactivity_cycles (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 rules_version integer not null references public.economy_rule_versions(version),
 anchor_at timestamptz,
 ended_at timestamptz,
 source_session_id uuid,
 request_id uuid not null,
 created_at timestamptz not null default clock_timestamp(),
 unique(id,user_id),unique(user_id,request_id),
 foreign key(source_session_id,user_id) references public.focus_sessions(id,user_id),
 check(ended_at is null or (anchor_at is not null and ended_at>=anchor_at)),
 constraint inactivity_cycles_6da_locked check(anchor_at is null and ended_at is null)
);

create function game_private.valid_skill_snapshot(p jsonb,p_cap integer default 2147483647)
 returns boolean language plpgsql immutable set search_path='' as $$
declare k text;v jsonb;n numeric;count_keys integer:=0;
begin
 if p is null or jsonb_typeof(p)<>'object' or p_cap is null or p_cap<0 then return false;end if;
 for k,v in select * from jsonb_each(p) loop
   if k not in ('knowledge','creativity','sociability','autonomy','wellbeing') or jsonb_typeof(v)<>'number' then return false;end if;
   n:=(v::text)::numeric;if n<0 or n>p_cap or n<>trunc(n) then return false;end if;
   count_keys:=count_keys+1;
 end loop;
 return count_keys=5;
end $$;

create table public.character_continuity_baselines (
 character_id uuid primary key,
 user_id uuid not null,save_id uuid not null,
 rules_version integer not null references public.economy_rule_versions(version),
 captured_at timestamptz,
 skills jsonb not null check(game_private.valid_skill_snapshot(skills)),
 foreign key(character_id,save_id,user_id) references public.characters(id,save_id,user_id) on delete cascade,
 constraint character_baselines_6da_locked check(captured_at is null)
);

create table public.continuity_events (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null,cycle_id uuid not null,
 save_id uuid,character_id uuid,
 kind text not null check(kind in ('warning','regression','recovery','journey_closed')),
 request_id uuid not null,
 occurred_at timestamptz not null default clock_timestamp(),
 applied_at timestamptz,
 payload jsonb not null default '{}' check(jsonb_typeof(payload)='object'),
 skill_adjustment jsonb,
 unique(id,user_id),unique(id,user_id,save_id,kind),unique(user_id,request_id),
 unique nulls not distinct(user_id,cycle_id,save_id,character_id,kind),
 foreign key(cycle_id,user_id) references public.inactivity_cycles(id,user_id) on delete cascade,
 foreign key(save_id,user_id) references public.game_saves(id,user_id) on delete cascade,
 foreign key(character_id,save_id,user_id) references public.characters(id,save_id,user_id) on delete cascade,
 check(character_id is null or save_id is not null),
 check(kind not in ('regression','recovery') or (character_id is not null and skill_adjustment is not null)),
 check(kind<>'journey_closed' or save_id is not null),
 check(skill_adjustment is null or game_private.valid_skill_snapshot(skill_adjustment,5)),
 constraint continuity_events_6da_locked check(applied_at is null)
);
create index character_baselines_owner on public.character_continuity_baselines(user_id,save_id,character_id);
create index continuity_events_owner on public.continuity_events(user_id,save_id,occurred_at,id);

create table public.character_memorials (
 character_id uuid primary key,user_id uuid not null,save_id uuid not null,
 closure_event_id uuid not null,
 event_kind text not null default 'journey_closed' check(event_kind='journey_closed'),
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
 recorded_at timestamptz not null default clock_timestamp(),
 published_at timestamptz,
 foreign key(character_id,save_id,user_id) references public.characters(id,save_id,user_id) on delete cascade,
 foreign key(closure_event_id,user_id,save_id,event_kind) references public.continuity_events(id,user_id,save_id,kind),
 constraint character_memorials_6da_locked check(published_at is null)
);

create table public.cosmetic_catalog (
 id text primary key check(char_length(id) between 1 and 100),
 category text not null check(category in ('hair','palette','clothing','accessory','decoration','legacy_bundle')),
 asset_key text not null,
 allowed_stages text[] not null check(cardinality(allowed_stages)>0 and allowed_stages<@array['baby','child','teen','adult','elder']::text[]),
 allowed_species text[] not null check(cardinality(allowed_species)>0 and allowed_species<@array['human','alien']::text[]),
 available_by_default boolean not null default false,
 asset_available boolean not null default false,
 metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object'),
 unique(id,available_by_default),
 check(id not like 'legacy.%' or available_by_default)
);
create index character_memorials_owner on public.character_memorials(user_id,save_id,character_id);
insert into public.cosmetic_catalog(id,category,asset_key,allowed_stages,allowed_species,available_by_default,asset_available)
 select 'legacy.hair.'||h,'hair','lpc:hair:'||h,array['adult'],array['human'],true,true
 from unnest(array['plain','afro','bob','long','ponytail','wavy','none']) h;
insert into public.cosmetic_catalog(id,category,asset_key,allowed_stages,allowed_species,available_by_default,asset_available)
 select 'legacy.top.'||t,'clothing','lpc:top:'||t,array['adult'],array['human'],true,true
 from unnest(array['longsleeve','shortsleeve','sleeveless']) t;
insert into public.cosmetic_catalog values
 ('legacy.custom-colors','palette','existing:rgb',array['baby','adult'],array['human','alien'],true,true,'{"freeform_rgb":true}'),
 ('legacy.baby-customization','legacy_bundle','existing:baby-svg',array['baby'],array['human','alien'],true,true,'{}');

create table public.economy_offer_versions (
 id text not null,version integer not null check(version>0),
 kind text not null check(kind in ('care','development','cosmetic')),
 activity_id text references public.activities(id),
 cosmetic_id text,cosmetic_free boolean,
 price_minutes integer not null check(price_minutes between 0 and 7200),
 effects_snapshot jsonb not null default '{}' check(jsonb_typeof(effects_snapshot)='object'),
 created_at timestamptz not null default clock_timestamp(),
 enabled_at timestamptz,
 primary key(id,version),unique(id,version,price_minutes,kind),unique(id,version,cosmetic_id),
 foreign key(cosmetic_id,cosmetic_free) references public.cosmetic_catalog(id,available_by_default),
 check((kind='cosmetic' and cosmetic_id is not null and cosmetic_free is not null and activity_id is null and (not cosmetic_free or price_minutes=0)) or
       (kind in ('care','development') and activity_id is not null and cosmetic_id is null and cosmetic_free is null and price_minutes>0)),
 constraint economy_offers_6da_locked check(enabled_at is null)
);
insert into public.economy_offer_versions(id,version,kind,activity_id,price_minutes,effects_snapshot)
 select a.id,1,'care',a.id,2,jsonb_build_object('legacy_per_minute',r.rules->'effects'->a.id,'draft',true)
 from public.activities a cross join public.baby_care_config r
 where a.id in ('baby_feed','baby_bath','baby_diaper','baby_play','baby_cuddle','baby_sleep');

create table public.economy_purchase_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 request_id uuid not null,
 request_payload jsonb not null check(jsonb_typeof(request_payload)='object'),
 kind text not null,offer_id text not null,offer_version integer not null,
 price_minutes integer not null,
 save_id uuid,character_id uuid,cosmetic_id text,
 state text not null default 'planned' check(state in ('planned','committed','rejected')),
 created_at timestamptz not null default clock_timestamp(),
 committed_at timestamptz,
 receipt jsonb not null default '{}' check(jsonb_typeof(receipt)='object'),
 unique(id,user_id),unique(id,user_id,cosmetic_id),unique(user_id,request_id),
 foreign key(offer_id,offer_version,price_minutes,kind) references public.economy_offer_versions(id,version,price_minutes,kind),
 foreign key(offer_id,offer_version,cosmetic_id) references public.economy_offer_versions(id,version,cosmetic_id),
 foreign key(save_id,user_id) references public.game_saves(id,user_id),
 foreign key(character_id,save_id,user_id) references public.characters(id,save_id,user_id),
 check(character_id is null or save_id is not null),
 check((kind in ('care','development') and character_id is not null and save_id is not null and cosmetic_id is null) or (kind='cosmetic' and cosmetic_id is not null)),
 constraint economy_purchases_6da_locked check(state='planned' and committed_at is null)
);
create index economy_purchases_owner on public.economy_purchase_requests(user_id,created_at,id);

create table public.economy_purchase_sources (
 purchase_id uuid not null,user_id uuid not null,
 line integer not null check(line>0),session_id uuid not null,
 minutes integer not null check(minutes between 1 and 7200),
 allocation_id uuid unique references public.focus_allocations(id),
 primary key(purchase_id,line),unique(purchase_id,session_id),
 foreign key(purchase_id,user_id) references public.economy_purchase_requests(id,user_id) on delete cascade,
 foreign key(session_id,user_id) references public.focus_credits(session_id,user_id)
);
create function game_private.validate_purchase_source() returns trigger
 language plpgsql set search_path='' as $$
declare p public.economy_purchase_requests;used integer;credit public.focus_credits;
begin
 if tg_op='UPDATE' and (new.purchase_id,new.user_id,new.line) is distinct from (old.purchase_id,old.user_id,old.line) then
  raise exception 'Funding identity is immutable';
 end if;
 -- Same outer account lock as current spending paths; these drafts reserve nothing.
 perform 1 from public.profiles where id=new.user_id for update;
 select * into strict p from public.economy_purchase_requests where id=new.purchase_id and user_id=new.user_id for update;
 select * into strict credit from public.focus_credits where session_id=new.session_id and user_id=new.user_id;
 select coalesce(sum(minutes),0) into used from public.economy_purchase_sources
  where purchase_id=new.purchase_id and (tg_op='INSERT' or line<>old.line);
 if used+new.minutes>p.price_minutes or new.minutes>credit.eligible_minutes then raise exception 'Invalid planned funding';end if;
 if new.allocation_id is not null and not exists(select 1 from public.focus_allocations a
  where a.id=new.allocation_id and a.user_id=new.user_id and a.session_id=new.session_id
   and a.character_id=p.character_id and a.save_id=p.save_id and a.minutes=new.minutes) then
  raise exception 'Allocation provenance mismatch';
 end if;
 return new;
end $$;
create index economy_sources_owner on public.economy_purchase_sources(user_id,session_id);
create trigger validate_economy_purchase_source before insert or update on public.economy_purchase_sources
 for each row execute function game_private.validate_purchase_source();
-- Sources are non-reserving plans. No trigger updates allocated_minutes.
create table public.account_inventory (
 user_id uuid not null references public.profiles(id) on delete cascade,
 cosmetic_id text not null references public.cosmetic_catalog(id),
 purchase_id uuid not null,
 recorded_at timestamptz not null default clock_timestamp(),
 granted_at timestamptz,
 primary key(user_id,cosmetic_id),
 foreign key(purchase_id,user_id,cosmetic_id) references public.economy_purchase_requests(id,user_id,cosmetic_id),
 constraint account_inventory_6da_locked check(granted_at is null)
);

-- No writes granted to clients. RLS also protects access through invoker contexts.
do $$ declare t text; begin
 foreach t in array array['economy_rule_versions','account_continuity','save_continuity','inactivity_cycles','character_continuity_baselines','continuity_events','character_memorials','cosmetic_catalog','economy_offer_versions','economy_purchase_requests','economy_purchase_sources','account_inventory'] loop
   execute format('alter table public.%I enable row level security',t);
   execute format('revoke all on public.%I from public,anon,authenticated',t);
   execute format('grant select on public.%I to authenticated',t);
   if t in ('economy_rule_versions','cosmetic_catalog','economy_offer_versions') then
     execute format('create policy catalog_read on public.%I for select to authenticated using(true)',t);
   else
     execute format('create policy owner_read on public.%I for select to authenticated using(user_id=(select auth.uid()))',t);
   end if;
 end loop;
end $$;
alter table game_private.economy_release enable row level security;
revoke all on game_private.economy_release from public,anon,authenticated;

create function game_private.preview_inactivity(p_seconds numeric,p_version integer default 1)
 returns text language plpgsql stable set search_path='' as $$
declare r public.economy_rule_versions;
begin
 if p_seconds is null or p_seconds<0 or p_seconds::text in ('NaN','Infinity','-Infinity') then raise exception 'Invalid elapsed seconds';end if;
 select * into strict r from public.economy_rule_versions where version=p_version;
 return case when p_seconds>=r.closure_seconds then 'closure_due' when p_seconds>=r.regression_seconds then 'regression_due' when p_seconds>=r.warning_seconds then 'warning' else 'normal' end;
end $$;

create function public.get_economy_foundation() returns jsonb
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
  'care_offers',(select coalesce(jsonb_agg(jsonb_build_object('activity_id',activity_id,'version',version,'price_minutes',price_minutes,'enabled',false) order by activity_id),'[]') from public.economy_offer_versions where kind='care'));
end $$;
revoke all on function game_private.valid_skill_snapshot(jsonb,integer),game_private.preview_inactivity(numeric,integer),game_private.validate_purchase_source() from public,anon,authenticated;
revoke all on function public.get_economy_foundation() from public,anon,authenticated;
grant execute on function public.get_economy_foundation() to authenticated;
comment on function public.get_economy_foundation() is '6D-A read-only diagnostics. No activation, clock reset, reservation, charge or penalty.';
commit;
