-- Migration: create chat_messages table for direct web chat with global_admin
create table if not exists chat_messages (
  id          bigserial primary key,
  room        text not null,                  -- room = username (or 'guest:<uuid>' for unauthenticated)
  sender      text not null,                  -- display name or username
  sender_role text not null default 'guest',  -- 'guest' | 'user' | 'admin' | 'global_admin'
  message     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists chat_messages_room_idx on chat_messages(room);
create index if not exists chat_messages_created_idx on chat_messages(created_at desc);

-- Optional: enable Row Level Security (adjust to your Supabase policy)
-- alter table chat_messages enable row level security;
