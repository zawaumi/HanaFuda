-- B7.S security migration for environments where 0001 is already applied.
-- The backend uses the server-only Supabase key and therefore bypasses RLS for
-- its controlled API operations. Direct client access remains user-scoped.

alter table public.users enable row level security;
alter table public.persons enable row level security;
alter table public.conversations enable row level security;
alter table public.decks enable row level security;
alter table public.person_memories enable row level security;

drop policy if exists users_own_data on public.users;
create policy users_own_data on public.users
for all to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists persons_own_data on public.persons;
create policy persons_own_data on public.persons
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists conversations_own_data on public.conversations;
create policy conversations_own_data on public.conversations
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists memories_own_data on public.person_memories;
create policy memories_own_data on public.person_memories
for all to authenticated
using (
    exists (select 1 from public.persons p where p.id = person_id and p.user_id = auth.uid())
)
with check (
    exists (select 1 from public.persons p where p.id = person_id and p.user_id = auth.uid())
);

drop policy if exists decks_own_data on public.decks;
create policy decks_own_data on public.decks
for all to authenticated
using (
    exists (
        select 1 from public.conversations c
        where c.id = conversation_id and c.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1 from public.conversations c
        where c.id = conversation_id and c.user_id = auth.uid()
    )
);
