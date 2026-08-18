/**
 * Notification templates.
 *
 * Each project defines its own typed wrappers around `createNotification`.
 * The example below ships with the template — adapt it, replace it, or add
 * more (e.g. `firePaymentReceived`, `fireExportReady`). The pattern:
 *
 *   1. Build a `CreateNotificationInput` with a *deterministic* dedupeKey
 *      so the unique constraint enforces at-most-once delivery for that
 *      logical event (e.g. `payment-received:${orderId}` — never include
 *      a timestamp or random suffix).
 *   2. Pass the input + your PrismaClient to `createNotification`.
 *   3. Optionally enqueue an email via `EmailQueue.enqueue` — but ONLY
 *      after the notification row is created, so a duplicate event never
 *      sends a duplicate email.
 *
 * Keep these helpers free of side effects beyond the row insert; the
 * email enqueue belongs at the call site so each project can pick the
 * right channel (no email vs. transactional vs. marketing).
 */

import type { CreateNotificationInput } from './index';

export function welcomeNotification(userId: string, email: string): CreateNotificationInput {
  return {
    userId,
    type: 'WELCOME',
    title: 'Welcome!',
    body: `Glad to have you on board, ${email}.`,
    dedupeKey: `welcome:${userId}`,
  };
}

/**
 * Example: notification dispatched after a successful payment.
 * Called from the Bictorys webhook handler's `onPaid` post-commit hook.
 */
export function paymentReceived(
  userId: string,
  orderId: string,
  amount: number,
  currency: string,
): CreateNotificationInput {
  return {
    userId,
    type: 'PAYMENT_RECEIVED',
    title: 'Payment received',
    body: `Order ${orderId} for ${amount} ${currency} confirmed.`,
    data: { orderId, amount, currency },
    dedupeKey: `payment-received:${orderId}`,
  };
}

/**
 * Dispatched to an Alert's owner when a PropertyRequest matches its
 * criteria (either direction — see lib/server/alerts/matching.ts).
 */
export function alertMatchNotification(
  userId: string,
  alertId: string,
  alertName: string,
  requestId: string,
  requestSummary: string,
): CreateNotificationInput {
  return {
    userId,
    type: 'ALERT_MATCH',
    title: `Nouvelle correspondance — ${alertName}`,
    body: requestSummary,
    data: { alertId, requestId },
    dedupeKey: `alert-match:${alertId}:${requestId}`,
  };
}

/**
 * Dispatched to a Listing's owner when a visitor submits the public
 * detail page's contact form (a general message or a VR-visit request).
 */
export function listingInquiryNotification(
  userId: string,
  listingId: string,
  listingTitle: string,
  inquiryId: string,
  inquiryType: 'MESSAGE' | 'VR_VISIT',
  fromName: string,
): CreateNotificationInput {
  return {
    userId,
    type: 'LISTING_INQUIRY',
    title:
      inquiryType === 'VR_VISIT'
        ? `Demande de visite VR — ${listingTitle}`
        : `Nouveau message — ${listingTitle}`,
    body: `${fromName} s'intéresse à « ${listingTitle} ».`,
    data: { listingId, inquiryId },
    dedupeKey: `listing-inquiry:${inquiryId}`,
  };
}
