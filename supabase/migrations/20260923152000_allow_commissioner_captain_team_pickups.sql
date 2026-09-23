do $$
declare
  fn text;
begin
  select pg_get_functiondef('public.captain_add_listed_unassigned_player(text)'::regprocedure)
  into fn;

  if position('and profile.role = ''Captain''' in fn) = 0 then
    raise exception 'Expected captain role predicate was not found.';
  end if;

  fn := replace(
    fn,
    'and profile.role = ''Captain''',
    'and profile.role in (''Captain'', ''Commissioner'')'
  );

  execute fn;
end
$$;
