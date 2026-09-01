-- Trigger functions must not be reachable over the REST API. Both of
-- these were exposed at /rest/v1/rpc/... by the default grant to PUBLIC,
-- which the Supabase security advisor flagged.
--
-- Revoking EXECUTE does not affect the triggers themselves: a trigger
-- runs as the table owner, not as the caller, so the signup path is
-- unchanged.
revoke all on function public.handle_new_user()   from public, anon, authenticated;
revoke all on function public.touch_updated_at()  from public, anon, authenticated;

-- fold_name and is_name_allowed are plain SECURITY INVOKER helpers, but
-- there is no reason for a client to call them directly either. They are
-- reachable through check_display_name(), which is the intended surface.
revoke all on function public.fold_name(text)      from public, anon, authenticated;
revoke all on function public.is_name_allowed(text) from public, anon, authenticated;
