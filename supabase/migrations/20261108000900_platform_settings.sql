-- =====================================================================
-- Platform settings enforced in the database (not just the UI)
-- =====================================================================

create or replace function public.setting_enabled(k text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select value::text from public.platform_settings where key = k), 'true') <> 'false'
$$;

-- Community chat can be switched off platform-wide by admins.
drop policy "community chat members write" on public.community_messages;
create policy "community chat members write" on public.community_messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_community_member(community_id) and public.is_active_user()
              and public.setting_enabled('community_chat_enabled'));

-- Admins can create communities for new categories automatically.
create or replace function public.on_category_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.communities (category_id, slug, name, description, icon)
  values (new.id, new.slug, new.name, new.description, new.icon)
  on conflict do nothing;
  return null;
end $$;
create trigger categories_create_community after insert on public.categories
  for each row execute function public.on_category_created();
