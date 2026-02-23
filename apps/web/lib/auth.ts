import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";

import { sqliteClient } from "./db";

let _auth: ReturnType<typeof betterAuth> | null = null;

export function getAuth() {
  if (_auth) return _auth;

  const baseURL = process.env.BETTER_AUTH_URL;
  const sqlitePath = process.env.DATABASE_PATH;

  if (!baseURL) {
    throw new Error("BETTER_AUTH_URL is required");
  }

  if (!sqlitePath) {
    throw new Error("DATABASE_PATH is required");
  }

  _auth = betterAuth({
    baseURL,
    emailAndPassword: {
      enabled: true,
    },
    database: sqliteClient(),
    plugins: [
      username(),
      // MUST be last per docs
      nextCookies(),
    ],
  });

  return _auth;
}
