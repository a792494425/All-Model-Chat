import crypto from 'node:crypto';

/**
 * Compare a candidate password against the expected password using SHA-256 hashes
 * and crypto.timingSafeEqual to prevent side-channel timing attacks.
 */
export function timingSafePasswordEqual(
  provided: string | undefined | null,
  expected: string | undefined | null,
): boolean {
  if (typeof provided !== 'string' || typeof expected !== 'string') {
    return false;
  }

  const hashProvided = crypto.createHash('sha256').update(provided).digest();
  const hashExpected = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(hashProvided, hashExpected);
}
