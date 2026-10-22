-- Delivery 5C: proposed locally; remote execution requires authorization.
begin;
set local lock_timeout='5s';
create function public.load_game_save(p_save uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();s public.game_saves;begin
 if u is null then raise exception 'Authentication required';end if;
 perform 1 from public.profiles where id=u for share;
 s:=game_private.checked_save(p_save);
 return jsonb_build_object(
  'context',public.get_game_context(p_save),
  'profile',(select jsonb_build_object('nickname',nickname,'is_public',is_public,'account_xp',account_xp) from public.profiles where id=u),
  'household',(select to_jsonb(h) from public.households h where id=s.primary_household_id and save_id=s.id and user_id=u),
  'characters',coalesce((select jsonb_agg(to_jsonb(c) order by c.id) from public.characters c where save_id=s.id and user_id=u),'[]'::jsonb),
  'memories',coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at,m.id) from public.character_memories m where save_id=s.id and user_id=u),'[]'::jsonb),
  'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at,e.id) from public.game_events e where save_id=s.id and user_id=u),'[]'::jsonb),
  'room',public.room_state_for_save(s.id),
  'sessions',coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at desc) from public.focus_sessions f where user_id=u),'[]'::jsonb));
end $$;
create function public.select_save_protagonist(p_save uuid,p_character uuid,p_expected_revision bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();s public.game_saves;c public.characters;begin
 if u is null then raise exception 'Authentication required';end if;
 perform 1 from public.profiles where id=u for update;
 s:=game_private.checked_save(p_save);
 select * into c from public.characters where id=p_character and user_id=u and save_id=s.id
  and household_id=s.primary_household_id and archived_at is null
  and ((render_system='legacy' and life_stage='baby') or (render_system='lpc' and life_stage='adult'));
 if not found then raise exception 'Ineligible protagonist';end if;
 if s.protagonist_id=c.id and s.state='ready' then return public.get_game_context(s.id);end if;
 if s.state='ready' or p_expected_revision is null or s.world_revision<>p_expected_revision then raise exception 'Selection conflict';end if;
 update public.game_saves set protagonist_id=c.id,current_generation=c.generation,state='ready',world_revision=world_revision+1 where id=s.id;
 insert into public.game_events(user_id,save_id,character_id,kind,payload)
 values(u,s.id,c.id,'ProtagonistSelected',jsonb_build_object('previousState',s.state));
 return public.get_game_context(s.id);
end $$;
revoke all on function public.load_game_save(uuid),public.select_save_protagonist(uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.load_game_save(uuid),public.select_save_protagonist(uuid,uuid,bigint) to authenticated;
commit;
