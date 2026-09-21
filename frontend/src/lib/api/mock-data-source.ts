import { ApiError } from "./errors";
import {
  mockConversations,
  mockPersonMemories,
  mockPersons,
  mockUser,
} from "./mock-data";
import type {
  Conversation,
  GenerateDeckResult,
  Person,
  PersonMemory,
} from "./types";
import type { HanaFudaDataSource } from "./data-source";

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function createMockDataSource(): HanaFudaDataSource {
  let user = clone(mockUser);
  const persons = clone(mockPersons);
  const conversations = clone(mockConversations);
  const memories = clone(mockPersonMemories);

  return {
    async getProfile() {
      return clone(user);
    },

    async updateProfile(input) {
      user = { ...user, ...input, updated_at: new Date().toISOString() };
      return clone(user);
    },

    async getPersons(query) {
      const search = query?.search?.trim().toLocaleLowerCase("ja") ?? "";
      const result = search
        ? persons.filter((person) =>
            [person.name, person.relationship, person.known_information].some(
              (value) => value.toLocaleLowerCase("ja").includes(search),
            ),
          )
        : persons;
      return clone(result);
    },

    async getPerson(personId) {
      const person = persons.find((candidate) => candidate.id === personId);
      if (!person) {
        throw new ApiError("対象が見つかりません。", {
          kind: "not_found",
          status: 404,
        });
      }
      return clone(person);
    },

    async createPerson(input) {
      const now = new Date().toISOString();
      const person: Person = {
        ...input,
        id: crypto.randomUUID(),
        user_id: user.id,
        created_at: now,
        updated_at: now,
      };
      persons.unshift(person);
      return clone(person);
    },

    async updatePerson(personId, input) {
      const index = persons.findIndex((person) => person.id === personId);
      if (index < 0) {
        throw new ApiError("対象が見つかりません。", {
          kind: "not_found",
          status: 404,
        });
      }
      persons[index] = {
        ...persons[index],
        ...input,
        updated_at: new Date().toISOString(),
      };
      return clone(persons[index]);
    },

    async getConversations(query) {
      const result = query?.personId
        ? conversations.filter(
            (conversation) => conversation.person_id === query.personId,
          )
        : conversations;
      return clone(result);
    },

    async createConversation(input) {
      const conversation: Conversation = {
        ...input,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };
      conversations.unshift(conversation);
      return clone(conversation);
    },

    async generateDeck(input) {
      const personName = input.person?.name ?? "相手";
      const result: GenerateDeckResult = {
        summary: `${personName}との会話では、今いる場所から自然に話を始めましょう。`,
        cards: [
          {
            topic: "今の状況",
            starter: "今日はどんなきっかけで来たんですか？",
            reason: "その場に共通する話題は、自然に始めやすいためです。",
            branches: [
              {
                condition: "具体的な目的を話してくれた",
                next: "それに興味を持ったきっかけは何ですか？",
              },
            ],
          },
          {
            topic: "最近の出来事",
            starter: "最近、何か面白かったことはありますか？",
            reason: "相手が話しやすい近況から興味を見つけられるためです。",
            branches: [
              {
                condition: "趣味の話が出た",
                next: "どんなところが一番好きですか？",
              },
            ],
          },
          {
            topic: "次にやりたいこと",
            starter: "このあと挑戦してみたいことってありますか？",
            reason: "未来の話は会話を前向きに広げやすいためです。",
            branches: [
              {
                condition: "やりたいことがある",
                next: "最初に何から始めたいですか？",
              },
            ],
          },
        ],
      };
      return clone(result);
    },

    async getPersonMemories(personId) {
      if (!persons.some((person) => person.id === personId)) {
        throw new ApiError("対象が見つかりません。", {
          kind: "not_found",
          status: 404,
        });
      }
      return clone(memories.filter((memory) => memory.person_id === personId));
    },

    async createPersonMemory(personId, input) {
      if (!persons.some((person) => person.id === personId)) {
        throw new ApiError("対象が見つかりません。", {
          kind: "not_found",
          status: 404,
        });
      }
      const memory: PersonMemory = {
        ...input,
        id: crypto.randomUUID(),
        person_id: personId,
        created_at: new Date().toISOString(),
      };
      memories.unshift(memory);
      return clone(memory);
    },
  };
}
