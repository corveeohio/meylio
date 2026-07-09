import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendWaitlistVerificationEmail(email: string, verificationToken: string) {
  const verifyUrl = `${process.env.PUBLIC_API_URL}/waitlist/verify?token=${verificationToken}`;

  if (!resend) {
    console.log(`[dev] Pas de RESEND_API_KEY configurée. Lien de vérification pour ${email} : ${verifyUrl}`);
    return;
  }

  const { error } = await resend.emails.send({
    from: 'Meylio <onboarding@resend.dev>',
    to: email,
    subject: 'Confirme ton inscription à Meylio',
    html: `
      <div style="font-family: -apple-system, sans-serif; background: #0F0F14; color: #FFFFFF; padding: 40px; text-align: center;">
        <h1 style="color: #FFFFFF;">Bienvenue sur Meylio 🎧</h1>
        <p style="color: #9A9AA8; font-size: 15px;">Confirme ton adresse email pour valider ton inscription à la liste d'attente.</p>
        <a href="${verifyUrl}" style="display: inline-block; margin-top: 20px; padding: 14px 28px; background: linear-gradient(135deg, #7C5CFF, #FF5CA8); color: #FFFFFF; text-decoration: none; border-radius: 10px; font-weight: 600;">
          Confirmer mon adresse
        </a>
      </div>
    `,
  });

  if (error) {
    console.error(`[Resend] Échec d'envoi à ${email} :`, error);
  }
}
