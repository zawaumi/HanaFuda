-- Optional local/demo seed. Do not use this file for production user data.
insert into public.users (id, name, status, interests, recent, avoid_topics)
values (
    '00000000-0000-0000-0000-000000000001',
    'デモユーザー',
    '',
    '{}',
    '',
    '{}'
)
on conflict (id) do nothing;
