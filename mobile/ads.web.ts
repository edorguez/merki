// Web stub for `react-native-google-mobile-ads`.
// Metro (and webpack) redirect the bare package import to this file on web so
// the native-only `codegenNativeComponent` internal is never bundled for web.
// Ads are mobile-only: every API here is a no-op.

export const TestIds = {
  APP_OPEN: 'ca-app-pub-3940256099942544/9257395921',
  BANNER: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
  INTERSTITIAL_VIDEO: 'ca-app-pub-3940256099942544/8691691433',
  REWARDED: 'ca-app-pub-3940256099942544/5224354917',
  REWARDED_INTERSTITIAL: 'ca-app-pub-3940256099942544/5354046379',
  NATIVE: 'ca-app-pub-3940256099942544/2247696110',
  NATIVE_VIDEO: 'ca-app-pub-3940256099942544/1044960115',
};

export const BannerAdSize = {
  BANNER: 'BANNER',
  ADAPTIVE_BANNER: 'ADAPTIVE_BANNER',
  ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER',
};

export const AdEventType = {
  LOADED: 'loaded',
  ERROR: 'error',
  OPENED: 'opened',
  CLOSED: 'closed',
  CLICKED: 'clicked',
};

export function BannerAd() {
  return null;
}

export class InterstitialAd {
  loaded = false;

  static createForAdRequest() {
    return new InterstitialAd();
  }

  load() {}

  show() {}

  addAdEventListener() {
    return () => {};
  }
}

export class NativeAd {
  static async createForAdRequest() {
    return new NativeAd();
  }

  destroy() {}
}

export function NativeAdView() {
  return null;
}

export function NativeMediaView() {
  return null;
}

export function NativeAsset() {
  return null;
}

export function MobileAds() {
  return {
    initialize: async () => [],
    setRequestConfiguration: async () => {},
  };
}

export const NativeAssetType = {
  ADVERTISER: 'advertiser',
  BODY: 'body',
  CALL_TO_ACTION: 'callToAction',
  HEADLINE: 'headline',
  PRICE: 'price',
  STORE: 'store',
  STAR_RATING: 'starRating',
  ICON: 'icon',
  IMAGE: 'image',
};
