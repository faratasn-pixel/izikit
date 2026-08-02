// Lazy-initialized Cloudinary singleton + uploader accessor.
//
// Why lazy?
//   `cloudinary.config({...})` itself doesn't throw on missing creds — calls
//   would only fail at request time with an opaque error. Worse, our route
//   should return a clean 503 STORAGE_NOT_CONFIGURED instead of a generic
//   500. By gating configuration on the three required envs
//   (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET), we
//   throw a typed `StorageNotConfiguredError` synchronously on first use.
//   Routes catch `instanceof` and translate to 503.
//
//   Additionally, this avoids reading `process.env` at module top-level —
//   which would lock in stale values for tests that mutate the env.
//
// Pitfall (env.ts Zod rejection): CLOUDINARY_* keys are deliberately NOT
// added to `frontend/src/lib/server/env.ts`'s Zod schema. The schema rejects
// empty strings, which would refuse to boot the whole app whenever
// Cloudinary is unconfigured (dev / CI). Lazy-init handles `?? ''`
// empty-as-absent directly.
import 'server-only';
import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from 'cloudinary';

/**
 * Thrown by `getCloudinaryUploader()` when any of `CLOUDINARY_CLOUD_NAME`,
 * `CLOUDINARY_API_KEY`, or `CLOUDINARY_API_SECRET` is missing/empty. The
 * upload route catches this `instanceof` and returns 503
 * `{ code: 'STORAGE_NOT_CONFIGURED' }`. The error message intentionally
 * avoids echoing any env values — only names — so a stack trace surfaced
 * via Sentry never leaks a partial credential.
 */
export class StorageNotConfiguredError extends Error {
  constructor() {
    super(
      'Storage not configured (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET missing or empty)',
    );
    this.name = 'StorageNotConfiguredError';
  }
}

/**
 * Result shape returned by `uploadBuffer()`. Mirrors the small subset of
 * `UploadApiResponse` the upload route consumes; we don't leak the full
 * Cloudinary surface upstream.
 */
export interface UploadResult {
  /** Cloudinary public_id — stored as `FileUpload.key` for forward-compat. */
  publicId: string;
  /** HTTPS CDN URL the browser hits directly (no proxy). */
  secureUrl: string;
  /** Stored byte length. */
  bytes: number;
}

let _configured = false;
let _preset: string | null = null;

function configureOnce(): void {
  if (_configured) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';
  const apiKey = process.env.CLOUDINARY_API_KEY ?? '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET ?? '';
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET ?? '';

  if (!cloudName || !apiKey || !apiSecret) {
    throw new StorageNotConfiguredError();
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  _preset = uploadPreset || null;
  _configured = true;
}

/**
 * Upload a buffer to Cloudinary. Streams the bytes via `upload_stream` and
 * resolves with the public_id + secure_url. Throws `StorageNotConfiguredError`
 * when the three required envs are missing; the route translates to 503.
 *
 * `publicId` is supplied by the caller (the upload route builds a path-like
 * key, `{userId}/{cuid}`) so we don't depend on Cloudinary's random ID.
 */
export async function uploadBuffer(
  publicId: string,
  body: Buffer,
  contentType: string,
): Promise<UploadResult> {
  configureOnce();

  // resource_type 'auto' lets Cloudinary pick image/video/raw from the bytes,
  // matching the route's MIME-allowlist approach (we already validated the
  // MIME server-side; Cloudinary's auto-detect is the secondary safety net).
  const options: UploadApiOptions = {
    public_id: publicId,
    resource_type: 'auto',
  };
  if (_preset) options.upload_preset = _preset;
  // Surface the validated MIME as free-form context (not `metadata`, which
  // requires a pre-defined structured-metadata field in the Cloudinary
  // account and 400s with "Metadata External IDs do not exist" otherwise).
  if (contentType) options.context = `mime=${contentType}`;

  const res = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, response) => {
      if (err) return reject(err);
      if (!response) return reject(new Error('Cloudinary upload returned no response'));
      resolve(response);
    });
    stream.end(body);
  });

  return {
    publicId: res.public_id,
    secureUrl: res.secure_url,
    bytes: typeof res.bytes === 'number' ? res.bytes : body.length,
  };
}

/**
 * Test-only escape hatch — clears the cached configuration flag so a test can
 * mutate `process.env.CLOUDINARY_*` and re-trigger lazy init. Never call this
 * from application code.
 *
 * @internal
 */
export function __resetCloudinarySingleton(): void {
  _configured = false;
  _preset = null;
}
