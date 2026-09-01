// Lazy-init SmsSender. Returns null when BREVO_API_KEY / BREVO_SMS_SENDER is
// missing — callers MUST handle the null case gracefully (skip the SMS,
// keep the other notification channels going). Pattern mirrors
// queues/email-queue-singleton.ts, minus the durable queue (SMS is
// best-effort here — see lib/server/alerts/matching.ts).
import 'server-only';
import { createSmsSender, type SmsSender } from './sms';
import { createLogger } from './logger';

const log = createLogger();

let _sender: SmsSender | null = null;
let _initialized = false;

export function getSmsSender(): SmsSender | null {
  if (_initialized) return _sender;

  const brevoKey = process.env.BREVO_API_KEY ?? '';
  const smsSender = process.env.BREVO_SMS_SENDER ?? '';

  if (!brevoKey || !smsSender) {
    log.warn('sms-singleton: not configured (BREVO_API_KEY / BREVO_SMS_SENDER required)');
    _initialized = true;
    _sender = null;
    return null;
  }

  _sender = createSmsSender({ BREVO_API_KEY: brevoKey, BREVO_SMS_SENDER: smsSender });
  _initialized = true;
  return _sender;
}

/** Test-only — clear the cached sender. */
export function __resetSmsSenderSingleton(): void {
  _sender = null;
  _initialized = false;
}
