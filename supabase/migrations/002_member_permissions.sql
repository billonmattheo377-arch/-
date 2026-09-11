drop policy if exists "space members manage anniversaries" on public.anniversaries;
drop policy if exists "space members manage events" on public.events;
drop policy if exists "space members manage photos" on public.photos;
drop policy if exists "space members manage comments" on public.comments;

create policy "space members read anniversaries"
on public.anniversaries for select
to authenticated
using (public.is_space_member(space_id));

create policy "space members create anniversaries"
on public.anniversaries for insert
to authenticated
with check (public.is_space_member(space_id) and created_by = auth.uid());

create policy "space members update anniversaries"
on public.anniversaries for update
to authenticated
using (public.is_space_member(space_id))
with check (public.is_space_member(space_id));

create policy "space members delete anniversaries"
on public.anniversaries for delete
to authenticated
using (public.is_space_member(space_id));

create policy "space members read events"
on public.events for select
to authenticated
using (public.is_space_member(space_id));

create policy "space members create events"
on public.events for insert
to authenticated
with check (public.is_space_member(space_id) and created_by = auth.uid());

create policy "space members update events"
on public.events for update
to authenticated
using (public.is_space_member(space_id))
with check (public.is_space_member(space_id));

create policy "space members delete events"
on public.events for delete
to authenticated
using (public.is_space_member(space_id));

create policy "space members read photos"
on public.photos for select
to authenticated
using (public.is_space_member(space_id));

create policy "space members create photos"
on public.photos for insert
to authenticated
with check (public.is_space_member(space_id) and created_by = auth.uid());

create policy "space members update photos"
on public.photos for update
to authenticated
using (public.is_space_member(space_id))
with check (public.is_space_member(space_id));

create policy "space members delete photos"
on public.photos for delete
to authenticated
using (public.is_space_member(space_id));

create policy "space members read comments"
on public.comments for select
to authenticated
using (public.is_space_member(space_id));

create policy "space members create comments"
on public.comments for insert
to authenticated
with check (public.is_space_member(space_id) and author_id = auth.uid());

create policy "space members update comments"
on public.comments for update
to authenticated
using (public.is_space_member(space_id))
with check (public.is_space_member(space_id));

create policy "space members delete comments"
on public.comments for delete
to authenticated
using (public.is_space_member(space_id));
