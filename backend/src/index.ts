import { app } from './app.js';
import { backfillMusicProfiles } from './services/musicBackfill.js';

const port = process.env.PORT ?? 3000;

app.listen(port, () => {
  console.log(`Meylio API listening on http://localhost:${port}`);
  backfillMusicProfiles().catch((error) => console.error('[backfill] Échec :', error));
});
