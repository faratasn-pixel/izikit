import { describe, it, expect, vi } from 'vitest';
import { createMailer } from './email';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('createMailer (Brevo)', () => {
  it('throws synchronously when BREVO_API_KEY is missing', () => {
    expect(() => createMailer({ BREVO_API_KEY: '', EMAIL_FROM: 'a@b.com' })).toThrow(
      /BREVO_API_KEY/,
    );
  });

  it('throws synchronously when EMAIL_FROM is missing', () => {
    expect(() => createMailer({ BREVO_API_KEY: 'key', EMAIL_FROM: '' })).toThrow(/EMAIL_FROM/);
  });

  it('sends via the Brevo API and maps messageId to id', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(201, { messageId: 'brevo-msg-1' }));
    const mailer = createMailer(
      { BREVO_API_KEY: 'test-key', EMAIL_FROM: 'Habitat Afrik <no-reply@habitatafrik.com>' },
      { fetchImpl },
    );

    const result = await mailer.send({
      to: 'user@example.com',
      subject: 'Hello',
      html: '<p>hi</p>',
      text: 'hi',
    });

    expect(result).toEqual({ id: 'brevo-msg-1' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      'api-key': 'test-key',
      'content-type': 'application/json',
    });
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      sender: { name: 'Habitat Afrik', email: 'no-reply@habitatafrik.com' },
      to: [{ email: 'user@example.com' }],
      subject: 'Hello',
      htmlContent: '<p>hi</p>',
      textContent: 'hi',
    });
  });

  it('parses a bare EMAIL_FROM address with no display name', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(201, { messageId: 'x' }));
    const mailer = createMailer(
      { BREVO_API_KEY: 'test-key', EMAIL_FROM: 'no-reply@habitatafrik.com' },
      { fetchImpl },
    );

    await mailer.send({ to: 'user@example.com', subject: 'Hi', html: '<p>hi</p>' });

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.sender).toEqual({ email: 'no-reply@habitatafrik.com' });
  });

  it('throws with the Brevo error message on a non-2xx response', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(400, { code: 'invalid_parameter', message: 'Invalid to' }));
    const mailer = createMailer(
      { BREVO_API_KEY: 'test-key', EMAIL_FROM: 'a@b.com' },
      { fetchImpl },
    );

    await expect(mailer.send({ to: 'bad', subject: 'Hi', html: '<p>hi</p>' })).rejects.toThrow(
      /Brevo error: Invalid to/,
    );
  });

  it('throws when a 2xx response is missing messageId', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(201, {}));
    const mailer = createMailer(
      { BREVO_API_KEY: 'test-key', EMAIL_FROM: 'a@b.com' },
      { fetchImpl },
    );

    await expect(
      mailer.send({ to: 'user@example.com', subject: 'Hi', html: '<p>hi</p>' }),
    ).rejects.toThrow(/no id/i);
  });

  it('adds List-Unsubscribe headers when listUnsubscribe is provided', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(201, { messageId: 'x' }));
    const mailer = createMailer(
      { BREVO_API_KEY: 'test-key', EMAIL_FROM: 'a@b.com' },
      { fetchImpl },
    );

    await mailer.send({
      to: 'user@example.com',
      subject: 'Hi',
      html: '<p>hi</p>',
      listUnsubscribe: { url: 'https://example.com/unsub', mailto: 'unsub@example.com' },
    });

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.headers).toEqual({
      'List-Unsubscribe': '<mailto:unsub@example.com>, <https://example.com/unsub>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
  });
});
