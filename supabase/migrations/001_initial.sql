create extension if not exists pgcrypto with schema extensions;

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 30),
  invite_code_hash text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create table if not exists public.anniversaries (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 40),
  anniversary_date date not null,
  note text not null default '' check (char_length(note) <= 300),
  recurring boolean not null default true,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 50),
  event_date date not null,
  description text not null default '' check (char_length(description) <= 1500),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, space_id)
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  storage_path text not null unique,
  shot_at date,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (id, space_id)
);

create table if not exists public.event_photos (
  event_id uuid not null,
  photo_id uuid not null,
  space_id uuid not null references public.spaces(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, photo_id),
  foreign key (event_id, space_id) references public.events(id, space_id) on delete cascade,
  foreign key (photo_id, space_id) references public.photos(id, space_id) on delete cascade
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  photo_id uuid not null references public.photos(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 200),
  created_at timestamptz not null default now()
);

create table if not exists public.about_panels (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  position smallint not null check (position in (0, 1)),
  title text not null default '我们的手记' check (char_length(title) between 1 and 30),
  content text not null default '' check (char_length(content) <= 5000),
  updated_by uuid references auth.users(id) on delete set null,
  version integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (space_id, position)
);

create index if not exists members_user_id_idx on public.members(user_id);
create index if not exists anniversaries_space_date_idx on public.anniversaries(space_id, anniversary_date);
create index if not exists events_space_date_idx on public.events(space_id, event_date desc);
create index if not exists photos_space_created_idx on public.photos(space_id, created_at desc);
create index if not exists comments_photo_created_idx on public.comments(photo_id, created_at);
create index if not exists event_photos_space_idx on public.event_photos(space_id);

create or replace function public.is_space_member(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.members
    where space_id = p_space_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.create_space(p_space_name text, p_display_name text)
returns table (space_id uuid, space_name text, invite_code text)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_space_id uuid := gen_random_uuid();
  v_space_name text := trim(p_space_name);
  v_display_name text := trim(p_display_name);
  v_code text;
  v_attempt integer := 0;
begin
  if v_user_id is null then
    raise exception 'Anonymous sign-in is required';
  end if;
  if char_length(v_space_name) not between 1 and 30 then
    raise exception '空间名称需要 1 到 30 个字';
  end if;
  if char_length(v_display_name) not between 1 and 16 then
    raise exception '称呼需要 1 到 16 个字';
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10));
    exit when not exists (
      select 1
      from public.spaces
      where invite_code_hash = encode(digest(v_code, 'sha256'), 'hex')
    );
    if v_attempt >= 15 then
      raise exception '暂时无法生成邀请码，请重试';
    end if;
  end loop;

  insert into public.spaces (id, name, invite_code_hash, created_by)
  values (v_space_id, v_space_name, encode(digest(v_code, 'sha256'), 'hex'), v_user_id);

  insert into public.members (space_id, user_id, display_name)
  values (v_space_id, v_user_id, v_display_name);

  insert into public.about_panels (space_id, position, title)
  values
    (v_space_id, 0, '写给彼此的第一栏'),
    (v_space_id, 1, '写给彼此的第二栏');

  return query select v_space_id, v_space_name, v_code;
end;
$$;

create or replace function public.join_space(p_invite_code text, p_display_name text)
returns table (space_id uuid, space_name text)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_space public.spaces%rowtype;
  v_display_name text := trim(p_display_name);
  v_member_count integer;
begin
  if v_user_id is null then
    raise exception 'Anonymous sign-in is required';
  end if;
  if char_length(v_display_name) not between 1 and 16 then
    raise exception '称呼需要 1 到 16 个字';
  end if;

  select *
  into v_space
  from public.spaces
  where invite_code_hash = encode(digest(upper(trim(p_invite_code)), 'sha256'), 'hex');

  if v_space.id is null then
    raise exception '邀请码不正确';
  end if;

  if exists (
    select 1 from public.members
    where space_id = v_space.id and user_id = v_user_id
  ) then
    update public.members
    set display_name = v_display_name
    where space_id = v_space.id and user_id = v_user_id;
    return query select v_space.id, v_space.name;
    return;
  end if;

  select count(*) into v_member_count
  from public.members
  where space_id = v_space.id;

  if v_member_count >= 2 then
    raise exception '这个双人空间已经满了';
  end if;

  insert into public.members (space_id, user_id, display_name)
  values (v_space.id, v_user_id, v_display_name);

  return query select v_space.id, v_space.name;
end;
$$;

alter table public.spaces enable row level security;
alter table public.members enable row level security;
alter table public.anniversaries enable row level security;
alter table public.events enable row level security;
alter table public.photos enable row level security;
alter table public.event_photos enable row level security;
alter table public.comments enable row level security;
alter table public.about_panels enable row level security;

drop policy if exists "members can read their space" on public.spaces;
create policy "members can read their space"
on public.spaces for select
to authenticated
using (public.is_space_member(id));

drop policy if exists "members can read members" on public.members;
create policy "members can read members"
on public.members for select
to authenticated
using (public.is_space_member(space_id));

drop policy if exists "members can update own name" on public.members;
create policy "members can update own name"
on public.members for update
to authenticated
using (public.is_space_member(space_id) and user_id = auth.uid())
with check (public.is_space_member(space_id) and user_id = auth.uid());

drop policy if exists "space members manage anniversaries" on public.anniversaries;
create policy "space members manage anniversaries"
on public.anniversaries for all
to authenticated
using (public.is_space_member(space_id))
with check (public.is_space_member(space_id) and created_by = auth.uid());

drop policy if exists "space members manage events" on public.events;
create policy "space members manage events"
on public.events for all
to authenticated
using (public.is_space_member(space_id))
with check (public.is_space_member(space_id) and created_by = auth.uid());

drop policy if exists "space members manage photos" on public.photos;
create policy "space members manage photos"
on public.photos for all
to authenticated
using (public.is_space_member(space_id))
with check (public.is_space_member(space_id) and created_by = auth.uid());

drop policy if exists "space members manage event photos" on public.event_photos;
create policy "space members manage event photos"
on public.event_photos for all
to authenticated
using (public.is_space_member(space_id))
with check (public.is_space_member(space_id));

drop policy if exists "space members manage comments" on public.comments;
create policy "space members manage comments"
on public.comments for all
to authenticated
using (public.is_space_member(space_id))
with check (public.is_space_member(space_id) and author_id = auth.uid());

drop policy if exists "space members manage about panels" on public.about_panels;
create policy "space members manage about panels"
on public.about_panels for all
to authenticated
using (public.is_space_member(space_id))
with check (public.is_space_member(space_id) and (updated_by is null or updated_by = auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'love-photos',
  'love-photos',
  false,
  10485760,
  array['image/webp', 'image/jpeg', 'image/png', 'image/heic', 'image/heif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.is_photo_path_member(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_space_id uuid;
begin
  begin
    v_space_id := split_part(object_name, '/', 1)::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  return public.is_space_member(v_space_id);
end;
$$;

drop policy if exists "space members read photos" on storage.objects;
create policy "space members read photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'love-photos'
  and public.is_photo_path_member(name)
);

drop policy if exists "space members upload photos" on storage.objects;
create policy "space members upload photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'love-photos'
  and public.is_photo_path_member(name)
);

drop policy if exists "space members delete photos" on storage.objects;
create policy "space members delete photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'love-photos'
  and public.is_photo_path_member(name)
);

grant execute on function public.create_space(text, text) to authenticated;
grant execute on function public.join_space(text, text) to authenticated;
grant execute on function public.is_space_member(uuid) to authenticated;
grant execute on function public.is_photo_path_member(text) to authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'spaces',
    'members',
    'anniversaries',
    'events',
    'photos',
    'event_photos',
    'comments',
    'about_panels'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end;
$$;
