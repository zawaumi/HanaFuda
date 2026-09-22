-- B7.S performance indexes for the API's user-scoped list queries.
-- Keep this migration separate from 0001 because 0001 may already be applied.

create index if not exists persons_user_updated_at_idx
    on public.persons (user_id, updated_at desc);

create index if not exists conversations_user_person_created_at_idx
    on public.conversations (user_id, person_id, created_at desc);

create index if not exists person_memories_person_created_at_idx
    on public.person_memories (person_id, created_at desc);

create index if not exists decks_conversation_created_at_idx
    on public.decks (conversation_id, created_at desc);
