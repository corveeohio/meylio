import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type PurchasesPackage } from 'react-native-purchases';

const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const PREMIUM_ENTITLEMENT_ID = 'Meylio Pro';

let configuredUserId: string | null = null;

export function isPurchasesSupported() {
  return Platform.OS === 'ios' && !!REVENUECAT_IOS_KEY;
}

export async function configurePurchases(userId: string) {
  if (!isPurchasesSupported() || configuredUserId === userId) return;

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }
  Purchases.configure({ apiKey: REVENUECAT_IOS_KEY!, appUserID: userId });
  configuredUserId = userId;
}

export async function getPremiumPackage(): Promise<PurchasesPackage | null> {
  if (!isPurchasesSupported()) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.current?.monthly ?? offerings.current?.availablePackages[0] ?? null;
}

export async function purchasePremium(pkg: PurchasesPackage): Promise<boolean> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return !!customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID];
}

export async function isPremiumActive(): Promise<boolean> {
  if (!isPurchasesSupported()) return false;
  const customerInfo = await Purchases.getCustomerInfo();
  return !!customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID];
}
