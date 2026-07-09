import jwt from 'jsonwebtoken';

export function generateAppleMusicDeveloperToken(): string {
  const teamId = process.env.APPLE_MUSIC_TEAM_ID;
  const keyId = process.env.APPLE_MUSIC_KEY_ID;
  const privateKey = process.env.APPLE_MUSIC_PRIVATE_KEY;

  if (!teamId || !keyId || !privateKey) {
    throw new Error('Apple Music credentials not configured');
  }

  return jwt.sign({}, privateKey.replace(/\\n/g, '\n'), {
    algorithm: 'ES256',
    expiresIn: '1h',
    issuer: teamId,
    header: { alg: 'ES256', kid: keyId },
  });
}
