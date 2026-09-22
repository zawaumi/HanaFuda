import assert from "node:assert/strict";
import { test } from "node:test";
import { readMockProfile, writeMockProfile } from "../src/lib/api/mock-profile-storage.ts";

const fallback = {
  id: "user-demo",
  name: "デモユーザー",
  status: "学生",
  interests: ["ものづくり"],
  recent: "",
  avoid_topics: [],
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

test("saved interests survive a storage read", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  writeMockProfile(storage, { ...fallback, interests: ["音楽", "旅行"] });
  assert.deepEqual(readMockProfile(storage, fallback).interests, ["音楽", "旅行"]);
});

test("invalid saved data falls back to seed profile", () => {
  const storage = { getItem: () => "{invalid" };
  assert.equal(readMockProfile(storage, fallback), fallback);
});
