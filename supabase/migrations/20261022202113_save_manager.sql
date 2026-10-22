-- Delivery 5D. Local proposal; do not apply remotely without authorization.
begin;
set local lock_timeout = '5s';

-- Durable request receipts, not exposed through the Data API.
create table game_private.save_creation_requests (
 user_id uuid not null references public.profiles(id) on delete cascade,
 request_id uuid not null,
 save_id uuid not null,
 name text not null,
 created_at timestamptz not null default now(),
 primary key(user_id,request_id),
 foreign key(save_id,user_id) references public.game_saves(id,user_id)
);
alter table game_private.save_creation_requests enable row level security;
revoke all on game_private.save_creation_requests from public,anon,authenticated;

create function public.list_game_saves(p_archived boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();begin
 if u is null then raise exception 'Authentication required';end if;
 if p_archived is null then raise exception 'Invalid filter';end if;
 return jsonb_build_object('saves',coalesce((
  select jsonb_agg(jsonb_build_object('save',to_jsonb(s),'protagonist',
   case when c.id is null then null else jsonb_build_object('id',c.id,'name',c.name,
    'user_id',c.user_id,'save_id',c.save_id,'household_id',c.household_id,
    'life_stage',c.life_stage,'render_system',c.render_system,'appearance',c.appearance) end,
   'focus_pending',exists(select 1 from public.focus_sessions f
    where f.user_id=u and f.status in ('active','paused','interrupted') and f.origin_save_id=s.id))
   order by s.last_used_at desc nulls last,s.created_at desc,s.id)
  from public.game_saves s left join public.characters c on c.id=s.protagonist_id
   and c.user_id=u and c.save_id=s.id and c.household_id=s.primary_household_id and c.archived_at is null
  where s.user_id=u and (s.archived_at is not null)=p_archived),'[]'::jsonb));
end $$;

create function public.create_game_save(p_request uuid,p_name text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();s public.game_saves; receipt game_private.save_creation_requests;h uuid;n text:=trim(p_name);begin
 if u is null then raise exception 'Authentication required';end if;
 if p_request is null or n is null or char_length(n) not between 2 and 80 then raise exception 'Invalid save name or request';end if;
 perform 1 from public.profiles where id=u for update;
 if not found then raise exception 'Profile required';end if;
 select * into receipt from game_private.save_creation_requests where user_id=u and request_id=p_request;
 if found then
  if receipt.name<>n then raise exception 'Request payload conflict';end if;
  select * into s from public.game_saves where id=receipt.save_id and user_id=u;
  return to_jsonb(s);
 end if;
 insert into public.game_saves(user_id,name) values(u,n) returning * into s;
 insert into public.households(user_id,save_id) values(u,s.id) returning id into h;
 update public.game_saves set primary_household_id=h where id=s.id returning * into s;
 insert into game_private.save_creation_requests(user_id,request_id,save_id,name) values(u,p_request,s.id,n);
 insert into public.game_events(user_id,save_id,kind,payload) values(u,s.id,'SaveCreated','{}');
 return to_jsonb(s);
end $$;

create function public.set_game_save_archived(p_save uuid,p_archived boolean,p_expected_revision bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();s public.game_saves;begin
 if u is null then raise exception 'Authentication required';end if;
 if p_archived is null or p_expected_revision is null or p_expected_revision<0 then raise exception 'Invalid archive request';end if;
 perform 1 from public.profiles where id=u for update;
 select * into s from public.game_saves where id=p_save and user_id=u for update;
 if not found then raise exception 'Save not found';end if;
 -- A retry of an already satisfied operation does not duplicate events/revisions.
 if (s.archived_at is not null)=p_archived then return to_jsonb(s);end if;
 if s.world_revision<>p_expected_revision then raise exception 'Save revision conflict';end if;
 if p_archived and exists(select 1 from public.focus_sessions f where f.user_id=u
   and f.status in ('active','paused','interrupted') and (f.origin_save_id=s.id or
    exists(select 1 from public.characters c where c.id=f.character_id and c.user_id=u and c.save_id=s.id)))
 then raise exception 'Continue or finish the existing focus session before archiving';end if;
 update public.game_saves set archived_at=case when p_archived then clock_timestamp() else null end,
  world_revision=world_revision+1 where id=s.id returning * into s;
 insert into public.game_events(user_id,save_id,kind,payload)
 values(u,s.id,case when p_archived then 'SaveArchived' else 'SaveRestored' end,'{}');
 return to_jsonb(s);
end $$;

revoke all on function public.list_game_saves(boolean),public.create_game_save(uuid,text),public.set_game_save_archived(uuid,boolean,bigint) from public,anon,authenticated;
grant execute on function public.list_game_saves(boolean),public.create_game_save(uuid,text),public.set_game_save_archived(uuid,boolean,bigint) to authenticated;
commit;
