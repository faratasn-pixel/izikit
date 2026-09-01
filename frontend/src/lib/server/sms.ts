/**
 * SMS sender over Brevo (Transactional SMS API).
 *
 * Mirrors `email.ts`'s shape (a narrow `SmsSender` interface + a
 * `createSmsSender` factory) so call sites and tests follow the same
 * pattern. Unlike email, there is no durable queue for SMS in this
 * starter — sends are best-effort, fire-and-log from the call site (see
 * `lib/server/alerts/matching.ts`). A network blip will not be retried.
 */
const BREVO_SMS_URL = 'https://api.brevo.com/v3/transactionalSMS/sms';

export interface SendSmsInput {
  to: string; // E.164, e.g. "+2250700000000"
  content: string;
}

export interface SmsSender {
  send(input: SendSmsInput): Promise<{ reference: string }>;
}

export interface CreateSmsSenderEnv {
  BREVO_API_KEY: string;
  /** Alphanumeric sender id (max 11 chars) or a phone number, per Brevo rules. */
  BREVO_SMS_SENDER: string;
}

export interface CreateSmsSenderOptions {
  fetchImpl?: typeof fetch;
}

interface BrevoSmsSuccess {
  reference?: string;
}

interface BrevoSmsError {
  code?: string;
  message?: string;
}

export function createSmsSender(
  env: CreateSmsSenderEnv,
  options: CreateSmsSenderOptions = {},
): SmsSender {
  if (!env.BREVO_API_KEY) {
    throw new Error('createSmsSender: BREVO_API_KEY is required');
  }
  if (!env.BREVO_SMS_SENDER) {
    throw new Error('createSmsSender: BREVO_SMS_SENDER is required');
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const apiKey = env.BREVO_API_KEY;
  const sender = env.BREVO_SMS_SENDER;

  return {
    async send(input: SendSmsInput): Promise<{ reference: string }> {
      const res = await fetchImpl(BREVO_SMS_URL, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender,
          recipient: input.to,
          content: input.content,
          type: 'transactional',
        }),
      });

      if (!res.ok) {
        const errorBody = (await res.json().catch(() => ({}))) as BrevoSmsError;
        throw new Error(`Brevo SMS error: ${errorBody.message ?? res.statusText}`);
      }

      const data = (await res.json()) as BrevoSmsSuccess;
      if (!data.reference) {
        throw new Error('Brevo SMS returned no reference');
      }

      return { reference: data.reference };
    },
  };
}
