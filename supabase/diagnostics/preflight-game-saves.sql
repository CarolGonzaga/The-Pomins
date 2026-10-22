-- Read-only preflight. No session recovery, cancellation, DDL or data changes.
select jsonb_build_object(
 'saves_already_present',to_regclass('public.game_saves') is not null,
 'counts',jsonb_build_object('profiles',(select count(*) from public.profiles),'households',(select count(*) from public.households),'characters',(select count(*) from public.characters),'memories',(select count(*) from public.character_memories),'events',(select count(*) from public.game_events),'sessions',(select count(*) from public.focus_sessions),'credits',(select count(*) from public.focus_credits),'allocations',(select count(*) from public.focus_allocations),'requests',(select count(*) from public.allocation_requests),'rewards',(select count(*) from public.focus_rewards)),
 'open_sessions',coalesce((select jsonb_object_agg(status,n) from (select status,count(*) n from public.focus_sessions where status in ('active','paused','interrupted') group by status) x),'{}'::jsonb),
 'totals',jsonb_build_object('eligible',(select coalesce(sum(eligible_minutes),0) from public.focus_credits),'allocated',(select coalesce(sum(allocated_minutes),0) from public.focus_credits),'allocated_rows',(select coalesce(sum(minutes),0) from public.focus_allocations),'coins',(select coalesce(sum(coins),0) from public.wallets),'wallet_energy',(select coalesce(sum(energy),0) from public.wallets),'account_xp',(select coalesce(sum(account_xp),0) from public.profiles)),
 'incompatible_links',jsonb_build_object(
  'profiles_without_household',(select count(*) from public.profiles p left join public.households h on h.user_id=p.id where h.id is null),
  'character_household',(select count(*) from public.characters c left join public.households h on h.id=c.household_id and h.user_id=c.user_id where h.id is null),
  'session_character',(select count(*) from public.focus_sessions s join public.characters c on c.id=s.character_id where c.user_id<>s.user_id),
  'credit_session',(select count(*) from public.focus_credits f join public.focus_sessions s on s.id=f.session_id where s.user_id<>f.user_id),
  'allocation_character',(select count(*) from public.focus_allocations a join public.characters c on c.id=a.character_id where a.user_id<>c.user_id),
  'allocation_credit',(select count(*) from public.focus_allocations a join public.focus_credits f on f.session_id=a.session_id where a.user_id<>f.user_id),
  'allocation_request',(select count(*) from public.focus_allocations a join public.allocation_requests r on r.id=a.request_id where a.user_id<>r.user_id),
  'memory_character',(select count(*) from public.character_memories m join public.characters c on c.id=m.character_id where m.user_id<>c.user_id),
  'event_character',(select count(*) from public.game_events e join public.characters c on c.id=e.character_id where e.user_id<>c.user_id)),
 'functions',(select jsonb_agg(jsonb_build_object('name',proname,'body_md5',md5(replace(prosrc,E'\r','')),'security_definer',prosecdef) order by proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('new_household','assign_household','credit_completed_focus','room_state','room_command','baby_state','baby_care','create_character','read_birth','start_resident_focus','focus_command'))
) as preflight;
