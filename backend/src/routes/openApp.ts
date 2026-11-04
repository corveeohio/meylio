import { Router } from 'express';

export const openAppRouter = Router();

const APP_SCHEME_URL = 'meylio://';
const APP_STORE_URL = 'https://apps.apple.com/fr/app/id6790413692';
// Public HTTPS link used in SMS and emails: custom schemes like meylio:// are not
// clickable in SMS, so this page opens the app and falls back to the App Store.
export const OPEN_APP_URL = `${process.env.PUBLIC_API_URL ?? 'https://api.meylio.fr'}/open`;

const page = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Meylio</title></head>
<body style="font-family:-apple-system,sans-serif;background:#0F0F14;color:#fff;text-align:center;padding:60px 24px">
<h1>Meylio</h1>
<p style="color:#9A9AA8">Ouverture de l'application…</p>
<p><a href="${APP_SCHEME_URL}" style="display:inline-block;background:#7B5CFF;color:#fff;padding:14px 22px;border-radius:12px;text-decoration:none;font-weight:600">Ouvrir Meylio</a></p>
<p><a href="${APP_STORE_URL}" style="color:#9A9AA8">Télécharger sur l'App Store</a></p>
<script>
  window.location.href = '${APP_SCHEME_URL}';
  // Still on this page after a moment: the app is not installed.
  setTimeout(function () { if (!document.hidden) window.location.href = '${APP_STORE_URL}'; }, 1500);
</script>
</body></html>`;

openAppRouter.get('/', (_req, res) => {
  res.send(page);
});
