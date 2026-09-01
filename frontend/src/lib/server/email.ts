/**
 * Mailer abstraction over Brevo (transactional email REST API).
 *
 * The exported `Mailer` interface keeps the contract narrow so tests can
 * swap in a stub and any future provider (Postmark, SES) can be implemented
 * without touching the call sites in the email queue or auth routes.
 *
 * RFC 2369 List-Unsubscribe support is built in: pass `listUnsubscribe`
 * with a URL or mailto and the headers are added — required for high-volume
 * transactional senders to stay out of spam.
 */
const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

export interface ListUnsubscribe {
  url?: string;
  mailto?: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** RFC 2369 — adds List-Unsubscribe + List-Unsubscribe-Post=One-Click headers. */
  listUnsubscribe?: ListUnsubscribe;
}

export interface Mailer {
  send(input: SendEmailInput): Promise<{ id: string }>;
}

export interface CreateMailerEnv {
  BREVO_API_KEY: string;
  EMAIL_FROM: string;
}

export interface CreateMailerOptions {
  /** Override the underlying fetch implementation (used by tests). */
  fetchImpl?: typeof fetch;
}

/** Parses "Name <email>" or a bare "email" into Brevo's sender shape. */
function parseSender(emailFrom: string): { name?: string; email: string } {
  const match = /^\s*(.+?)\s*<([^>]+)>\s*$/.exec(emailFrom);
  if (match?.[1]) {
    return { name: match[1], email: match[2]! };
  }
  return { email: emailFrom.trim() };
}

interface BrevoSendSuccess {
  messageId?: string;
}

interface BrevoSendError {
  code?: string;
  message?: string;
}

/**
 * Build a Mailer wired to Brevo. Throws synchronously when the API key is
 * missing — fail fast at boot rather than on the first send.
 */
export function createMailer(env: CreateMailerEnv, options: CreateMailerOptions = {}): Mailer {
  if (!env.BREVO_API_KEY) {
    throw new Error('createMailer: BREVO_API_KEY is required');
  }
  if (!env.EMAIL_FROM) {
    throw new Error('createMailer: EMAIL_FROM is required');
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const sender = parseSender(env.EMAIL_FROM);
  const apiKey = env.BREVO_API_KEY;

  return {
    async send(input: SendEmailInput): Promise<{ id: string }> {
      const headers: Record<string, string> = {};

      if (input.listUnsubscribe) {
        const parts: string[] = [];
        if (input.listUnsubscribe.mailto) parts.push(`<mailto:${input.listUnsubscribe.mailto}>`);
        if (input.listUnsubscribe.url) parts.push(`<${input.listUnsubscribe.url}>`);
        if (parts.length > 0) {
          headers['List-Unsubscribe'] = parts.join(', ');
          headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
        }
      }

      const body: {
        sender: { name?: string; email: string };
        to: { email: string }[];
        subject: string;
        htmlContent: string;
        textContent?: string;
        headers?: Record<string, string>;
      } = {
        sender,
        to: [{ email: input.to }],
        subject: input.subject,
        htmlContent: input.html,
      };
      if (input.text !== undefined) body.textContent = input.text;
      if (Object.keys(headers).length > 0) body.headers = headers;

      const res = await fetchImpl(BREVO_SEND_URL, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorBody = (await res.json().catch(() => ({}))) as BrevoSendError;
        throw new Error(`Brevo error: ${errorBody.message ?? res.statusText}`);
      }

      const data = (await res.json()) as BrevoSendSuccess;
      if (!data.messageId) {
        throw new Error('Brevo returned no id');
      }

      return { id: data.messageId };
    },
  };
}
