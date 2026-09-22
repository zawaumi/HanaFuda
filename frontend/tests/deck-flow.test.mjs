import assert from "node:assert/strict";
import { test } from "node:test";
import { loadDeckContextForPerson, saveDeckDraft } from "../src/lib/deck-flow.ts";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("generation failure can restore the same person's inputs", () => {
  globalThis.sessionStorage = createStorage();
  const context = { purpose: "近況を聞く", situation: "駅前", extra: "仕事の話は避ける" };
  saveDeckDraft({ user: {}, person: { id: "person-1" }, context, history: [] });
  assert.deepEqual(loadDeckContextForPerson("person-1"), context);
  assert.equal(loadDeckContextForPerson("person-2"), null);
});
