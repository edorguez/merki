/**
 * Pure text/price parsing helpers with no React Native dependencies so they
 * can be reused by the OCR parser and unit-tested in a Node environment.
 */

/**
 * Detect currency from text
 * Returns 'BS', 'USD', or null
 * Uses word-boundary regex to avoid false positives on noise text.
 */
export function detectCurrencyFromText(text: string): 'BS' | 'USD' | null {
  const upper = text.toUpperCase();

  if (/\b(BS\.?(?:F\.?)?|BSF|BF|BOL[IÍ]VAR(?:ES)?)\b/.test(upper)) return 'BS';
  if (/\b(USD|U\$S|D[OÓ]LAR(?:ES)?|DLS|REF)\b/.test(upper)) return 'USD';
  if (/\b(EUR|EURO)\b/.test(upper)) return 'USD';
  if (/\$/.test(text)) return 'USD';

  return null;
}

/**
 * Guess currency from price magnitude and format.
 * Used as fallback when no keyword is found.
 * In Venezuelan context:
 *   - Prices >= 300 or with thousand separators → BS
 *   - Small prices ≤ 50 → likely USD
 */
export function guessCurrencyFromPrice(price: number, rawText: string): 'BS' | 'USD' | null {
  const hasThousandSeparator = /\.(?=\d{3})/.test(rawText);
  if (hasThousandSeparator || price >= 300) return 'BS';
  if (price <= 100) return 'USD';
  return null;
}

/**
 * Extract price value from text
 * Handles Venezuelan formatting (comma as decimal separator)
 */
export function extractPriceFromText(text: string): number | null {
  // Match numbers with optional thousand separators and decimal part
  const priceRegex = /(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/;
  const match = text.match(priceRegex);
  if (!match) return null;

  const priceStr = match[0];
  // Replace comma decimal separator with dot, remove thousand separators
  const normalized = priceStr
    .replace(',', '.')
    .replace(/\.(?=\d{3})/g, '')
    .replace(/,/g, '');

  const price = parseFloat(normalized);
  return isNaN(price) ? null : price;
}
