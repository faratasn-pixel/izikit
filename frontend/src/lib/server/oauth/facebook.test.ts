// Companion unit test for `oauth/facebook.ts`, mirroring `google.test.ts`.
//
// Asserts:
//   1. tryCreateFacebookProvider() returns undefined when any FACEBOOK_* env
//      var is missing (route-level OAuth handlers 404 silently in this state).
//   2. tryCreateFacebookProvider() returns a provider handle when all three
//      FACEBOOK_CLIENT_ID / FACEBOOK_CLIENT_SECRET / FACEBOOK_REDIRECT_URI
//      are set.
//   3. fetchFacebookProfile() sends the access token as a query param and
//      returns the parsed Graph API profile.
//   4. fetchFacebookProfile() throws on a non-2xx Graph API response.
//
// NOTE: the "no email" refusal lives in the OAuth callback route handler
// (not in this lib) — mirrors how google.test.ts documents the
// email_verified refusal living in the route.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tryCreateFacebookProvider, fetchFacebookProfile } from './facebook';

const ORIG = {
  id: process.env.FACEBOOK_CLIENT_ID,
  secret: process.env.FACEBOOK_CLIENT_SECRET,
  redirect: process.env.FACEBOOK_REDIRECT_URI,
};

beforeEach(() => {
  // Silence the logger.warn the lib emits in the inert path so test output
  // stays readable.
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  process.env.FACEBOOK_CLIENT_ID = ORIG.id;
  process.env.FACEBOOK_CLIENT_SECRET = ORIG.secret;
  process.env.FACEBOOK_REDIRECT_URI = ORIG.redirect;
  vi.restoreAllMocks();
});

describe('tryCreateFacebookProvider', () => {
  it('returns undefined when FACEBOOK_CLIENT_ID is missing', () => {
    delete process.env.FACEBOOK_CLIENT_ID;
    process.env.FACEBOOK_CLIENT_SECRET = 'secret';
    process.env.FACEBOOK_REDIRECT_URI = 'https://example.com/cb';
    expect(tryCreateFacebookProvider()).toBeUndefined();
  });

  it('returns undefined when FACEBOOK_CLIENT_SECRET is missing', () => {
    process.env.FACEBOOK_CLIENT_ID = 'id';
    delete process.env.FACEBOOK_CLIENT_SECRET;
    process.env.FACEBOOK_REDIRECT_URI = 'https://example.com/cb';
    expect(tryCreateFacebookProvider()).toBeUndefined();
  });

  it('returns undefined when FACEBOOK_REDIRECT_URI is missing', () => {
    process.env.FACEBOOK_CLIENT_ID = 'id';
    process.env.FACEBOOK_CLIENT_SECRET = 'secret';
    delete process.env.FACEBOOK_REDIRECT_URI;
    expect(tryCreateFacebookProvider()).toBeUndefined();
  });

  it('returns a handle with `client`, `scopes`, and `redirectUri` when all envs set', () => {
    process.env.FACEBOOK_CLIENT_ID = 'test-app-id';
    process.env.FACEBOOK_CLIENT_SECRET = 'test-app-secret';
    process.env.FACEBOOK_REDIRECT_URI = 'https://app.example.com/api/auth/oauth/facebook/callback';

    const handle = tryCreateFacebookProvider();

    expect(handle).toBeDefined();
    expect(handle?.redirectUri).toBe('https://app.example.com/api/auth/oauth/facebook/callback');
    expect(handle?.scopes).toEqual(['email', 'public_profile']);
    expect(handle?.client).toBeDefined();
  });
});

describe('fetchFacebookProfile', () => {
  it('requests the Graph API with fields + access_token query params', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: '123', name: 'Alice', email: 'alice@example.com' }), {
        status: 200,
      }),
    );

    await fetchFacebookProfile('test-access-token');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url] = fetchSpy.mock.calls[0]!;
    const parsed = new URL(url as string);
    expect(parsed.origin + parsed.pathname).toBe('https://graph.facebook.com/me');
    expect(parsed.searchParams.get('fields')).toBe('id,name,email,picture');
    expect(parsed.searchParams.get('access_token')).toBe('test-access-token');
  });

  it('returns the parsed profile on a 2xx response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: '123',
          name: 'Alice',
          email: 'alice@example.com',
          picture: { data: { url: 'https://example.com/pic.jpg' } },
        }),
        { status: 200 },
      ),
    );

    const profile = await fetchFacebookProfile('test-access-token');

    expect(profile.id).toBe('123');
    expect(profile.name).toBe('Alice');
    expect(profile.email).toBe('alice@example.com');
    expect(profile.picture?.data?.url).toBe('https://example.com/pic.jpg');
  });

  it('returns a profile with no email when Facebook omits it (unverified/withheld permission)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: '123', name: 'Bob' }), { status: 200 }),
    );

    const profile = await fetchFacebookProfile('test-access-token');

    expect(profile.email).toBeUndefined();
  });

  it('throws on a non-2xx Graph API response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Bad Request', { status: 400 }));

    await expect(fetchFacebookProfile('bad-token')).rejects.toThrow(
      /Facebook Graph API returned 400/,
    );
  });
});
