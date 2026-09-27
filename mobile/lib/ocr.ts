import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat, type Action } from 'expo-image-manipulator';
import { getExchangeRate } from '../utils/currency';
import { convertBsToUsd } from '../utils/formatters';
import { detectCurrencyFromText, extractPriceFromText } from '../utils/priceText';
import {
  parseRecognizedText,
  type ScanResult,
  type TextBlock,
  type TextRecognitionResult,
} from './ocrParser';

export type { ScanResult } from './ocrParser';

type RecognizeTextFn = (imageUri: string) => Promise<TextRecognitionResult>;

let recognizeTextImpl: RecognizeTextFn | null = null;

async function loadMLKit(): Promise<RecognizeTextFn | null> {
  if (recognizeTextImpl) return recognizeTextImpl;
  try {
    const { recognizeText } = await import('@infinitered/react-native-mlkit-text-recognition');
    recognizeTextImpl = recognizeText;
    return recognizeTextImpl;
  } catch {
    if (__DEV__) console.warn('[OCR] ML Kit not available');
    return null;
  }
}

// Never fabricate a product: when OCR is unavailable the caller must run the
// manual-entry flow instead of silently adding a fake item.
function noRecognitionResult(warning: string): ScanResult {
  return {
    productName: null,
    price: 0,
    currency: 'BS',
    priceBs: 0,
    priceUsd: 0,
    confidence: 0,
    warning,
  };
}

// Dev-only fixture, opt-in via EXPO_PUBLIC_OCR_MOCK=1. Never used in release.
async function mockScanImage(_imageUri: string): Promise<ScanResult> {
  await new Promise(resolve => setTimeout(resolve, 800));

  const exchangeRate = await getExchangeRate();
  const priceBs = 25.5;
  const priceUsd = convertBsToUsd(priceBs, exchangeRate);

  return {
    productName: 'Arroz Paddy',
    price: priceBs,
    currency: 'BS',
    priceBs,
    priceUsd,
    confidence: 0.95,
  };
}

export async function preprocessImage(
  uri: string,
  crop?: { originX: number; originY: number; width: number; height: number }
): Promise<string> {
  try {
    const actions: Action[] = [];
    if (crop) actions.push({ crop });
    actions.push({ resize: { width: 1200 } });
    const result = await manipulateAsync(uri, actions, {
      compress: 0.8,
      format: SaveFormat.JPEG,
    });
    return result.uri;
  } catch {
    return uri;
  }
}

export async function rotateImage(
  uri: string,
  degrees: number
): Promise<{ uri: string; width: number; height: number }> {
  const result = await manipulateAsync(uri, [{ rotate: degrees }], {
    compress: 0.9,
    format: SaveFormat.JPEG,
  });
  return { uri: result.uri, width: result.width, height: result.height };
}

export async function scanImage(imageUri: string): Promise<ScanResult> {
  const fileInfo = await FileSystem.getInfoAsync(imageUri);
  if (!fileInfo.exists) {
    return noRecognitionResult('No se pudo encontrar la imagen. Intenta nuevamente.');
  }

  const enhancedUri = await preprocessImage(imageUri);

  const recognizer = await loadMLKit();
  let text: string;
  let blocks: TextBlock[];

  if (recognizer) {
    const result = await recognizer(enhancedUri);
    text = result.text;
    blocks = result.blocks;
  } else if (__DEV__ && process.env.EXPO_PUBLIC_OCR_MOCK === '1') {
    return mockScanImage(imageUri);
  } else {
    return noRecognitionResult('No se pudo iniciar el reconocimiento de texto. Intenta de nuevo.');
  }

  const exchangeRate = await getExchangeRate();
  return parseRecognizedText(text, blocks, exchangeRate);
}

export { detectCurrencyFromText, extractPriceFromText };

export default {
  scanImage,
  preprocessImage,
  rotateImage,
  detectCurrencyFromText,
  extractPriceFromText,
};
