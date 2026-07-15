export function isPremiumActive(user: { subscriptionStatus: string; premiumUntil?: Date | null }): boolean {
  if (user.subscriptionStatus !== 'premium') return false;
  if (!user.premiumUntil) return true;
  return user.premiumUntil.getTime() > Date.now();
}
