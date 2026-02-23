import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { Pool } from "pg";

let _auth: ReturnType<typeof betterAuth> | null = null;

export function getAuth() {
  if (_auth) return _auth;

  const baseURL = process.env.BETTER_AUTH_URL;
  const connectionString = process.env.DATABASE_URL;

  if (!baseURL) {
    throw new Error("BETTER_AUTH_URL is required");
  }

  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString });

  _auth = betterAuth({
    baseURL,
    emailAndPassword: {
      enabled: true,
    },
    database: pool,
    plugins: [
      username(),
      // MUST be last per docs
      nextCookies(),
    ],
  });

  return _auth;
}
