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
  try {
    await window.AdMobBridge?.showInterstitial?.();
  } catch {
    // Ads are optional; never block or crash the game when an ad is unavailable.
  }
}

export async function showRewardedHintAd(): Promise<boolean> {
  if (!ADS_ENABLED || typeof window === "undefined") return false;
  try {
    // The native bridge must resolve true only after the rewarded callback fires.
    return Boolean(await window.AdMobBridge?.showRewarded?.());
  } catch {
    return false;
  }
}

export function adModeLabel(): string {
  return ADS_ENABLED ? "الإعلانات مفعّلة" : "وضع التطوير: الإعلانات متوقفة";
}
