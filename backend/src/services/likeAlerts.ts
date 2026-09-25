import { prisma } from '../prisma.js';
import { sendPushNotification } from './pushNotifications.js';
import { sendLikeAlertEmail } from './mailer.js';
import { sendLikeAlertSms } from './sms.js';
import { buildUnsubscribeUrl } from './notificationPrefs.js';

const MIN_HOURS_BETWEEN_ALERTS = 6;

export async function notifyLikeReceived(likedUserId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: likedUserId } });
    if (!user || !user.notifyLikeAlerts || user.isSuspended) return;

    const cutoff = Date.now() - MIN_HOURS_BETWEEN_ALERTS * 3600 * 1000;
    if (user.lastLikeAlertAt && user.lastLikeAlertAt.getTime() > cutoff) return;

    await prisma.user.update({ where: { id: user.id }, data: { lastLikeAlertAt: new Date() } });

    if (user.pushToken) {
      await sendPushNotification(user.pushToken, 'Quelqu’un t’a liké 🎵', 'Ouvre Meylio pour découvrir qui partage tes goûts.', {
        type: 'like',
      });
      return;
    }
    const unsubscribeUrl = buildUnsubscribeUrl(user.id, 'likes');
    if (user.email) {
      await sendLikeAlertEmail(user.email, unsubscribeUrl);
    } else if (user.phone) {
      await sendLikeAlertSms(user.phone, unsubscribeUrl);
    }
  } catch (error) {
    console.error('[LikeAlert] Échec :', error);
  }
}
