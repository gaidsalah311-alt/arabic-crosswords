declare global {
  interface Window {
    AdMobBridge?: {
      showInterstitial?: () => Promise<void> | void;
      showRewarded?: () => Promise<boolean> | boolean;
    };
  }
}

/**
 * WebDev يبقى بلا أسرار أو خدمات خارجية. عند تغليف التطبيق Native يمكن للغلاف
 * حقن AdMobBridge واستدعاء Google Mobile Ads، بينما يظل التطوير Offline بلا إعلانات.
 */
export const ADS_ENABLED = import.meta.env.VITE_ADMOB_ENABLED === "true";

export async function showInterstitialAd(): Promise<void> {
  if (!ADS_ENABLED || typeof window === "undefined") return;
  await window.AdMobBridge?.showInterstitial?.();
}

export async function showRewardedHintAd(): Promise<boolean> {
  if (!ADS_ENABLED || typeof window === "undefined") return false;
  return Boolean(await window.AdMobBridge?.showRewarded?.());
}

export function adModeLabel(): string {
  return ADS_ENABLED ? "الإعلانات مفعّلة" : "وضع التطوير: الإعلانات متوقفة";
}
