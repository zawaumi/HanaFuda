import type {
  Conversation,
  Person,
  PersonMemory,
  User,
} from "./types";

export const mockUser: User = {
  id: "user-demo",
  name: "デモユーザー",
  status: "学生",
  interests: ["ものづくり", "音楽", "旅行"],
  recent: "新しいプロジェクトに参加した",
  avoid_topics: ["個人情報"],
  created_at: "2026-09-01T09:00:00+09:00",
  updated_at: "2026-09-20T09:00:00+09:00",
};

export const mockPersons: Person[] = [
  {
    id: "person-1",
    user_id: mockUser.id,
    name: "佐藤さん",
    relationship: "大学のゼミ仲間",
    known_information: "音楽が好き。最近ライブへ行った。",
    created_at: "2026-09-10T10:00:00+09:00",
    updated_at: "2026-09-18T18:30:00+09:00",
  },
  {
    id: "person-2",
    user_id: mockUser.id,
    name: "田中さん",
    relationship: "ハッカソンで会った人",
    known_information: "Web開発を勉強している。",
    created_at: "2026-09-15T13:00:00+09:00",
    updated_at: "2026-09-15T13:00:00+09:00",
  },
];

export const mockConversations: Conversation[] = [
  {
    id: "conversation-1",
    person_id: "person-1",
    purpose: "近況を聞く",
    situation: "授業の前に会う",
    extra: "短い時間で話す",
    rating: "good",
    memo: "次におすすめの曲を聞く",
    created_at: "2026-09-18T18:00:00+09:00",
  },
];

export const mockPersonMemories: PersonMemory[] = [
  {
    id: "memory-1",
    person_id: "person-1",
    content: "最近ライブへ行った",
    source_conversation_id: "conversation-1",
    confirmed: true,
    created_at: "2026-09-18T18:10:00+09:00",
  },
];
