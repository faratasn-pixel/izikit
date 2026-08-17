/**
 * Alert ↔ PropertyRequest matching engine.
 *
 * A PropertyRequest ("demande immobilière") matches an Alert ("alerte
 * secteur") when: same transactionType, same country+city, the request's
 * propertyType is one of the alert's propertyTypes, and their price ranges
 * overlap (a missing bound on either side is treated as unbounded on that
 * side, not as a mismatch).
 *
 * Called bidirectionally, in real time, right after a create:
 *   - `runMatchingForNewAlert`   from POST /api/alerts   (scans existing requests)
 *   - `runMatchingForNewRequest` from POST /api/requests (scans existing active alerts)
 *
 * Each match is recorded once (AlertMatch @@unique([alertId, propertyRequestId])
 * is the anti-duplicate-notification lock) and fans out to the alert
 * owner's enabled channels (in-app always; email/SMS/WhatsApp best-effort,
 * independently — one channel failing never blocks the others or the
 * caller's original request).
 */
import 'server-only';
import type { PrismaClient, Alert, PropertyRequest } from '@prisma/client';
import { createLogger } from '../logger';
import { createNotification } from '../notifications';
import { alertMatchNotification } from '../notifications/templates';
import { getEmailQueue } from '../queues/email-queue-singleton';
import { getSmsSender } from '../sms-singleton';
import { getWhatsappSender } from '../whatsapp-singleton';
import { PROPERTY_TYPE_LABEL, TRANSACTION_TYPE_LABEL } from '@/lib/listings';

const log = createLogger();

export type AlertForMatching = Pick<
  Alert,
  | 'id'
  | 'userId'
  | 'name'
  | 'transactionType'
  | 'propertyTypes'
  | 'country'
  | 'cities'
  | 'priceMin'
  | 'priceMax'
  | 'notifEmail'
  | 'notifSms'
  | 'notifWhatsapp'
>;

export type RequestForMatching = Pick<
  PropertyRequest,
  | 'id'
  | 'userId'
  | 'transactionType'
  | 'propertyType'
  | 'country'
  | 'city'
  | 'budgetMin'
  | 'budgetMax'
  | 'clientName'
>;

const ALERT_SELECT = {
  id: true,
  userId: true,
  name: true,
  transactionType: true,
  propertyTypes: true,
  country: true,
  cities: true,
  priceMin: true,
  priceMax: true,
  notifEmail: true,
  notifSms: true,
  notifWhatsapp: true,
} as const;

const REQUEST_SELECT = {
  id: true,
  userId: true,
  transactionType: true,
  propertyType: true,
  country: true,
  city: true,
  budgetMin: true,
  budgetMax: true,
  clientName: true,
} as const;

function priceRangesOverlap(
  aMin: number | null,
  aMax: number | null,
  bMin: number | null,
  bMax: number | null,
): boolean {
  const lo = Math.max(aMin ?? -Infinity, bMin ?? -Infinity);
  const hi = Math.min(aMax ?? Infinity, bMax ?? Infinity);
  return lo <= hi;
}

function alertCities(alert: Pick<AlertForMatching, 'cities'>): string[] {
  return Array.isArray(alert.cities) ? (alert.cities as string[]) : [];
}

export function matchesAlert(alert: AlertForMatching, request: RequestForMatching): boolean {
  if (alert.transactionType !== request.transactionType) return false;
  if (alert.country !== request.country) return false;
  if (!alertCities(alert).includes(request.city)) return false;
  const propertyTypes = Array.isArray(alert.propertyTypes) ? (alert.propertyTypes as string[]) : [];
  if (!propertyTypes.includes(request.propertyType)) return false;
  if (!priceRangesOverlap(alert.priceMin, alert.priceMax, request.budgetMin, request.budgetMax)) {
    return false;
  }
  return true;
}

export async function findMatchingRequestsForAlert(
  prisma: PrismaClient,
  alert: AlertForMatching,
): Promise<RequestForMatching[]> {
  const candidates = await prisma.propertyRequest.findMany({
    where: {
      transactionType: alert.transactionType,
      country: alert.country,
      city: { in: alertCities(alert) },
    },
    select: REQUEST_SELECT,
  });
  return candidates.filter((r) => matchesAlert(alert, r));
}

export async function findMatchingAlertsForRequest(
  prisma: PrismaClient,
  request: RequestForMatching,
): Promise<AlertForMatching[]> {
  const candidates = await prisma.alert.findMany({
    where: {
      active: true,
      transactionType: request.transactionType,
      country: request.country,
    },
    select: ALERT_SELECT,
  });
  return candidates.filter((a) => matchesAlert(a, request));
}

async function dispatchMatchNotifications(
  prisma: PrismaClient,
  alert: AlertForMatching,
  request: RequestForMatching,
): Promise<void> {
  const owner = await prisma.user.findUnique({
    where: { id: alert.userId },
    select: { id: true, email: true, phone: true },
  });
  if (!owner) return;

  const transactionLabel =
    TRANSACTION_TYPE_LABEL[request.transactionType] ?? request.transactionType;
  const propertyLabel = PROPERTY_TYPE_LABEL[request.propertyType] ?? request.propertyType;
  const summary = `${propertyLabel} · ${transactionLabel} · ${request.city} — demande de ${request.clientName}`;

  await createNotification(
    prisma,
    alertMatchNotification(owner.id, alert.id, alert.name, request.id, summary),
  );

  if (alert.notifEmail) {
    const queue = getEmailQueue();
    if (queue) {
      try {
        await queue.enqueue({
          to: owner.email,
          subject: `Nouvelle correspondance pour "${alert.name}"`,
          html: `<p>${summary}</p>`,
          text: summary,
        });
      } catch (err) {
        log.warn('alert-match: email enqueue failed', {
          alertId: alert.id,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  if (alert.notifSms) {
    if (!owner.phone) {
      log.warn('alert-match: SMS skipped, owner has no phone', { alertId: alert.id });
    } else {
      const sender = getSmsSender();
      if (sender) {
        try {
          await sender.send({ to: owner.phone, content: summary });
        } catch (err) {
          log.warn('alert-match: SMS send failed', {
            alertId: alert.id,
            err: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
  }

  if (alert.notifWhatsapp) {
    if (!owner.phone) {
      log.warn('alert-match: WhatsApp skipped, owner has no phone', { alertId: alert.id });
    } else {
      const sender = getWhatsappSender();
      const templateId = Number(process.env.BREVO_WHATSAPP_TEMPLATE_ID ?? '');
      if (sender && Number.isFinite(templateId)) {
        try {
          await sender.send({
            to: owner.phone,
            templateId,
            params: { alertName: alert.name, summary },
          });
        } catch (err) {
          log.warn('alert-match: WhatsApp send failed', {
            alertId: alert.id,
            err: err instanceof Error ? err.message : String(err),
          });
        }
      } else if (sender) {
        log.warn('alert-match: WhatsApp skipped, BREVO_WHATSAPP_TEMPLATE_ID not configured');
      }
    }
  }
}

async function recordMatchAndNotify(
  prisma: PrismaClient,
  alert: AlertForMatching,
  request: RequestForMatching,
): Promise<void> {
  try {
    await prisma.alertMatch.create({
      data: { alertId: alert.id, propertyRequestId: request.id },
    });
  } catch (err) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: unknown }).code === 'P2002'
    ) {
      return; // Already matched — never re-notify for the same pair.
    }
    throw err;
  }

  await dispatchMatchNotifications(prisma, alert, request);
}

/** Called right after POST /api/alerts creates a new Alert. */
export async function runMatchingForNewAlert(
  prisma: PrismaClient,
  alert: AlertForMatching,
): Promise<void> {
  const requests = await findMatchingRequestsForAlert(prisma, alert);
  for (const request of requests) {
    await recordMatchAndNotify(prisma, alert, request);
  }
}

/** Called right after POST /api/requests creates a new PropertyRequest. */
export async function runMatchingForNewRequest(
  prisma: PrismaClient,
  request: RequestForMatching,
): Promise<void> {
  const alerts = await findMatchingAlertsForRequest(prisma, request);
  for (const alert of alerts) {
    await recordMatchAndNotify(prisma, alert, request);
  }
}
