-- Self-serve account deletion — App Review 5.1.1(v).
--
-- Settings → "Delete account" calls `supabase.rpc('delete_account')`
-- (src/lib/db/repository.ts deleteAccount). Contract: SECURITY DEFINER,
-- scoped to auth.uid(), removes the user's rows AND their auth.users record
-- in one transaction. The client then wipes the local cache and signs out.
--
-- SECURITY DEFINER runs as the function owner (postgres via the dashboard
-- SQL editor), which is what allows the delete from auth.users; auth.uid()
-- keeps it strictly self-scoped. EXECUTE is granted to authenticated only,
-- so anonymous clients can't even call it. Idempotent.

create or replace function public.delete_account()
    returns void
    language plpgsql
    security definer
    set search_path = public
as $$
declare
    uid uuid := auth.uid();
begin
    if uid is null then
        raise exception 'not authenticated';
    end if;
    delete from public.brews where "userId" = uid;
    delete from public.bags  where "userId" = uid;
    delete from auth.users   where id = uid;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
