export type EntityId = string;
export type ISODateTime = string;

export type ConversationRating = "good" | "normal" | "poor";

export interface User {
  id: EntityId;
  name: string;
  status: string;
  interests: string[];
  recent: string;
  avoid_topics: string[];
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Person {
  id: EntityId;
  user_id: EntityId;
  name: string;
  relationship: string;
  known_information: string;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Conversation {
  id: EntityId;
  person_id: EntityId | null;
  purpose: string;
  situation: string;
  extra: string;
  rating: ConversationRating | null;
  memo: string | null;
  created_at: ISODateTime;
}

export interface DeckBranch {
  condition: string;
  next: string;
}

export interface DeckCard {
  topic: string;
  starter: string;
  reason: string;
  branches: DeckBranch[];
}

export interface Deck {
  id: EntityId;
  conversation_id: EntityId;
  summary: string;
  cards: DeckCard[];
  created_at: ISODateTime;
}

export interface PersonMemory {
  id: EntityId;
  person_id: EntityId;
  content: string;
  source_conversation_id: EntityId | null;
  confirmed: boolean;
  created_at: ISODateTime;
}

export interface ConversationContext {
  purpose: string;
  situation: string;
  extra: string;
}

export interface GenerateDeckInput {
  user: User;
  person: Person | null;
  context: ConversationContext;
  history: Conversation[];
}

export interface GenerateDeckResult {
  summary: string;
  cards: DeckCard[];
}

export type UpdateUserInput = Partial<
  Pick<User, "name" | "status" | "interests" | "recent" | "avoid_topics">
>;

export type CreatePersonInput = Pick<
  Person,
  "name" | "relationship" | "known_information"
>;

export type UpdatePersonInput = Partial<CreatePersonInput>;

export type CreateConversationInput = Pick<
  Conversation,
  "person_id" | "purpose" | "situation" | "extra" | "rating" | "memo"
>;

export type CreatePersonMemoryInput = Pick<
  PersonMemory,
  "content" | "source_conversation_id" | "confirmed"
>;
