const apiLogin = process.env.OCTOPUSH_API_LOGIN;
const apiKey = process.env.OCTOPUSH_API_KEY;
const sender = process.env.OCTOPUSH_SENDER ?? 'Meylio';

export async function sendLoginCodeSms(phone: string, code: string) {
  if (!apiLogin || !apiKey) {
    console.log(`[dev] Pas de config Octopush. Code de connexion pour ${phone} : ${code}`);
    return;
  }

  const response = await fetch('https://api.octopush.com/v1/public/sms-campaign/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-login': apiLogin,
      'api-key': apiKey,
    },
    body: JSON.stringify({
      recipients: [{ phone_number: phone }],
      text: `${code} — Ton code de connexion Meylio. Expire dans 10 minutes.`,
      sender,
      purpose: 'alert',
      type: 'sms_premium',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[Octopush] Échec d'envoi à ${phone} :`, text);
  }
}

export async function sendLaunchSms(phone: string) {
  if (!apiLogin || !apiKey) {
    console.log(`[dev] Pas de config Octopush. SMS de lancement pour ${phone}`);
    return;
  }

  const response = await fetch('https://api.octopush.com/v1/public/sms-campaign/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-login': apiLogin,
      'api-key': apiKey,
    },
    body: JSON.stringify({
      recipients: [{ phone_number: phone }],
      text: "Meylio est ouvert ! Connecte ta musique et découvre des profils compatibles sur meylio.fr",
      sender,
      purpose: 'alert',
      type: 'sms_premium',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[Octopush] Échec d'envoi (lancement) à ${phone} :`, text);
    throw new Error(`Échec d'envoi SMS à ${phone}`);
  }
}

async function sendOctopushText(phone: string, text: string, label: string) {
  if (!apiLogin || !apiKey) {
    console.log(`[dev] Pas de config Octopush. ${label} pour ${phone} : ${text}`);
    return;
  }
  const response = await fetch('https://api.octopush.com/v1/public/sms-campaign/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-login': apiLogin, 'api-key': apiKey },
    body: JSON.stringify({
      recipients: [{ phone_number: phone }],
      text,
      sender,
      purpose: 'alert',
      type: 'sms_premium',
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    console.error(`[Octopush] Échec d'envoi (${label}) à ${phone} :`, body);
    throw new Error(`Échec d'envoi SMS à ${phone}`);
  }
}

// Kept short on purpose, without links. Alerts are turned off from the app
// (Profil > Alertes de likes).
export async function sendLikeAlertSms(phone: string) {
  await sendOctopushText(phone, "Meylio : quelqu'un a liké ton profil ! Découvre qui", 'alerte like');
}

export async function sendFeedbackReplySms(phone: string, message: string) {
  await sendOctopushText(phone, `Meylio : ${message}`, 'réponse à un avis');
}

export async function sendMarketingSms(phone: string, message: string, unsubscribeUrl: string) {
  await sendOctopushText(phone, `${message} Stop : ${unsubscribeUrl}`, 'promo');
}
