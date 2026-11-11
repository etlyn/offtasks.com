-- Keep images out of planner imports, task sync and delegated integration payloads.
create table public.offtask_goal_logos (
  goal_id uuid primary key references public.offtask_goals(id) on delete cascade,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png')),
  image_base64 text not null check (length(image_base64) between 4 and 174764)
);

alter table public.offtask_goal_logos enable row level security;
revoke all on public.offtask_goal_logos from public, anon, authenticated, service_role;
grant select on public.offtask_goal_logos to authenticated;

create policy "First-party owner reads active goal logos"
  on public.offtask_goal_logos for select to authenticated
  using (
    public.offtask_first_party_request() and exists (
      select 1 from public.offtask_goals goal
      where goal.id = offtask_goal_logos.goal_id
        and goal.user_id = auth.uid()
        and goal.status = 'active'
    )
  );

-- Read only the image header needed to bound decoded dimensions.
create function public.offtask_goal_logo_dimensions_valid(image_type text, content bytea)
returns boolean
language plpgsql immutable strict
set search_path = pg_catalog, pg_temp
as $$
declare
  byte_count integer := octet_length(content);
  marker_offset integer := 2;
  marker_code integer;
  segment_length integer;
  image_width integer;
  image_height integer;
begin
  if image_type = 'image/png' then
    if byte_count < 45
      or substring(content from 1 for 16) <> decode('89504e470d0a1a0a0000000d49484452', 'hex')
      or substring(content from byte_count - 11) <> decode('0000000049454e44ae426082', 'hex')
    then return false;
    end if;
    -- Values larger than 16 bits are already beyond the accepted dimensions.
    if get_byte(content, 16) + get_byte(content, 17)
      + get_byte(content, 20) + get_byte(content, 21) <> 0
    then return false;
    end if;
    image_width := get_byte(content, 18) * 256 + get_byte(content, 19);
    image_height := get_byte(content, 22) * 256 + get_byte(content, 23);
  elsif image_type = 'image/jpeg' then
    if byte_count < 14
      or substring(content from 1 for 2) <> decode('ffd8', 'hex')
      or substring(content from byte_count - 1) <> decode('ffd9', 'hex')
    then return false;
    end if;
    while marker_offset + 3 < byte_count loop
      if get_byte(content, marker_offset) <> 255 then return false; end if;
      while marker_offset < byte_count loop
        exit when get_byte(content, marker_offset) <> 255;
        marker_offset := marker_offset + 1;
      end loop;
      if marker_offset + 2 >= byte_count then return false; end if;
      marker_code := get_byte(content, marker_offset);
      if marker_code in (0, 1, 216, 217, 218) or marker_code between 208 and 215 then
        return false;
      end if;
      segment_length := get_byte(content, marker_offset + 1) * 256
        + get_byte(content, marker_offset + 2);
      if segment_length < 2 or marker_offset + segment_length >= byte_count then
        return false;
      end if;
      -- Baseline, extended sequential and progressive frame headers.
      if marker_code in (192, 193, 194) then
        if segment_length < 8 or get_byte(content, marker_offset + 3) <> 8 then
          return false;
        end if;
        image_height := get_byte(content, marker_offset + 4) * 256
          + get_byte(content, marker_offset + 5);
        image_width := get_byte(content, marker_offset + 6) * 256
          + get_byte(content, marker_offset + 7);
        exit;
      end if;
      marker_offset := marker_offset + segment_length + 1;
    end loop;
  else
    return false;
  end if;
  return coalesce(image_width between 1 and 1024 and image_height between 1 and 1024, false);
end;
$$;
revoke all on function public.offtask_goal_logo_dimensions_valid(text, bytea)
  from public, anon, authenticated, service_role;

create function public.offtask_set_goal_logo(goal_id uuid, mime_type text, image_base64 text)
returns void
language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  owner_id uuid := public.offtask_integration_owner(null);
  image_bytes bytea;
begin
  -- Serialize with archive and deletion so an upload cannot outlive its parent.
  perform 1 from public.offtask_goals goal
  where goal.id = $1 and goal.user_id = owner_id and goal.status = 'active'
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'not_found'; end if;

  if $2 is null and $3 is null then
    delete from public.offtask_goal_logos logo where logo.goal_id = $1;
    return;
  end if;
  if $2 is null or $3 is null or $2 not in ('image/jpeg', 'image/png')
    or length($3) not between 4 and 174764 or length($3) % 4 <> 0
    or $3 !~ '^[A-Za-z0-9+/]+={0,2}$'
  then
    raise exception using errcode = '22023', message = 'Invalid goal logo image';
  end if;
  image_bytes := decode($3, 'base64');
  if octet_length(image_bytes) > 131072
    or not public.offtask_goal_logo_dimensions_valid($2, image_bytes)
  then
    raise exception using errcode = '22023', message = 'Invalid goal logo image or dimensions';
  end if;

  insert into public.offtask_goal_logos as logo (goal_id, mime_type, image_base64)
  values ($1, $2, $3)
  on conflict on constraint offtask_goal_logos_pkey do update
    set mime_type = excluded.mime_type, image_base64 = excluded.image_base64
    where (logo.mime_type, logo.image_base64)
      is distinct from (excluded.mime_type, excluded.image_base64);
end;
$$;
revoke all on function public.offtask_set_goal_logo(uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.offtask_set_goal_logo(uuid, text, text) to authenticated;
