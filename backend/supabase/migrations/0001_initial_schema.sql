-- HanaFuda MVP schema.
-- Apply this file in Supabase Dashboard > SQL Editor, or through the Supabase CLI.

create extension if not exists pgcrypto;

create table if not exists public.users (
    id uuid primary key default gen_random_uuid(),
    name text not null default '',
    status text not null default '',
    interests text[] not null default '{}',
    recent text not null default '',
    avoid_topics text[] not null default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.persons (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    name text not null,
    relationship text not null default '',
    known_information text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists persons_user_id_idx on public.persons(user_id);

create table if not exists public.conversations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    person_id uuid references public.persons(id) on delete set null,
    purpose text not null,
    situation text not null,
    extra text not null default '',
    rating text check (rating in ('good', 'normal', 'poor')),
    memo text,
    created_at timestamptz not null default now()
);

create index if not exists conversations_user_id_idx on public.conversations(user_id);
create index if not exists conversations_person_id_idx on public.conversations(person_id);

create table if not exists public.decks (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    summary text not null,
    cards jsonb not null,
    created_at timestamptz not null default now()
);

create table if not exists public.person_memories (
    id uuid primary key default gen_random_uuid(),
    person_id uuid not null references public.persons(id) on delete cascade,
    content text not null,
    source_conversation_id uuid references public.conversations(id) on delete set null,
    confirmed boolean not null default true,
    created_at timestamptz not null default now()
);

create index if not exists person_memories_person_id_idx on public.person_memories(person_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists persons_set_updated_at on public.persons;
create trigger persons_set_updated_at
before update on public.persons
for each row execute function public.set_updated_at();

alter table public.conversations
    drop constraint if exists conversations_person_belongs_to_user;
create unique index if not exists persons_id_user_id_unique
    on public.persons (id, user_id);
alter table public.conversations
    add constraint conversations_person_belongs_to_user
    foreign key (person_id, user_id)
    references public.persons (id, user_id);

alter table public.persons
    add constraint persons_name_not_blank check (length(trim(name)) > 0);
alter table public.conversations
    add constraint conversations_purpose_not_blank check (length(trim(purpose)) > 0);
alter table public.conversations
    add constraint conversations_situation_not_blank check (length(trim(situation)) > 0);
