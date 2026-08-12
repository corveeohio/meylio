import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type PurchasesPackage } from 'react-native-purchases';

const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
const PREMIUM_ENTITLEMENT_ID = 'Meylio Pro';

let configuredUserId: string | null = null;

function getPlatformKey(): string | undefined {
  if (Platform.OS === 'ios') return REVENUECAT_IOS_KEY;
  if (Platform.OS === 'android') return REVENUECAT_ANDROID_KEY;
  return undefined;
}

export function isPurchasesSupported() {
  return !!getPlatformKey();
}

export async function configurePurchases(userId: string) {
  const apiKey = getPlatformKey();
  if (!apiKey || configuredUserId === userId) return;

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }
  Purchases.configure({ apiKey, appUserID: userId });
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

export async function restorePurchases(): Promise<boolean> {
  const customerInfo = await Purchases.restorePurchases();
  return !!customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID];
}
