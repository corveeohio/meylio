const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

export async function sendPushNotification(
  pushToken: string | null | undefined,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  if (!pushToken) return;

  try {
    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: pushToken, title, body, data, sound: 'default' }),
    });
    const result = await response.json();
    if (result.data?.status === 'error') {
      console.error('[Push] Échec d’envoi :', result.data.message);
    }
  } catch (error) {
    console.error('[Push] Échec d’envoi :', error);
  }
}
