import { safeGetItem, safeSetItem } from './storage';
import { detectCurrencyFromText, extractPriceFromText, guessCurrencyFromPrice } from './priceText';

export { detectCurrencyFromText, extractPriceFromText, guessCurrencyFromPrice };

const DEFAULT_EXCHANGE_RATE = 55;
const BCV_RATE_KEY = '@merki_bcv_rate';

interface BCVStorageEntry {
  usdRate: number;
  eurRate: number;
}

export async function getExchangeRate(): Promise<number> {
  try {
    const stored = await safeGetItem(BCV_RATE_KEY);
    if (stored) {
      const parsed: BCVStorageEntry = JSON.parse(stored);
      if (parsed.usdRate > 0) {
        return parsed.usdRate;
      }
    }
  } catch {
    // fall through
  }

  return DEFAULT_EXCHANGE_RATE;
}

export async function setExchangeRate(rate: number): Promise<void> {
  if (rate <= 0) {
    throw new Error('Exchange rate must be positive');
  }
  const entry: BCVStorageEntry = {
    usdRate: rate,
    eurRate: 0,
  };
  await safeSetItem(BCV_RATE_KEY, JSON.stringify(entry));
}

/**
 * Convert BS to USD using current exchange rate
 */
export async function convertBsToUsd(bsAmount: number): Promise<number> {
  const rate = await getExchangeRate();
  if (rate <= 0) return bsAmount;
  return bsAmount / rate;
}

/**
 * Convert USD to BS using current exchange rate
 */
export async function convertUsdToBs(usdAmount: number): Promise<number> {
  const rate = await getExchangeRate();
  if (rate <= 0) return 0;
  return usdAmount * rate;
}

/**
 * Synchronous version using a provided exchange rate
 * Useful when you already have the rate cached
 */
export function convertBsToUsdSync(bsAmount: number, exchangeRate: number): number {
  return bsAmount / exchangeRate;
}

/**
 * Synchronous version using a provided exchange rate
 */
export function convertUsdToBsSync(usdAmount: number, exchangeRate: number): number {
  return usdAmount * exchangeRate;
}

/**
 * Format BS amount with Venezuelan formatting
 */
export function formatBs(amount: number): string {
  return `Bs ${amount.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format USD amount with Venezuelan formatting
 */
export function formatUsd(amount: number): string {
  return `$ ${amount.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
