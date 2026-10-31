-- RLS / privilege tests for public.profiles.
--
-- How to run: execute this whole file in the Supabase SQL editor (or via
-- `execute_sql`). Everything happens inside one statement that ends with a
-- deliberate exception, so NO test data is ever committed.
--   * Expected result:  ERROR ... RLS_TESTS_PASSED (n checks)
--   * Anything else:    a "FAIL: ..." message naming the broken rule.
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a1';
  b uuid := '00000000-0000-4000-8000-0000000000b2';
  c uuid := '00000000-0000-4000-8000-0000000000c3';
  n int;
  v text;
  checks int := 0;
begin
  -- Setup: three users. A has a padded name, B has none, C has an oversized name.
  insert into auth.users (id, email, raw_user_meta_data) values
    (a, 'rls-a@example.test', jsonb_build_object('full_name', '  Alex Sterling  ')),
    (b, 'rls-b@example.test', '{}'::jsonb),
    (c, 'rls-c@example.test', jsonb_build_object('name', repeat('x', 200)));

  -- Signup trigger
  select display_name into v from public.profiles where id = a;
  if v is distinct from 'Alex Sterling' then raise exception 'FAIL: trigger should trim name, got %', v; end if;
  select display_name into v from public.profiles where id = b;
  if v is not null then raise exception 'FAIL: missing name should be null, got %', v; end if;
  select char_length(display_name) into n from public.profiles where id = c;
  if n <> 80 then raise exception 'FAIL: oversized name should be cut to 80, got %', n; end if;
  select plan into v from public.profiles where id = a;
  if v <> 'free' then raise exception 'FAIL: default plan should be free, got %', v; end if;
  checks := checks + 4;

  -- Function privileges: trigger functions must not be callable as API functions
  if has_function_privilege('authenticated', 'public.handle_new_user()', 'execute')
     or has_function_privilege('anon', 'public.handle_new_user()', 'execute') then
    raise exception 'FAIL: handle_new_user must not be executable by API roles';
  end if;
  checks := checks + 1;

  -- Act as user A
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from public.profiles;
  if n <> 1 then raise exception 'FAIL: A should see exactly 1 row, saw %', n; end if;
  select count(*) into n from public.profiles where id = b;
  if n <> 0 then raise exception 'FAIL: A can read B''s profile'; end if;
  checks := checks + 2;

  update public.profiles set display_name = 'Alex' where id = a;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: A should update own display_name'; end if;
  update public.profiles set display_name = 'Hacked' where id = b;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: A updated B''s row'; end if;
  checks := checks + 2;

  begin
    update public.profiles set plan = 'pro' where id = a;
    raise exception 'FAIL: A upgraded own plan';
  exception when insufficient_privilege then null; end;

  begin
    update public.profiles set id = gen_random_uuid() where id = a;
    raise exception 'FAIL: A changed own id';
  exception when insufficient_privilege then null; end;

  begin
    insert into public.profiles (id) values (gen_random_uuid());
    raise exception 'FAIL: A inserted a profile';
  exception when insufficient_privilege then null; end;

  begin
    delete from public.profiles where id = a;
    raise exception 'FAIL: A deleted a profile';
  exception when insufficient_privilege then null; end;
  checks := checks + 4;

  begin
    update public.profiles set display_name = repeat('x', 81) where id = a;
    raise exception 'FAIL: 81-char name accepted';
  exception when check_violation then null; end;

  begin
    update public.profiles set display_name = '' where id = a;
    raise exception 'FAIL: empty name accepted';
  exception when check_violation then null; end;
  checks := checks + 2;

  reset role;

  -- Anonymous (not signed in)
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  begin
    perform 1 from public.profiles;
    raise exception 'FAIL: anon can read profiles';
  exception when insufficient_privilege then null; end;
  reset role;
  checks := checks + 1;

  -- Deleting the auth user removes the profile (account deletion path)
  delete from auth.users where id = a;
  select count(*) into n from public.profiles where id = a;
  if n <> 0 then raise exception 'FAIL: profile should cascade-delete with the user'; end if;
  checks := checks + 1;

  raise exception 'RLS_TESTS_PASSED (% checks)', checks;
end;
$$;
