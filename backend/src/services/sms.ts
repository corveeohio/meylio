const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

export async function sendLoginCodeSms(phone: string, code: string) {
  if (!accountSid || !authToken || !fromNumber) {
    console.log(`[dev] Pas de config Twilio. Code de connexion pour ${phone} : ${code}`);
    return;
  }

  const body = new URLSearchParams({
    To: phone,
    From: fromNumber,
    Body: `${code} — Ton code de connexion Meylio. Expire dans 10 minutes.`,
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[Twilio] Échec d'envoi à ${phone} :`, text);
  }
}
