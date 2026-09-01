// Coarse traffic-source classifier for ListingView.source — buckets a
// public-detail-page hit into ORGANIC | SOCIAL | EMAIL | DIRECT | OTHER
// from the Referer header (+ optional utm_source query param). No
// external service involved — best-effort heuristic, not exact analytics.

const SEARCH_ENGINES = ['google.', 'bing.', 'yahoo.', 'duckduckgo.', 'yandex.'];
const SOCIAL_NETWORKS = [
  'facebook.',
  'instagram.',
  'twitter.com',
  'x.com',
  't.co',
  'linkedin.',
  'tiktok.',
  'whatsapp.',
  'wa.me',
];
const EMAIL_HOSTS = ['mail.google.com', 'outlook.', 'mail.yahoo.', 'webmail.'];

export type TrafficSource = 'ORGANIC' | 'SOCIAL' | 'EMAIL' | 'DIRECT' | 'OTHER';

export function classifySource(
  refererHeader: string | null,
  utmSource: string | null,
): TrafficSource {
  if (utmSource) {
    const s = utmSource.toLowerCase();
    if (s === 'email' || s === 'newsletter') return 'EMAIL';
    if (s === 'social' || SOCIAL_NETWORKS.some((n) => s.includes(n.replace('.', ''))))
      return 'SOCIAL';
    if (s === 'search' || s === 'google') return 'ORGANIC';
  }

  if (!refererHeader) return 'DIRECT';

  let host: string;
  try {
    host = new URL(refererHeader).hostname.toLowerCase();
  } catch {
    return 'OTHER';
  }

  if (EMAIL_HOSTS.some((h) => host.includes(h))) return 'EMAIL';
  if (SEARCH_ENGINES.some((h) => host.includes(h))) return 'ORGANIC';
  if (SOCIAL_NETWORKS.some((h) => host.includes(h))) return 'SOCIAL';

  return 'OTHER';
}
