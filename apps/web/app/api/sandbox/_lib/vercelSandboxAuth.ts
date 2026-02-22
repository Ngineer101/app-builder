export type SandboxAuth = {
  teamId?: string;
  projectId?: string;
  token?: string;
};

/**
 * Vercel Sandbox SDK auth resolution:
 * - On Vercel, OIDC is usually automatic.
 * - For non-Vercel environments or if OIDC isn't available, you can provide an access token.
 *
 * Env vars follow the @vercel/sandbox README:
 * - VERCEL_TEAM_ID
 * - VERCEL_PROJECT_ID
 * - VERCEL_TOKEN
 */
export function getSandboxAuth(): SandboxAuth {
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const token = process.env.VERCEL_TOKEN;

  // only return access-token auth if it's complete
  if (teamId && projectId && token) return { teamId, projectId, token };
  return {};
}
