-- Run after the audit identity migration inside a transaction; always roll back.
-- Synthetic users have no email/password and exist only for this transaction.
begin;
insert into auth.users(id) values
 ('92500000-0000-0000-0000-000000000001'),
 ('92500000-0000-0000-0000-000000000002');
insert into public.launch_profiles(id,user_id,display_name,role,status) values
 ('audit-claimant','92500000-0000-0000-0000-000000000001','Audit Claimant','Player','Pending'),
 ('audit-reviewer','92500000-0000-0000-0000-000000000002','Audit Reviewer','Commissioner','Approved')
on conflict(user_id) do update set id=excluded.id,display_name=excluded.display_name,role=excluded.role,status=excluded.status;
insert into public.launch_players(id,name) values ('audit-unclaimed-player','Audit Historical Player');

set local role authenticated;
set local "request.jwt.claim.sub" = '92500000-0000-0000-0000-000000000001';
do $$
begin
  assert public.complete_launch_player_setup(true,'audit-unclaimed-player') is null;
  assert exists(select 1 from public.launch_profiles where id='audit-claimant' and player_id is null and status='Pending');
  assert exists(select 1 from public.launch_player_claims where profile_id='audit-claimant' and status='Pending');
  assert not private.clubhouse_can_access((select id from public.launch_seasons where active limit 1),'beast-mode');
  begin
    perform public.approve_verified_player_claim((select id from public.launch_player_claims where profile_id='audit-claimant'));
    raise exception 'Claimant approved their own claim';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.complete_launch_player_setup(false,null);
    raise exception 'Pending claim bypassed through new-player setup';
  exception when check_violation then null;
  end;
end;
$$;
set local "request.jwt.claim.sub" = '92500000-0000-0000-0000-000000000002';
do $$
begin
  assert public.approve_verified_player_claim((select id from public.launch_player_claims where profile_id='audit-claimant')) = 'audit-unclaimed-player';
  assert exists(select 1 from public.launch_profiles where id='audit-claimant' and player_id='audit-unclaimed-player' and status='Approved');
end;
$$;
insert into public.launch_clubhouse_posts(id,season_id,team_id,author_profile_id,body)
select '92500000-0000-0000-0000-000000000011',id,'beast-mode','audit-reviewer','Audit post'
from public.launch_seasons where active limit 1;
insert into public.launch_clubhouse_comments(id,post_id,author_profile_id,body)
values ('92500000-0000-0000-0000-000000000012','92500000-0000-0000-0000-000000000011','audit-reviewer','Audit comment');
do $$
begin
  update public.launch_clubhouse_posts set body='Edited post',pinned_at=now()
  where id='92500000-0000-0000-0000-000000000011';
  assert found;
  update public.launch_clubhouse_comments set body='Edited comment'
  where id='92500000-0000-0000-0000-000000000012';
  assert found;
  begin
    update public.launch_clubhouse_posts set author_profile_id='audit-claimant'
    where id='92500000-0000-0000-0000-000000000011';
    raise exception 'Post author could be reassigned';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.launch_clubhouse_comments set author_profile_id='audit-claimant'
    where id='92500000-0000-0000-0000-000000000012';
    raise exception 'Comment author could be reassigned';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
rollback;
