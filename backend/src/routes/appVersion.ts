import { Router } from 'express';

export const appVersionRouter = Router();

const APP_STORE_ID = '6790413692';
const STORE_URL = `https://apps.apple.com/fr/app/id${APP_STORE_ID}`;
const CACHE_MS = 30 * 60 * 1000;

let cached: { version: string | null; fetchedAt: number } | null = null;

// The App Store itself says which version is live, so the app can invite people to
// update after every release without anyone maintaining a version number by hand.
async function latestStoreVersion(): Promise<string | null> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_MS) return cached.version;
  try {
    const response = await fetch(`https://itunes.apple.com/lookup?id=${APP_STORE_ID}&country=fr`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = (await response.json()) as { results?: { version?: string }[] };
    cached = { version: data.results?.[0]?.version ?? null, fetchedAt: Date.now() };
  } catch {
    cached = { version: cached?.version ?? null, fetchedAt: Date.now() };
  }
  return cached.version;
}

appVersionRouter.get('/latest', async (_req, res) => {
  res.json({ ios: { version: await latestStoreVersion(), storeUrl: STORE_URL } });
});
