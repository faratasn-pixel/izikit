/**
 * Facebook OAuth 2.0 client, backed by `arctic`.
 *
 * Unlike Google, Facebook's `arctic` client is not OIDC: `createAuthorizationURL`
 * takes no PKCE code verifier, and `validateAuthorizationCode` returns a plain
 * access token — no ID token to decode. Profile data (id/name/email) is fetched
 * with a follow-up call to the Graph API using that access token.
 *
 * Facebook only returns the `email` field from the Graph API when the user has
 * a confirmed, verified email on file and granted the `email` permission — there
 * is no separate `email_verified` flag to check (unlike Google's OIDC claims),
 * so presence of `email` in the response is treated as verified.
 *
 * Boots conditionally: if FACEBOOK_CLIENT_ID / FACEBOOK_CLIENT_SECRET /
 * FACEBOOK_REDIRECT_URI are absent, `tryCreateFacebookProvider()` returns
 * undefined and the OAuth routes 404 silently — same pattern as Google.
 */
import { Facebook } from 'arctic';
import { createLogger } from '../logger';

const logger = createLogger();

export interface FacebookProviderHandle {
  client: Facebook;
  scopes: readonly string[];
  redirectUri: string;
}

export function tryCreateFacebookProvider(): FacebookProviderHandle | undefined {
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    logger.warn('oauth: Facebook env missing — /api/auth/oauth/facebook/* routes are inert', {
      haveClientId: !!clientId,
      haveClientSecret: !!clientSecret,
      haveRedirectUri: !!redirectUri,
    });
    return undefined;
  }

  return {
    client: new Facebook(clientId, clientSecret, redirectUri),
    scopes: ['email', 'public_profile'],
    redirectUri,
  };
}

export interface FacebookProfile {
  id: string;
  name?: string;
  email?: string;
  picture?: { data?: { url?: string } };
}

/**
 * Fetch the authenticated user's profile from the Graph API using the access
 * token returned by `validateAuthorizationCode`. Throws on a non-2xx response
 * so the callback can map it to a generic OAuth failure.
 */
export async function fetchFacebookProfile(accessToken: string): Promise<FacebookProfile> {
  const url = new URL('https://graph.facebook.com/me');
  url.searchParams.set('fields', 'id,name,email,picture');
  url.searchParams.set('access_token', accessToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Facebook Graph API returned ${res.status}`);
  }
  return (await res.json()) as FacebookProfile;
}
