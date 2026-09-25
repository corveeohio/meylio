import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendWaitlistVerificationEmail(email: string, verificationToken: string) {
  const verifyUrl = `${process.env.PUBLIC_API_URL}/waitlist/verify?token=${verificationToken}`;

  if (!resend) {
    console.log(`[dev] Pas de RESEND_API_KEY configurée. Lien de vérification pour ${email} : ${verifyUrl}`);
    return;
  }

  const { error } = await resend.emails.send({
    from: 'Meylio <noreply@meylio.fr>',
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

export async function sendLaunchEmail(email: string) {
  if (!resend) {
    console.log(`[dev] Pas de RESEND_API_KEY configurée. Email de lancement pour ${email}`);
    return;
  }

  const { error } = await resend.emails.send({
    from: 'Meylio <noreply@meylio.fr>',
    to: email,
    subject: 'Meylio est ouvert 🎧',
    html: `
      <div style="font-family: -apple-system, sans-serif; background: #0F0F14; color: #FFFFFF; padding: 40px; text-align: center;">
        <h1 style="color: #FFFFFF;">C'est ouvert !</h1>
        <p style="color: #9A9AA8; font-size: 15px;">Merci d'avoir patienté. Meylio est maintenant disponible — connecte ta musique et découvre des profils compatibles sur tes goûts musicaux, et pas pour tes photos.</p>
        <a href="https://meylio.fr" style="display: inline-block; margin-top: 20px; padding: 14px 28px; background: linear-gradient(135deg, #7C5CFF, #FF5CA8); color: #FFFFFF; text-decoration: none; border-radius: 10px; font-weight: 600;">
          Ouvrir Meylio
        </a>
      </div>
    `,
  });

  if (error) {
    console.error(`[Resend] Échec d'envoi à ${email} :`, error);
    throw new Error(`Échec d'envoi à ${email}`);
  }
}

export async function sendLoginCodeEmail(email: string, code: string) {
  if (!resend) {
    console.log(`[dev] Pas de RESEND_API_KEY configurée. Code de connexion pour ${email} : ${code}`);
    return;
  }

  const { error } = await resend.emails.send({
    from: 'Meylio <noreply@meylio.fr>',
    to: email,
    subject: `${code} — Ton code de connexion Meylio`,
    html: `
      <div style="font-family: -apple-system, sans-serif; background: #0F0F14; color: #FFFFFF; padding: 40px; text-align: center;">
        <h1 style="color: #FFFFFF;">Ton code de connexion</h1>
        <p style="color: #9A9AA8; font-size: 15px;">Saisis ce code dans l'app pour te connecter. Il expire dans 10 minutes.</p>
        <p style="font-size: 36px; font-weight: 800; letter-spacing: 8px; margin-top: 24px; background: linear-gradient(135deg, #7C5CFF, #FF5CA8); -webkit-background-clip: text; background-clip: text; color: transparent;">
          ${code}
        </p>
      </div>
    `,
  });

  if (error) {
    console.error(`[Resend] Échec d'envoi à ${email} :`, error);
  }
}

const emailShell = (title: string, body: string, footer: string) => `
  <div style="font-family: -apple-system, sans-serif; background: #0F0F14; color: #FFFFFF; padding: 40px; text-align: center;">
    <h1 style="color: #FFFFFF;">${title}</h1>
    <p style="color: #9A9AA8; font-size: 15px; white-space: pre-line;">${body}</p>
    <a href="https://apps.apple.com/app/id6790413692" style="display: inline-block; margin-top: 20px; padding: 14px 28px; background: linear-gradient(135deg, #7C5CFF, #FF5CA8); color: #FFFFFF; text-decoration: none; border-radius: 10px; font-weight: 600;">
      Ouvrir Meylio
    </a>
    <p style="color: #6B6B78; font-size: 12px; margin-top: 32px;">${footer}</p>
  </div>
`;

export async function sendLikeAlertEmail(email: string, unsubscribeUrl: string) {
  if (!resend) {
    console.log(`[dev] Pas de RESEND_API_KEY configurée. Alerte like pour ${email}`);
    return;
  }
  const { error } = await resend.emails.send({
    from: 'Meylio <noreply@meylio.fr>',
    to: email,
    subject: 'Quelqu\'un a liké ton profil 🎵',
    html: emailShell(
      'Quelqu\'un a liké ton profil',
      'Une personne qui partage tes goûts musicaux t\'a liké sur Meylio. Ouvre l\'app pour découvrir qui.',
      `<a href="${unsubscribeUrl}" style="color: #6B6B78;">Ne plus recevoir ces alertes</a>`
    ),
  });
  if (error) console.error(`[Resend] Échec d'envoi (alerte like) à ${email} :`, error);
}

export async function sendMarketingEmail(email: string, subject: string, message: string, unsubscribeUrl: string) {
  if (!resend) {
    console.log(`[dev] Pas de RESEND_API_KEY configurée. Email promo pour ${email}`);
    return;
  }
  const safeMessage = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const { error } = await resend.emails.send({
    from: 'Meylio <noreply@meylio.fr>',
    to: email,
    subject,
    html: emailShell(
      subject.replace(/</g, '&lt;'),
      safeMessage,
      `Tu reçois cet email car tu as accepté les actualités Meylio. <a href="${unsubscribeUrl}" style="color: #6B6B78;">Se désinscrire</a>`
    ),
  });
  if (error) {
    console.error(`[Resend] Échec d'envoi (promo) à ${email} :`, error);
    throw new Error(`Échec d'envoi à ${email}`);
  }
}
