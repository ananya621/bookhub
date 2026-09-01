-- Who becomes an admin automatically when they sign up.
--
-- This exists so a database built from scratch is never left with no
-- way in. Without it, a fresh deploy has no admin, and no way to make
-- one without hand-editing the database.
--
-- Deliberately a list of ADDRESSES, not accounts with passwords.
-- Creating auth users by hand in SQL is unsupported -- Supabase's own
-- troubleshooting notes say direct inserts leave rows in a broken state
-- and later fail with "Database error querying schema" -- and a password
-- committed to a repository is permanent, lives in every clone, and
-- outlives whoever chose it. This way the person signs up through the
-- app like anyone else, picks their own password, and is an admin from
-- the moment they land.
create table public.admin_emails (
  email      text primary key,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.admin_emails enable row level security;
-- No policies: nobody reads or writes this through the API. Only the
-- signup trigger touches it, and that runs as the definer.

insert into public.admin_emails (email, note) values
  ('ananyasodhani05@gmail.com', 'Ananya Sodhani - first admin, seeded so a fresh database is never locked out');

-- Same as before, plus the admin check. Kept deliberately small: this
-- runs inside the signup transaction, so anything that throws here
-- fails the whole signup and surfaces as the opaque "Database error
-- saving new user".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  insert into public.profiles (id) values (new.id);

  insert into public.user_roles (user_id, is_admin)
  values (
    new.id,
    exists (
      select 1 from public.admin_emails a
      where lower(a.email) = lower(new.email)
    )
  );

  return new;
end;
$fn$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- If the account already exists, promote it now rather than waiting for
-- a signup that will never happen again.
update public.user_roles r
   set is_admin = true
  from auth.users u
 where u.id = r.user_id
   and lower(u.email) in (select lower(a.email) from public.admin_emails a);
