import { apiFetch } from "./client";
import type { HanaFudaDataSource } from "./data-source";
import type {
  Conversation,
  GenerateDeckResult,
  Person,
  PersonMemory,
  User,
} from "./types";

export function createRemoteDataSource(): HanaFudaDataSource {
  return {
    getProfile() {
      return apiFetch<User>("/api/profile");
    },

    updateProfile(input) {
      return apiFetch<User>("/api/profile", { method: "PATCH", body: input });
    },

    getPersons(query) {
      const parameters = new URLSearchParams();
      if (query?.search) parameters.set("q", query.search);
      const suffix = parameters.size ? `?${parameters}` : "";
      return apiFetch<Person[]>(`/api/persons${suffix}`);
    },

    getPerson(personId) {
      return apiFetch<Person>(`/api/persons/${encodeURIComponent(personId)}`);
    },

    createPerson(input) {
      return apiFetch<Person>("/api/persons", {
        method: "POST",
        body: input,
      });
    },

    updatePerson(personId, input) {
      return apiFetch<Person>(`/api/persons/${encodeURIComponent(personId)}`, {
        method: "PATCH",
        body: input,
      });
    },

    getConversations(query) {
      const parameters = new URLSearchParams();
      if (query?.personId) parameters.set("person_id", query.personId);
      const suffix = parameters.size ? `?${parameters}` : "";
      return apiFetch<Conversation[]>(`/api/conversations${suffix}`);
    },

    createConversation(input) {
      return apiFetch<Conversation>("/api/conversations", {
        method: "POST",
        body: input,
      });
    },

    generateDeck(input) {
      const confirmedMemories = input.memories.filter((memory) => memory.confirmed);
      return apiFetch<GenerateDeckResult>("/api/deck/generate", {
        method: "POST",
        timeoutMs: 60_000,
        body: {
          user: {
            name: input.user.name,
            status: input.user.status,
            interests: input.user.interests,
            recent: input.user.recent,
            avoid_topics: input.user.avoid_topics,
          },
          person: input.person && {
            id: input.person.id,
            name: input.person.name,
            relationship: input.person.relationship,
            known_information: input.person.known_information,
          },
          context: input.context,
          history: input.history.map((conversation) => ({
            created_at: conversation.created_at,
            purpose: conversation.purpose,
            situation: conversation.situation,
            extra: conversation.extra,
            rating: conversation.rating,
            memo: conversation.memo,
            memories: confirmedMemories
              .filter((memory) => memory.source_conversation_id === conversation.id)
              .map((memory) => ({ content: memory.content, created_at: memory.created_at })),
          })),
        },
      });
    },

    getPersonMemories(personId) {
      return apiFetch<PersonMemory[]>(
        `/api/persons/${encodeURIComponent(personId)}/memories`,
      );
    },

    createPersonMemory(personId, input) {
      return apiFetch<PersonMemory>(
        `/api/persons/${encodeURIComponent(personId)}/memories`,
        { method: "POST", body: input },
      );
    },
  };
}
