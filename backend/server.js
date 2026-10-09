import "dotenv/config";

import { createServer } from "node:http";
import { promisify } from "node:util";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { MongoClient } from "mongodb";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const scryptAsync = promisify(scrypt);
const COOKIE_NAME = "edgewear_session";
const SESSION_LENGTH_MS = 24 * 60 * 60 * 1000;
const REMEMBERED_SESSION_LENGTH_MS = 30 * 24 * 60 * 60 * 1000;
const SCRYPT_OPTIONS = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const PASSWORD_LENGTH = 64;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_PROFILE_PHOTO_BYTES = 1024 * 1024;
const MAX_REQUEST_BODY_TIME_MS = 15_000;
const ROLES = new Set([
  "Lead CNC Machinist",
  "Tooling Engineer",
  "Shop Floor Supervisor",
  "Maintenance Technician",
  "Quality Assurance Specialist",
]);

class RequestValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function normalizeCredentials(body) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { error: "Enter your username, email address, and password." };
  }

  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const rememberSession = body.rememberSession === true;

  if (username.length < 3 || username.length > 40) {
    return { error: "Username must be between 3 and 40 characters." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { error: "Please enter a valid email address." };
  }
  if (password.length < 8 || password.length > 256) {
    return { error: "Password must be between 8 and 256 characters." };
  }

  return { username, email, password, rememberSession };
}

export async function hashPassword(password, salt = randomBytes(16)) {
  const derived = await scryptAsync(
    password,
    salt,
    PASSWORD_LENGTH,
    SCRYPT_OPTIONS,
  );
  return {
    passwordHash: derived.toString("hex"),
    passwordSalt: salt.toString("hex"),
  };
}

export async function verifyPassword(password, passwordHash, passwordSalt) {
  if (
    !/^[\da-f]{128}$/i.test(passwordHash) ||
    !/^[\da-f]{32}$/i.test(passwordSalt)
  ) {
    return false;
  }
  const actual = Buffer.from(
    (await hashPassword(password, Buffer.from(passwordSalt, "hex")))
      .passwordHash,
    "hex",
  );
  const expected = Buffer.from(passwordHash, "hex");
  return timingSafeEqual(actual, expected);
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

function profileFor(user) {
  return {
    id: String(user._id),
    username: user.username,
    email: user.email,
    role: user.role,
    ...(typeof user.profilePhoto === "string"
      ? { profilePhoto: user.profilePhoto }
      : {}),
  };
}

function validateProfilePhoto(photo) {
  if (photo === null) return null;
  if (typeof photo !== "string") {
    throw new RequestValidationError("Choose a valid profile photo.");
  }

  const match =
    /^data:image\/(png|jpeg|webp);base64,([A-Za-z\d+/]+={0,2})$/.exec(photo);
  if (!match) {
    throw new RequestValidationError(
      "Profile photos must be PNG, JPEG, or WebP images.",
    );
  }
  const encodedImage = match[2];
  const padding = encodedImage.endsWith("==")
    ? 2
    : encodedImage.endsWith("=")
      ? 1
      : 0;
  const imageBytes = Math.floor((encodedImage.length * 3) / 4) - padding;
  if (imageBytes < 1 || imageBytes > MAX_PROFILE_PHOTO_BYTES) {
    throw new RequestValidationError(
      "Profile photos must be smaller than 1 MB.",
    );
  }
  return photo;
}

function cookieHeader(
  token,
  { secureCookies, rememberSession, clear = false },
) {
  const parts = [
    `${COOKIE_NAME}=${clear ? "" : token}`,
    "Path=/",
    "HttpOnly",
    secureCookies ? "Secure" : "",
    secureCookies ? "SameSite=None" : "SameSite=Lax",
  ].filter(Boolean);

  if (clear) {
    parts.push("Max-Age=0", "Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  } else if (rememberSession) {
    parts.push(`Max-Age=${Math.floor(REMEMBERED_SESSION_LENGTH_MS / 1000)}`);
  }

  return parts.join("; ");
}

function sessionToken(request) {
  const cookieHeaderValue = request.headers.cookie ?? "";
  const cookie = cookieHeaderValue
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  const token = cookie?.slice(COOKIE_NAME.length + 1);
  return token && /^[\da-f]{64}$/i.test(token) ? token : null;
}

function allowedOrigin(origin, allowedOrigins) {
  if (allowedOrigins.has(origin)) return true;
  if (process.env.NODE_ENV === "production") return false;

  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function sendJson(response, status, value, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  if (
    !request.headers["content-type"]
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    throw new RequestValidationError("Send authentication details as JSON.");
  }

  const chunks = [];
  let length = 0;
  let oversized = false;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > MAX_BODY_BYTES) {
      oversized = true;
    } else {
      chunks.push(chunk);
    }
  }
  if (oversized) {
    throw new RequestValidationError("Request body is too large.", 413);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestValidationError("Request body must contain valid JSON.");
  }
}

export function createAuthServer({
  users,
  sessions,
  allowedOrigins = new Set(),
  secureCookies = process.env.NODE_ENV === "production",
}) {
  return createServer(async (request, response) => {
    const origin = request.headers.origin;
    if (origin && !allowedOrigin(origin, allowedOrigins)) {
      sendJson(response, 403, {
        error: "This website is not allowed to use the authentication service.",
      });
      return;
    }

    const corsHeaders = origin
      ? {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
          Vary: "Origin",
        }
      : {};
    if (request.method === "OPTIONS") {
      response.writeHead(204, corsHeaders);
      response.end();
      return;
    }

    const url = new URL(request.url ?? "/", "http://localhost");
    try {
      if (request.method === "GET" && url.pathname === "/health") {
        sendJson(response, 200, { ok: true }, corsHeaders);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/auth/session") {
        const token = sessionToken(request);
        if (!token) {
          sendJson(response, 200, { user: null }, corsHeaders);
          return;
        }

        const session = await sessions.findOne({
          tokenHash: tokenHash(token),
          expiresAt: { $gt: new Date() },
        });
        if (!session) {
          sendJson(
            response,
            200,
            { user: null },
            {
              ...corsHeaders,
              "Set-Cookie": cookieHeader("", { secureCookies, clear: true }),
            },
          );
          return;
        }

        const user = await users.findOne({ _id: session.userId });
        if (!user) {
          await sessions.deleteOne({ _id: session._id });
          sendJson(
            response,
            200,
            { user: null },
            {
              ...corsHeaders,
              "Set-Cookie": cookieHeader("", { secureCookies, clear: true }),
            },
          );
          return;
        }

        sendJson(response, 200, { user: profileFor(user) }, corsHeaders);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/auth/signout") {
        const token = sessionToken(request);
        if (token) await sessions.deleteOne({ tokenHash: tokenHash(token) });
        sendJson(
          response,
          200,
          { success: true },
          {
            ...corsHeaders,
            "Set-Cookie": cookieHeader("", { secureCookies, clear: true }),
          },
        );
        return;
      }

      if (request.method === "PATCH" && url.pathname === "/api/auth/profile") {
        const token = sessionToken(request);
        if (!token) {
          sendJson(
            response,
            401,
            { error: "Sign in to update your profile." },
            corsHeaders,
          );
          return;
        }
        const session = await sessions.findOne({
          tokenHash: tokenHash(token),
          expiresAt: { $gt: new Date() },
        });
        if (!session) {
          sendJson(
            response,
            401,
            { error: "Your session has expired. Please sign in again." },
            corsHeaders,
          );
          return;
        }

        const body = await readJson(request);
        if (typeof body !== "object" || body === null || Array.isArray(body)) {
          throw new RequestValidationError("Enter valid profile details.");
        }
        const username =
          typeof body.username === "string" ? body.username.trim() : "";
        const email =
          typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const hasProfilePhoto = Object.hasOwn(body, "profilePhoto");
        const profilePhoto = hasProfilePhoto
          ? validateProfilePhoto(body.profilePhoto)
          : undefined;
        if (username.length < 3 || username.length > 40) {
          sendJson(
            response,
            400,
            { error: "Username must be between 3 and 40 characters." },
            corsHeaders,
          );
          return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
          sendJson(
            response,
            400,
            { error: "Please enter a valid email address." },
            corsHeaders,
          );
          return;
        }
        try {
          const updates = {
            username,
            usernameNormalized: username.toLowerCase(),
            email,
            ...(typeof profilePhoto === "string" ? { profilePhoto } : {}),
          };
          const update = {
            $set: updates,
            ...(profilePhoto === null ? { $unset: { profilePhoto: "" } } : {}),
          };
          await users.updateOne({ _id: session.userId }, update);
        } catch (error) {
          if (error?.code === 11000) {
            const field = error.keyPattern?.email ? "email" : "username";
            sendJson(
              response,
              409,
              {
                error:
                  field === "email"
                    ? "That email address is already in use."
                    : "That username is already taken.",
              },
              corsHeaders,
            );
            return;
          }
          throw error;
        }
        const user = await users.findOne({ _id: session.userId });
        if (!user) {
          sendJson(
            response,
            401,
            { error: "Your account could not be found." },
            corsHeaders,
          );
          return;
        }
        sendJson(response, 200, { user: profileFor(user) }, corsHeaders);
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/auth/change-password"
      ) {
        const token = sessionToken(request);
        const activeSession = token
          ? await sessions.findOne({
              tokenHash: tokenHash(token),
              expiresAt: { $gt: new Date() },
            })
          : null;
        if (!activeSession) {
          sendJson(
            response,
            401,
            { error: "Sign in to change your password." },
            corsHeaders,
          );
          return;
        }

        const body = await readJson(request);
        if (typeof body !== "object" || body === null || Array.isArray(body)) {
          throw new RequestValidationError("Enter valid password details.");
        }
        const newPassword =
          typeof body.newPassword === "string" ? body.newPassword : "";
        if (newPassword.length < 8 || newPassword.length > 256) {
          sendJson(
            response,
            400,
            { error: "New password must be between 8 and 256 characters." },
            corsHeaders,
          );
          return;
        }

        const user = await users.findOne({ _id: activeSession.userId });
        if (!user) {
          sendJson(
            response,
            401,
            { error: "Your account could not be found." },
            corsHeaders,
          );
          return;
        }
        if (
          (await verifyPassword(
            newPassword,
            user.passwordHash,
            user.passwordSalt,
          ))
        ) {
          sendJson(
            response,
            400,
            {
              error:
                "Choose a new password different from your existing password.",
            },
            corsHeaders,
          );
          return;
        }

        const passwordFields = await hashPassword(newPassword);
        const updateResult = await users.updateOne(
          { _id: user._id },
          { $set: passwordFields, $unset: { recoveryCodeHash: "" } },
        );
        if (updateResult.modifiedCount !== 1) {
          sendJson(
            response,
            409,
            { error: "Your password could not be updated. Please try again." },
            corsHeaders,
          );
          return;
        }
        await sessions.deleteMany({ userId: user._id });
        sendJson(
          response,
          200,
          { success: true },
          {
            ...corsHeaders,
            "Set-Cookie": cookieHeader("", {
              secureCookies,
              clear: true,
            }),
          },
        );
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/auth/reset-password"
      ) {
        const body = await readJson(request);
        if (typeof body !== "object" || body === null || Array.isArray(body)) {
          throw new RequestValidationError("Enter your account details and a new password.");
        }
        const username =
          typeof body.username === "string" ? body.username.trim() : "";
        const email =
          typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const newPassword =
          typeof body.newPassword === "string" ? body.newPassword : "";
        if (
          username.length < 3 ||
          username.length > 40 ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
          email.length > 254 ||
          newPassword.length < 8 ||
          newPassword.length > 256
        ) {
          throw new RequestValidationError(
            "Enter a valid username and email, and a password between 8 and 256 characters.",
          );
        }

        const user = await users.findOne({
          usernameNormalized: username.toLowerCase(),
          email,
        });
        if (!user) {
          sendJson(
            response,
            401,
            { error: "Username and email do not match an account." },
            corsHeaders,
          );
          return;
        }

        if (
          await verifyPassword(
            newPassword,
            user.passwordHash,
            user.passwordSalt,
          )
        ) {
          sendJson(
            response,
            400,
            { error: "Choose a new password different from your existing password." },
            corsHeaders,
          );
          return;
        }

        const passwordFields = await hashPassword(newPassword);
        const updateResult = await users.updateOne(
          { _id: user._id },
          { $set: passwordFields, $unset: { recoveryCodeHash: "" } },
        );
        if (updateResult.modifiedCount !== 1) {
          sendJson(
            response,
            409,
            { error: "Your password could not be updated. Please try again." },
            corsHeaders,
          );
          return;
        }
        await sessions.deleteMany({ userId: user._id });
        sendJson(
          response,
          200,
          { success: true },
          {
            ...corsHeaders,
            "Set-Cookie": cookieHeader("", { secureCookies, clear: true }),
          },
        );
        return;
      }

      if (
        request.method === "POST" &&
        (url.pathname === "/api/auth/signup" ||
          url.pathname === "/api/auth/signin")
      ) {
        const body = await readJson(request);
        const credentials = normalizeCredentials(body);
        if (credentials.error) {
          sendJson(response, 400, { error: credentials.error }, corsHeaders);
          return;
        }

        const { username, email, password, rememberSession } = credentials;
        let user;
        if (url.pathname.endsWith("/signup")) {
          const requestedRole =
            typeof body.role === "string" ? body.role : "Lead CNC Machinist";
          if (!ROLES.has(requestedRole)) {
            sendJson(
              response,
              400,
              { error: "Choose a valid operator role." },
              corsHeaders,
            );
            return;
          }
          const passwordFields = await hashPassword(password);
          user = {
            username,
            usernameNormalized: username.toLowerCase(),
            email,
            role: requestedRole,
            ...passwordFields,
            createdAt: new Date(),
          };
          try {
            const { insertedId } = await users.insertOne(user);
            user._id = insertedId;
          } catch (error) {
            if (error?.code === 11000) {
              const field = error.keyPattern?.email ? "email" : "username";
              sendJson(
                response,
                409,
                {
                  error:
                    field === "email"
                      ? "An account with this email already exists. Please sign in."
                      : "That username is already taken. Please choose another.",
                },
                corsHeaders,
              );
              return;
            }
            throw error;
          }
        } else {
          user = await users.findOne({
            usernameNormalized: username.toLowerCase(),
            email,
          });
          if (
            !user ||
            !(await verifyPassword(
              password,
              user.passwordHash,
              user.passwordSalt,
            ))
          ) {
            sendJson(
              response,
              401,
              { error: "Username, email, or password is incorrect." },
              corsHeaders,
            );
            return;
          }
        }

        const token = randomBytes(32).toString("hex");
        const now = new Date();
        const expiresAt = new Date(
          now.getTime() +
            (rememberSession
              ? REMEMBERED_SESSION_LENGTH_MS
              : SESSION_LENGTH_MS),
        );
        await sessions.insertOne({
          userId: user._id,
          tokenHash: tokenHash(token),
          createdAt: now,
          expiresAt,
        });
        sendJson(
          response,
          200,
          { user: profileFor(user) },
          {
            ...corsHeaders,
            "Set-Cookie": cookieHeader(token, {
              secureCookies,
              rememberSession,
            }),
          },
        );
        return;
      }

      sendJson(
        response,
        404,
        { error: "Authentication endpoint not found." },
        corsHeaders,
      );
    } catch (error) {
      if (error instanceof RequestValidationError) {
        sendJson(response, error.status, { error: error.message }, corsHeaders);
        return;
      }
      console.error("Authentication API request failed", error);
      sendJson(
        response,
        503,
        {
          error:
            "The authentication database is unavailable. Please try again shortly.",
        },
        corsHeaders,
      );
    }
  });
}

async function start() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is required to start the EdgeWear authentication API.",
    );
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5_000 });
  let users;
  let sessions;
  try {
    await client.connect();
    const database = client.db(process.env.MONGODB_DB || undefined);
    users = database.collection("users");
    sessions = database.collection("sessions");
    await Promise.all([
      users.createIndex({ email: 1 }, { unique: true }),
      users.createIndex({ usernameNormalized: 1 }, { unique: true }),
      sessions.createIndex({ tokenHash: 1 }, { unique: true }),
      sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
  } catch (error) {
    await client.close();
    throw error;
  }

  const allowedOrigins = new Set(
    (process.env.FRONTEND_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
  const server = createAuthServer({
    users,
    sessions,
    allowedOrigins,
  });
  const port = Number(process.env.PORT ?? 3001);
  server.requestTimeout = MAX_REQUEST_BODY_TIME_MS;
  server.headersTimeout = MAX_REQUEST_BODY_TIME_MS + 5_000;
  server.listen(port, "0.0.0.0", () => {
    console.info(`EdgeWear authentication API listening on port ${port}`);
  });

  const shutdown = async () => {
    server.close();
    await client.close();
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  start().catch((error) => {
    console.error("Failed to start the EdgeWear authentication API", error);
    process.exitCode = 1;
  });
}
