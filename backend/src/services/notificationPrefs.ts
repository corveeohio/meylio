import { createHmac, timingSafeEqual } from 'node:crypto';

export type UnsubscribeKind = 'likes' | 'marketing';

function secret(): string | null {
  return process.env.UNSUBSCRIBE_SECRET ?? process.env.ADMIN_KEY ?? null;
}

function sign(userId: string, kind: UnsubscribeKind): string | null {
  const key = secret();
  if (!key) return null;
  return createHmac('sha256', key).update(`${userId}:${kind}`).digest('hex').slice(0, 32);
}

export function buildUnsubscribeUrl(userId: string, kind: UnsubscribeKind): string {
  const base = process.env.PUBLIC_API_URL ?? 'https://api.meylio.fr';
  return `${base}/unsubscribe?u=${encodeURIComponent(userId)}&k=${kind}&s=${sign(userId, kind) ?? ''}`;
}

export function isValidUnsubscribeSignature(userId: string, kind: UnsubscribeKind, signature: string): boolean {
  const expected = sign(userId, kind);
  if (!expected || expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
