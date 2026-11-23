import assert from "node:assert/strict";
import test from "node:test";

const { hashPassword, verifyPassword } = await import("../src/lib/password");

test("password hashing verifies the correct password", () => {
  const stored = hashPassword("School@123");
  assert.notEqual(stored, "School@123");
  assert.equal(verifyPassword("School@123", stored), true);
});

test("password verification rejects a wrong password", () => {
  const stored = hashPassword("School@123");
  assert.equal(verifyPassword("school@123", stored), false);
});

test("password hashes are salted", () => {
  const first = hashPassword("same-password");
  const second = hashPassword("same-password");
  assert.notEqual(first, second);
  assert.equal(verifyPassword("same-password", first), true);
  assert.equal(verifyPassword("same-password", second), true);
});

test("verifyPassword rejects malformed stored hashes without throwing", () => {
  assert.equal(verifyPassword("anything", "nosalt"), false);
  assert.equal(verifyPassword("anything", "salt:zz"), false);
  assert.equal(verifyPassword("anything", "salt:abc"), false);
});
