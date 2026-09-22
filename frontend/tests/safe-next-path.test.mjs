import assert from "node:assert/strict";
import { test } from "node:test";
import { safeNextPath } from "../src/lib/safe-next-path.ts";

test("same-origin paths pass through", () => {
  assert.equal(safeNextPath("/connections"), "/connections");
  assert.equal(safeNextPath("/deck/session?id=1"), "/deck/session?id=1");
});

test("values that resolve to another origin are rejected", () => {
  for (const value of ["//evil.example", "//evil.example/path", "/\\evil.example", "https://evil.example"]) {
    assert.equal(safeNextPath(value), "/", `${value} must not pass`);
    assert.equal(new URL(safeNextPath(value), "https://app.example").origin, "https://app.example");
  }
});

test("missing values fall back to the home page", () => {
  assert.equal(safeNextPath(null), "/");
  assert.equal(safeNextPath(undefined), "/");
  assert.equal(safeNextPath(""), "/");
  assert.equal(safeNextPath("connections"), "/");
});
