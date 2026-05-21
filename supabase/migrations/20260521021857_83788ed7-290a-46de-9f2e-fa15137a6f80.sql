
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.search_modules(text, uuid) from public, anon;
grant execute on function public.search_modules(text, uuid) to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
