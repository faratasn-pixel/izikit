// Lazy-init WhatsappSender. Returns null when BREVO_API_KEY /
// BREVO_WHATSAPP_SENDER_NUMBER is missing — callers MUST handle the null
// case gracefully. Pattern mirrors sms-singleton.ts / email-queue-singleton.ts.
import 'server-only';
import { createWhatsappSender, type WhatsappSender } from './whatsapp';
import { createLogger } from './logger';

const log = createLogger();

let _sender: WhatsappSender | null = null;
let _initialized = false;

export function getWhatsappSender(): WhatsappSender | null {
  if (_initialized) return _sender;

  const brevoKey = process.env.BREVO_API_KEY ?? '';
  const senderNumber = process.env.BREVO_WHATSAPP_SENDER_NUMBER ?? '';

  if (!brevoKey || !senderNumber) {
    log.warn(
      'whatsapp-singleton: not configured (BREVO_API_KEY / BREVO_WHATSAPP_SENDER_NUMBER required)',
    );
    _initialized = true;
    _sender = null;
    return null;
  }

  _sender = createWhatsappSender({
    BREVO_API_KEY: brevoKey,
    BREVO_WHATSAPP_SENDER_NUMBER: senderNumber,
  });
  _initialized = true;
  return _sender;
}

/** Test-only — clear the cached sender. */
export function __resetWhatsappSenderSingleton(): void {
  _sender = null;
  _initialized = false;
}
