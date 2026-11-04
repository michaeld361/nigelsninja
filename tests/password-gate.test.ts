import assert from "node:assert/strict";
import test from "node:test";
import { loginAllowed, noteLoginFailure, resetLoginLimits } from "../lib/login-limit";
import { hashPassword, passwordsMatch, sameText } from "../lib/password";
import { worthShowing } from "../pipeline/score";

test("a password matches only its own hash", () => {
  const hash = hashPassword("correct horse battery");
  assert.equal(passwordsMatch("correct horse battery", hash), true);
  assert.equal(passwordsMatch("correct horse battery!", hash), false);
  assert.equal(sameText("nj-user", "nj-user"), true);
  assert.equal(sameText("nj-user", "nj-User"), false);
});

test("failed sign-ins lock after five tries", () => {
  resetLoginLimits();
  assert.equal(loginAllowed("gate", 1_000), true);
  for (let i = 0; i < 5; i += 1) noteLoginFailure("gate", 1_000);
  assert.equal(loginAllowed("gate", 1_000), false);
  assert.equal(loginAllowed("gate", 1_000 + 15 * 60 * 1000), true);
  resetLoginLimits();
});

test("a role below the line is not shown", () => {
  assert.equal(worthShowing({ score: 70, blockers: [] }, 60), true);
  assert.equal(worthShowing({ score: 40, blockers: ["qualified lawyer required"] }, 60), false);
});
