import type {
  Conversation,
  CreateConversationInput,
  CreatePersonInput,
  CreatePersonMemoryInput,
  GenerateDeckInput,
  GenerateDeckResult,
  Person,
  PersonMemory,
  UpdatePersonInput,
  UpdateUserInput,
  User,
} from "./types";

export interface PersonQuery {
  search?: string;
}

export interface ConversationQuery {
  personId?: string;
}

export interface HanaFudaDataSource {
  getProfile(): Promise<User>;
  updateProfile(input: UpdateUserInput): Promise<User>;
  getPersons(query?: PersonQuery): Promise<Person[]>;
  getPerson(personId: string): Promise<Person>;
  createPerson(input: CreatePersonInput): Promise<Person>;
  updatePerson(personId: string, input: UpdatePersonInput): Promise<Person>;
  getConversations(query?: ConversationQuery): Promise<Conversation[]>;
  createConversation(input: CreateConversationInput): Promise<Conversation>;
  generateDeck(input: GenerateDeckInput): Promise<GenerateDeckResult>;
  createPersonMemory(
    personId: string,
    input: CreatePersonMemoryInput,
  ): Promise<PersonMemory>;
}
