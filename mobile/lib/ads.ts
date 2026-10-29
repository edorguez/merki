import { Platform } from 'react-native';

const env = (key: string): string | undefined => process.env[key];

function pick(
  android: string | undefined,
  ios: string | undefined,
  androidFallback: string,
  iosFallback: string
) {
  return (
    Platform.select({
      android: android ?? androidFallback,
      ios: ios ?? iosFallback,
    }) ?? androidFallback
  );
}

/** Unity Ads Game ID (Monetization → Apps → app settings). */
export const UNITY_GAME_ID = pick(
  env('EXPO_PUBLIC_UNITY_GAME_ID_ANDROID'),
  env('EXPO_PUBLIC_UNITY_GAME_ID_IOS'),
  '800417099',
  '800417100'
);

/** Banner placement, also used for the 300x250 MREC in the feeds. */
export const BANNER_PLACEMENT_ID = pick(
  env('EXPO_PUBLIC_UNITY_BANNER_PLACEMENT_ANDROID'),
  env('EXPO_PUBLIC_UNITY_BANNER_PLACEMENT_IOS'),
  'BP_Banner_Android',
  'BP_Banner_IOS'
);

export const INTERSTITIAL_PLACEMENT_ID = pick(
  env('EXPO_PUBLIC_UNITY_INTERSTITIAL_PLACEMENT_ANDROID'),
  env('EXPO_PUBLIC_UNITY_INTERSTITIAL_PLACEMENT_IOS'),
  'BP_Interstitial_Android',
  'BP_Interstitial_IOS'
);
