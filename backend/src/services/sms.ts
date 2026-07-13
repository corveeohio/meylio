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
