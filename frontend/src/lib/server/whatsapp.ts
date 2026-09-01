/**
 * WhatsApp sender over Brevo's WhatsApp Business API.
 *
 * Requires a WhatsApp Business sender + at least one pre-approved message
 * template configured in the Brevo account (WhatsApp does not allow
 * arbitrary free-text business-initiated messages) — that setup happens
 * outside this code. `BREVO_WHATSAPP_TEMPLATE_ID` identifies which
 * approved template to use; `params` fills its placeholders in order.
 *
 * Best-effort, no durable queue — same posture as `sms.ts`. The exact
 * request payload below follows Brevo's public WhatsApp API docs; verify
 * against your account once WhatsApp is actually configured, since this
 * could not be exercised against a live Brevo WhatsApp sender in this
 * environment.
 */
const BREVO_WHATSAPP_URL = 'https://api.brevo.com/v3/whatsapp/sendMessage';

export interface SendWhatsappInput {
  to: string; // E.164, e.g. "+2250700000000"
  templateId: number;
  params?: Record<string, string>;
}

export interface WhatsappSender {
  send(input: SendWhatsappInput): Promise<{ messageId: string }>;
}

export interface CreateWhatsappSenderEnv {
  BREVO_API_KEY: string;
  /** Brevo-registered WhatsApp Business sender number, E.164. */
  BREVO_WHATSAPP_SENDER_NUMBER: string;
}

export interface CreateWhatsappSenderOptions {
  fetchImpl?: typeof fetch;
}

interface BrevoWhatsappSuccess {
  messageId?: string;
}

interface BrevoWhatsappError {
  code?: string;
  message?: string;
}

export function createWhatsappSender(
  env: CreateWhatsappSenderEnv,
  options: CreateWhatsappSenderOptions = {},
): WhatsappSender {
  if (!env.BREVO_API_KEY) {
    throw new Error('createWhatsappSender: BREVO_API_KEY is required');
  }
  if (!env.BREVO_WHATSAPP_SENDER_NUMBER) {
    throw new Error('createWhatsappSender: BREVO_WHATSAPP_SENDER_NUMBER is required');
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const apiKey = env.BREVO_API_KEY;
  const senderNumber = env.BREVO_WHATSAPP_SENDER_NUMBER;

  return {
    async send(input: SendWhatsappInput): Promise<{ messageId: string }> {
      const res = await fetchImpl(BREVO_WHATSAPP_URL, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          senderNumber,
          contactNumbers: [input.to],
          templateId: input.templateId,
          ...(input.params ? { params: input.params } : {}),
        }),
      });

      if (!res.ok) {
        const errorBody = (await res.json().catch(() => ({}))) as BrevoWhatsappError;
        throw new Error(`Brevo WhatsApp error: ${errorBody.message ?? res.statusText}`);
      }

      const data = (await res.json()) as BrevoWhatsappSuccess;
      if (!data.messageId) {
        throw new Error('Brevo WhatsApp returned no messageId');
      }

      return { messageId: data.messageId };
    },
  };
}
