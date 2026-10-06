import assert from "node:assert/strict";
import { once } from "node:events";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  createAuthServer,
  hashPassword,
  normalizeCredentials,
  verifyPassword,
} from "./server.js";

const FRONTEND_ORIGIN = "http://localhost:5173";
const PASSWORD = "safe-test-password-2026";

function createCollection() {
  const documents = [];
  return {
    documents,
    async createIndex() {},
    async insertOne(document) {
      if ("email" in document) {
        const existingUser = documents.find(
          (saved) =>
            saved.email === document.email ||
            saved.usernameNormalized === document.usernameNormalized,
        );
        if (existingUser) {
          const error = new Error("Duplicate key");
          error.code = 11000;
          error.keyPattern =
            existingUser.email === document.email
              ? { email: 1 }
              : { usernameNormalized: 1 };
          throw error;
        }
      }
      const _id = String(documents.length + 1);
      documents.push({ ...document, _id });
      return { insertedId: _id };
    },
    async findOne(query) {
      return (
        documents.find((document) => {
          if ("tokenHash" in query) {
            return (
              document.tokenHash === query.tokenHash &&
              document.expiresAt > query.expiresAt.$gt
            );
          }
          if ("_id" in query) return document._id === query._id;
          return (
            document.usernameNormalized === query.usernameNormalized &&
            document.email === query.email
          );
        }) ?? null
      );
    },
    async deleteOne(query) {
      const index = documents.findIndex((document) =>
        "_id" in query
          ? document._id === query._id
          : document.tokenHash === query.tokenHash,
      );
      if (index >= 0) documents.splice(index, 1);
      return { deletedCount: index >= 0 ? 1 : 0 };
    },
  };
}

describe("MongoDB authentication API", () => {
  let users;
  let sessions;
  let server;
  let baseUrl;

  beforeEach(async () => {
    users = createCollection();
    sessions = createCollection();
    server = createAuthServer({
      users,
      sessions,
      allowedOrigins: new Set([FRONTEND_ORIGIN]),
      secureCookies: false,
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterEach(async () => {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  async function post(path, body, origin = FRONTEND_ORIGIN) {
    return fetch(`${baseUrl}/api/auth/${path}`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("stores a salted password hash and creates an authenticated session on sign-up", async () => {
    const response = await post("signup", {
      username: "test_operator",
      email: "operator@example.com",
      password: PASSWORD,
      role: "Tooling Engineer",
      rememberSession: true,
    });
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(payload.user, {
      id: "1",
      username: "test_operator",
      email: "operator@example.com",
      role: "Tooling Engineer",
    });
    assert.equal(users.documents.length, 1);
    assert.notEqual(users.documents[0].passwordHash, PASSWORD);
    assert.equal(users.documents[0].passwordSalt.length, 32);
    assert.match(response.headers.get("set-cookie"), /HttpOnly/);
    assert.equal(sessions.documents.length, 1);
  });

  it("authenticates only when username, email, and password match an existing account", async () => {
    await post("signup", {
      username: "test_operator",
      email: "operator@example.com",
      password: PASSWORD,
    });

    const wrongEmail = await post("signin", {
      username: "test_operator",
      email: "other@example.com",
      password: PASSWORD,
    });
    const wrongPassword = await post("signin", {
      username: "test_operator",
      email: "operator@example.com",
      password: "not-the-password",
    });
    const validSignIn = await post("signin", {
      username: "test_operator",
      email: "operator@example.com",
      password: PASSWORD,
    });

    assert.equal(wrongEmail.status, 401);
    assert.equal(wrongPassword.status, 401);
    assert.equal(validSignIn.status, 200);
    assert.equal((await validSignIn.json()).user.email, "operator@example.com");
    assert.equal(users.documents.length, 1);
  });

  it("rejects duplicate email and username registrations", async () => {
    const account = {
      username: "test_operator",
      email: "operator@example.com",
      password: PASSWORD,
    };
    assert.equal((await post("signup", account)).status, 200);
    assert.equal(
      (await post("signup", { ...account, username: "another_operator" }))
        .status,
      409,
    );
    assert.equal(
      (
        await post("signup", {
          ...account,
          username: "test_operator",
          email: "another@example.com",
        })
      ).status,
      409,
    );
  });

  it("restores and revokes an authenticated session", async () => {
    const signUpResponse = await post("signup", {
      username: "test_operator",
      email: "operator@example.com",
      password: PASSWORD,
    });
    const cookie = signUpResponse.headers.get("set-cookie").split(";")[0];
    const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { Origin: FRONTEND_ORIGIN, Cookie: cookie },
    });
    assert.equal((await sessionResponse.json()).user.username, "test_operator");

    const signOutResponse = await fetch(`${baseUrl}/api/auth/signout`, {
      method: "POST",
      headers: { Origin: FRONTEND_ORIGIN, Cookie: cookie },
    });
    assert.equal(signOutResponse.status, 200);
    assert.equal(sessions.documents.length, 0);
    const clearedSession = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { Origin: FRONTEND_ORIGIN, Cookie: cookie },
    });
    assert.equal((await clearedSession.json()).user, null);
  });

  it("rejects browser requests from an unconfigured origin", async () => {
    const response = await post(
      "signup",
      {
        username: "test_operator",
        email: "operator@example.com",
        password: PASSWORD,
      },
      "https://untrusted.example",
    );
    assert.equal(response.status, 403);
    assert.equal(users.documents.length, 0);
  });

  it("rejects malformed and oversized request bodies", async () => {
    const malformed = await fetch(`${baseUrl}/api/auth/signup`, {
      method: "POST",
      headers: { Origin: FRONTEND_ORIGIN, "Content-Type": "application/json" },
      body: "{",
    });
    const oversized = await post("signup", "x".repeat(17_000));

    assert.equal(malformed.status, 400);
    assert.equal(oversized.status, 413);
    assert.equal(users.documents.length, 0);
  });
});

describe("authentication credential validation", () => {
  it("requires a valid email, bounded username, and at least eight password characters", () => {
    assert.equal(
      normalizeCredentials({ username: "xy", email: "bad", password: "short" })
        .error != null,
      true,
    );
    assert.equal(
      normalizeCredentials({
        username: "valid_user",
        email: "user@example.com",
        password: PASSWORD,
      }).error,
      undefined,
    );
  });

  it("stores passwords as salted hashes and verifies them", async () => {
    const hash = await hashPassword(PASSWORD);
    assert.equal(
      await verifyPassword(PASSWORD, hash.passwordHash, hash.passwordSalt),
      true,
    );
    assert.equal(
      await verifyPassword(
        "incorrect-password",
        hash.passwordHash,
        hash.passwordSalt,
      ),
      false,
    );
  });
});
