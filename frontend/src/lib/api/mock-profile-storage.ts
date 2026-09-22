import type { User } from "./types";

const PROFILE_KEY = "hanafuda:mock:profile:v1";

export function readMockProfile(storage: Pick<Storage, "getItem">, fallback: User): User {
  const raw = storage.getItem(PROFILE_KEY);
  if (!raw) return fallback;

  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return fallback;
    const profile = value as Partial<User>;
    if (
      profile.id !== fallback.id ||
      typeof profile.name !== "string" ||
      typeof profile.status !== "string" ||
      typeof profile.recent !== "string" ||
      typeof profile.updated_at !== "string" ||
      !Array.isArray(profile.interests) ||
      !profile.interests.every((item) => typeof item === "string") ||
      !Array.isArray(profile.avoid_topics) ||
      !profile.avoid_topics.every((item) => typeof item === "string")
    ) return fallback;

    return {
      ...fallback,
      name: profile.name,
      status: profile.status,
      interests: profile.interests,
      recent: profile.recent,
      avoid_topics: profile.avoid_topics,
      updated_at: profile.updated_at,
    };
  } catch {
    return fallback;
  }
}

export function writeMockProfile(storage: Pick<Storage, "setItem">, profile: User): void {
  storage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
