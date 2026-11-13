import { prisma } from '../prisma.js';

// On 11/11/2026 a bot asked for login codes for 356 foreign numbers in under a minute
// (SMS pumping), which emptied the Octopush credit. Every code sent by SMS goes
// through these checks before reaching Octopush.

// France (with overseas departments), Belgium, Switzerland, Luxembourg and Monaco.
// Every real Meylio user so far has a French number; other countries use email.
const ALLOWED_SMS_PREFIXES = ['+33', '+262', '+590', '+594', '+596', '+32', '+41', '+352', '+377'];

const MAX_CODES_PER_NUMBER_PER_DAY = 5;
const MAX_CODES_PER_IP_PER_HOUR = 5;
const MAX_SMS_CODES_PER_HOUR = 30;

const HOUR_MS = 60 * 60 * 1000;
const requestsByIp = new Map<string, number[]>();

export type SmsGuardResult = { ok: true } | { ok: false; status: number; error: string };

export function isAllowedSmsCountry(phone: string): boolean {
  return ALLOWED_SMS_PREFIXES.some((prefix) => phone.startsWith(prefix));
}

function recordIpRequest(ip: string): number {
  const now = Date.now();
  const recent = (requestsByIp.get(ip) ?? []).filter((time) => now - time < HOUR_MS);
  recent.push(now);
  requestsByIp.set(ip, recent);
  if (requestsByIp.size > 10_000) {
    for (const [key, times] of requestsByIp) {
      if (times.every((time) => now - time >= HOUR_MS)) requestsByIp.delete(key);
    }
  }
  return recent.length;
}

export async function checkSmsCodeRequest(phone: string, ip: string | undefined): Promise<SmsGuardResult> {
  if (!isAllowedSmsCountry(phone)) {
    return {
      ok: false,
      status: 400,
      error: 'Les codes par SMS ne sont disponibles que pour les numéros français, belges, suisses, luxembourgeois et monégasques. Connecte-toi avec ton email.',
    };
  }

  if (ip && recordIpRequest(ip) > MAX_CODES_PER_IP_PER_HOUR) {
    console.warn(`[SMS] Trop de demandes de code depuis ${ip}`);
    return { ok: false, status: 429, error: 'Trop de demandes de code. Réessaie dans une heure ou connecte-toi avec ton email.' };
  }

  const [forNumberToday, allLastHour] = await Promise.all([
    prisma.loginCode.count({ where: { phone, createdAt: { gte: new Date(Date.now() - 24 * HOUR_MS) } } }),
    prisma.loginCode.count({ where: { phone: { not: null }, createdAt: { gte: new Date(Date.now() - HOUR_MS) } } }),
  ]);
  if (forNumberToday >= MAX_CODES_PER_NUMBER_PER_DAY) {
    return { ok: false, status: 429, error: 'Trop de codes demandés pour ce numéro aujourd’hui. Réessaie demain ou connecte-toi avec ton email.' };
  }
  if (allLastHour >= MAX_SMS_CODES_PER_HOUR) {
    console.error('[SMS] Plafond horaire de codes SMS atteint : envois suspendus pour protéger le crédit Octopush.');
    return { ok: false, status: 429, error: 'L’envoi de codes par SMS est momentanément indisponible. Connecte-toi avec ton email ou réessaie plus tard.' };
  }

  return { ok: true };
}
