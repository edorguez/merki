/**
 * Block-aware OCR parsing. Pure logic (no React Native / Expo imports) so it
 * can be regression-tested in Node. The ML Kit recognition, image handling and
 * file-system concerns live in `lib/ocr.ts`.
 */
import { convertBsToUsd, convertUsdToBs } from '../utils/formatters';
import {
  detectCurrencyFromText,
  extractPriceFromText,
  guessCurrencyFromPrice,
} from '../utils/priceText';

export interface ScanResult {
  productName: string | null;
  price: number;
  currency: 'BS' | 'USD';
  priceBs: number;
  priceUsd: number;
  confidence: number;
  warning?: string;
}

export interface TextBlock {
  text: string;
  frame: { left: number; top: number; right: number; bottom: number };
  recognizedLanguages: string[];
  lines: {
    text: string;
    frame: { left: number; top: number; right: number; bottom: number };
    recognizedLanguages: string[];
    elements: {
      text: string;
      frame: { left: number; top: number; right: number; bottom: number };
    }[];
  }[];
}

export interface TextRecognitionResult {
  text: string;
  blocks: TextBlock[];
}

function isLikelyNoise(text: string): boolean {
  if (text.length < 3) return true;
  // 6+ consecutive digits (barcodes, serials, codes)
  if (/\d{6,}/.test(text)) return true;
  // Dates: 20-06-26, 20/06/2026, 20.06.26
  if (/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/.test(text)) return true;
  // Package / quantity lines are only noise when the whole line is the
  // quantity spec ("1 empaque", "15 UND"). Product names legitimately contain
  // unit tokens ("HUEVOS X 15UND", "PAN ARABE PITER 6UND CLASIC0"), so a line
  // that merely contains one must not be discarded.
  if (/^\s*\d+(?:[.,]\d+)?\s*(empaque|paquete|pieza|unid|und|unidad(?:es)?)\s*$/i.test(text)) {
    return true;
  }
  // Meta keywords at the start of a line (labels, codes, registry info).
  // Test on the original text so word boundaries hold (e.g. "EMPAQUE VENCE",
  // "Total Reft").
  if (
    /^(lote|fab|venc|fecha|serial|cod|ref|empaque|contenido|registro|ruc|nit|peso|neto|cont|hecho|elaborado|distribuido|importado|total)\b/i.test(
      text
    )
  )
    return true;
  // Pure digits / punctuation (no letters at all)
  if (!/[a-záéíóúñü]/i.test(text)) return true;
  return false;
}

function avgElementHeight(block: TextBlock): number {
  const heights: number[] = [];
  for (const line of block.lines) {
    for (const el of line.elements) {
      if (el.frame && el.frame.bottom != null && el.frame.top != null) {
        heights.push(el.frame.bottom - el.frame.top);
      }
    }
  }
  if (heights.length === 0) return 0;
  return heights.reduce((a, b) => a + b, 0) / heights.length;
}

function isSmallPrint(block: TextBlock, threshold: number): boolean {
  const h = avgElementHeight(block);
  if (h === 0) return false;
  return h < threshold;
}

function hasPricePatternOnly(text: string): boolean {
  const cleaned = text.replace(/\s/g, '');
  return /^\d+[.,]\d{2}$/.test(cleaned) || /^[\d{2,6}$]/.test(cleaned);
}

function collectProductNameLines(blocks: TextBlock[], anchorIndex: number): string[] {
  if (anchorIndex < 0) return [];
  const result: string[] = [];

  const anchorFontSize = avgElementHeight(blocks[anchorIndex]);

  for (const line of blocks[anchorIndex].lines) {
    const t = line.text.trim();
    if (!isLikelyNoise(t) && !extractPriceFromText(t) && !detectCurrencyFromText(t)) {
      result.push(t);
    }
  }

  const checkAdjacent = (idx: number) => {
    if (idx < 0 || idx >= blocks.length) return;
    const adjFontSize = avgElementHeight(blocks[idx]);
    if (adjFontSize === 0 || anchorFontSize === 0) return;
    if (Math.abs(adjFontSize - anchorFontSize) / anchorFontSize > 0.4) return;
    for (const line of blocks[idx].lines) {
      const t = line.text.trim();
      if (!isLikelyNoise(t) && !extractPriceFromText(t) && !detectCurrencyFromText(t)) {
        if (idx < anchorIndex) {
          result.unshift(t);
        } else {
          result.push(t);
        }
      }
    }
  };

  checkAdjacent(anchorIndex - 1);
  checkAdjacent(anchorIndex + 1);

  return result;
}

function extractLenientPrice(text: string): number | null {
  const cleaned = text.trim();
  if (/^\d{2,6}$/.test(cleaned)) {
    return parseInt(cleaned, 10);
  }
  return null;
}

// ML Kit sometimes merges several prices into one block (e.g. "7.73 4,33" =
// per-kg price + total). The total usually comes last, so prefer the last
// 2-decimal number in a block over the first one.
function extractLastPriceFromText(text: string): number | null {
  const matches = text.match(/\d{1,3}(?:[.,]\d{3})*[.,]\d{2}/g);
  if (!matches || matches.length === 0) return null;
  const last = matches[matches.length - 1];
  const normalized = last
    .replace(',', '.')
    .replace(/\.(?=\d{3})/g, '')
    .replace(/,/g, '');
  const price = parseFloat(normalized);
  return isNaN(price) ? null : price;
}

// ML Kit misreads digit-like glyphs on low-contrast labels ("3.77" -> "3.T7",
// "0.88" -> "O.88"). Fix the most common confusions inside price-like tokens.
function normalizeOcrDigits(text: string): string {
  return text.replace(/[TOloI]/g, ch => {
    switch (ch) {
      case 'T':
        return '7';
      case 'O':
      case 'o':
        return '0';
      case 'I':
      case 'l':
        return '1';
      default:
        return ch;
    }
  });
}

// Lenient fallback that tolerates OCR digit/separator misreads, so a token
// like "3.T7" still yields 3.77. Keeps the "last 2-decimal number wins" rule
// of extractLastPriceFromText. Only matches real prices: "0.385" (weight) is
// not a 2-decimal value, so it never qualifies.
function extractLenientPriceFromText(text: string): number | null {
  const tokens = text.match(/\d[\d.,TIloO]*/g);
  if (!tokens || tokens.length === 0) return null;
  let best: number | null = null;
  for (const raw of tokens) {
    const cleaned = normalizeOcrDigits(raw).replace(/,/g, '.');
    const match = cleaned.match(/\d{1,3}(?:\.\d{3})*\.\d{2}(?!\d)/);
    if (match) {
      const price = parseFloat(match[0]);
      if (!isNaN(price) && price > 0) best = price;
    }
  }
  return best;
}

// Try the strict parser first, then the OCR-tolerant one.
function extractAnyPrice(text: string): number | null {
  return extractLastPriceFromText(text) ?? extractLenientPriceFromText(text);
}

// ML Kit sometimes splits a large currency glyph from its number ("$" and
// "3.T7" become separate blocks). This block has no price of its own but
// should be recombined with the adjacent number block.
function isLoneCurrencySymbol(text: string): boolean {
  const t = text.trim();
  if (t.length === 0 || /\d/.test(t)) return false;
  return detectCurrencyFromText(t) !== null || t === '#';
}

// "Ref" is a price label (Ref. KG = price/kg, Total Ref = total price), not
// always a currency indicator. Only treat the detected currency as real when
// it isn't a bare "Ref" without an explicit Bs / $ / USD in the same text.
function hasRealCurrency(text: string, currency: 'BS' | 'USD' | null): boolean {
  if (currency === null) return false;
  const hasBs = /\bbs\.?\b/i.test(text);
  const hasExplicitUsd = /\$|\busd\b/i.test(text);
  const refOnly = /\bref\.?\b/i.test(text) && !hasBs && !hasExplicitUsd;
  return !refOnly;
}

function parseDecimal(s: string): number {
  const normalized = s
    .replace(',', '.')
    .replace(/\.(?=\d{3})/g, '')
    .replace(/,/g, '');
  return parseFloat(normalized);
}

// Labels sometimes print both prices on one line: "BS. 13.221,07/REF:21,41".
// Detect that and return both real amounts so we don't convert one into the
// other (which would misinterpret the dollar REF price as bolívares).
function extractDualCurrencyPrices(text: string): { bs: number; usd: number } | null {
  const hasBs = /\bbs\.?\b/i.test(text);
  const hasUsd = /\bref\.?\b|\$|usd/i.test(text);
  if (!hasBs || !hasUsd) return null;

  const bsMatch = text.match(/\bbs\.?\s*:?\s*(\d[\d.,]*)/i);
  const usdMatch =
    text.match(/\bref\.?\s*:?\s*(\d[\d.,]*)/i) ||
    text.match(/\$\s*(\d[\d.,]*)/i) ||
    text.match(/\busd\s*:?\s*(\d[\d.,]*)/i);
  if (!bsMatch || !usdMatch) return null;

  const bs = parseDecimal(bsMatch[1]);
  const usd = parseDecimal(usdMatch[1]);
  if (isNaN(bs) || isNaN(usd) || bs <= 0 || usd <= 0) return null;
  return { bs, usd };
}

// The bolívar total and the USD reference can also share a single line without
// an explicit "Bs" marker: "1.842,42/Ref:2,28". Return both so we don't convert
// one into the other.
function extractBsRefPair(text: string): { bs: number; usd: number } | null {
  const match = text.match(/(\d[\d.,]*)\s*\/\s*ref\.?\s*:?\s*(\d[\d.,]*)/i);
  if (!match) return null;
  const bs = parseDecimal(match[1]);
  const usd = parseDecimal(match[2]);
  if (isNaN(bs) || isNaN(usd) || bs <= 0 || usd <= 0) return null;
  return { bs, usd };
}

// A price candidate found by the parsing helpers below.
interface PriceCandidate {
  price: number;
  currency: 'BS' | 'USD' | null;
  sourceText: string;
  blockIndex: number;
}

const PROXIMITY_RANGE = 2;

// Finds the product name block: the biggest-font block of natural text. The
// product name is almost always the largest text on the label, so font size is
// the primary signal; text length only breaks ties.
function findProductBlockIndex(sortedBlocks: TextBlock[], globalAvgHeight: number): number {
  let productBlockIndex = -1;
  let productBlockScore = -1;
  for (let i = 0; i < sortedBlocks.length; i++) {
    const block = sortedBlocks[i];
    let textLength = 0;
    let words = 0;
    for (const line of block.lines) {
      const t = line.text.trim();
      if (
        t.length >= 3 &&
        !isLikelyNoise(t) &&
        !extractPriceFromText(t) &&
        !detectCurrencyFromText(t)
      ) {
        textLength += t.length;
        words += t.split(/\s+/).filter(Boolean).length;
      }
    }
    if (textLength < 5 || words < 2) continue;

    const fontHeight = avgElementHeight(block);
    if (fontHeight <= 0) continue;

    const ratio = fontHeight / globalAvgHeight;
    const score = Math.round(ratio * 1000) + Math.min(textLength, 100);

    if (score > productBlockScore) {
      productBlockScore = score;
      productBlockIndex = i;
    }
  }
  return productBlockIndex;
}

// Scores every block as a price candidate — prefer large font and explicit
// currency, penalize weights and per-kg "Ref" lines — and returns the best one
// (with a proximity bonus to the product name block).
function findBestPriceBlock(
  sortedBlocks: TextBlock[],
  productBlockIndex: number,
  globalAvgHeight: number,
  smallPrintThreshold: number
): PriceCandidate | null {
  let detectedPrice: number | null = null;
  let detectedCurrency: 'BS' | 'USD' | null = null;
  let priceSourceText = '';
  let bestBlockIndex = -1;
  let bestPriceScore = -99;

  // Weight-based labels (deli / meat / cheese) print both a per-kg price and
  // a final "PRECIO TOTAL". The header itself has no price, so the "total"
  // keyword bonus below never fires on it. Detect those headers (tolerating
  // OCR misreads like "TƠTAL") so the price closest to them wins.
  const totalLabelIndices = sortedBlocks
    .map((block, i) =>
      /\bT.{0,2}TAL\b/i.test(block.text) && extractAnyPrice(block.text) === null ? i : -1
    )
    .filter(i => i >= 0);

  // Scores one price candidate. Text may come from a single block or from a
  // currency-symbol block recombined with its adjacent number block.
  const scoreCandidate = (
    text: string,
    fontHeight: number,
    idx: number,
    price: number,
    currency: 'BS' | 'USD' | null
  ): number => {
    const realCurrency = hasRealCurrency(text, currency);
    let score = 0;

    score += 3;
    // Explicit currency ($ / Bs) is the strongest signal of the real price.
    if (realCurrency) score += 8;
    if (/\d{6,}/.test(text)) score -= 2;
    if (text.length < 4) score -= 1;
    // Bare integers are less likely the final price than 2-decimal prices.
    if (/^\d{2,6}$/.test(text)) score -= 2;
    if (/[.,]\d{2}(?!\d)/.test(text)) score += 2;
    // Weight / quantity lines ("0.440 kg", "60 kg") are not prices. Include
    // common ML Kit misreads of "kg" (e.g. "ko", "kq"). A block that also
    // carries a "#" price marker (e.g. "Crema ... 170Gr\n# 2.24") is a real
    // price, so it must not be penalized.
    if (/\b\d+(?:[.,]\d+)?\s*(kg|kgs|ko|kq|g|gr|ml|l|lb|oz)\b/i.test(text) && !/#/.test(text)) {
      score -= 25;
    }
    // Per-kg reference price ("Ref.KG", "Ref .KG") is not the product price.
    if (/\bref\.?\s*(kg|g|lb|kilo)\b/i.test(text)) {
      return -Infinity;
    }

    // Tax / IVA lines ("+ IVA 254.13", "Impuesto") are never the final total.
    if (/\b(iva|i\.v\.a|impuesto)\b/i.test(text)) {
      score -= 15;
    }

    // Font size heuristic: small-print blocks get penalized, larger fonts get
    // a proportional bonus. The final price on a label is almost always the
    // biggest number, so the font weight is deliberately the dominant signal
    // (larger than every other bonus/penalty combined).
    if (fontHeight > 0 && fontHeight < smallPrintThreshold) {
      score -= 3;
    } else if (fontHeight > 0) {
      const ratio = fontHeight / globalAvgHeight;
      // Proportional font bonus: bigger font = higher score
      score += Math.round(15 * ratio);
    }

    // Penalize bare price-only lines (likely unit price / tax, not final)
    if (!realCurrency && hasPricePatternOnly(text)) {
      score -= 1;
    }

    // Bonus for "Total"/"Total Ref" keyword — the final total price.
    if (/total/i.test(text)) {
      score += 5;
    }

    // Strong proximity bonus to the product name block.
    if (productBlockIndex >= 0) {
      const dist = Math.abs(idx - productBlockIndex);
      if (dist <= PROXIMITY_RANGE) {
        score += (PROXIMITY_RANGE - dist + 1) * 3;
      }
    }

    // The price block nearest to a "PRECIO TOTAL" header is the final price;
    // give it a large bonus so it always beats the per-kg price next to it.
    for (const totalIdx of totalLabelIndices) {
      const dist = Math.abs(idx - totalIdx);
      if (dist <= 3) {
        score += (4 - dist) * 5;
      }
    }

    return score;
  };

  // Registers a candidate if it beats the current best.
  const consider = (text: string, fontHeight: number, idx: number) => {
    const price = extractAnyPrice(text);
    if (price === null) return;
    const currency = detectCurrencyFromText(text);
    const score = scoreCandidate(text, fontHeight, idx, price, currency);
    if (score > bestPriceScore) {
      bestPriceScore = score;
      detectedPrice = price;
      detectedCurrency = hasRealCurrency(text, currency) ? currency : null;
      priceSourceText = text;
      bestBlockIndex = idx;
    }
  };

  for (let i = 0; i < sortedBlocks.length; i++) {
    const block = sortedBlocks[i];
    const blockText = block.text.trim();
    const fontHeight = avgElementHeight(block);

    consider(blockText, fontHeight, i);

    // ML Kit split the big currency glyph from its number ("$" + "3.T7").
    // Recombine them so "$ 3.77" becomes a candidate at the symbol's font size.
    if (isLoneCurrencySymbol(blockText) && i + 1 < sortedBlocks.length) {
      const next = sortedBlocks[i + 1];
      const nextPrice = extractAnyPrice(next.text);
      if (nextPrice !== null) {
        consider(
          `${blockText} ${next.text.trim()}`,
          Math.max(fontHeight, avgElementHeight(next)),
          i + 1
        );
      }
    }
  }

  // Lenient price fallback on blocks near the product block (bare integers).
  if (detectedPrice === null) {
    for (let i = 0; i < sortedBlocks.length; i++) {
      if (isSmallPrint(sortedBlocks[i], smallPrintThreshold)) continue;
      const nakedPrice = extractLenientPrice(sortedBlocks[i].text);
      if (nakedPrice !== null) {
        const dist = productBlockIndex >= 0 ? Math.abs(i - productBlockIndex) : 0;
        if (productBlockIndex < 0 || dist <= PROXIMITY_RANGE + 1) {
          detectedPrice = nakedPrice;
          priceSourceText = sortedBlocks[i].text.trim();
          bestBlockIndex = i;
          break;
        }
      }
    }
  }

  if (detectedPrice === null) return null;
  return {
    price: detectedPrice,
    currency: detectedCurrency,
    sourceText: priceSourceText,
    blockIndex: bestBlockIndex,
  };
}

// Fallback: parse the raw OCR text line by line for a price.
function findFlatTextPrice(text: string): PriceCandidate | null {
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  let detectedPrice: number | null = null;
  let detectedCurrency: 'BS' | 'USD' | null = null;
  let priceSourceText = '';

  for (const line of lines) {
    const price = extractPriceFromText(line);
    const currency = detectCurrencyFromText(line);
    if (price !== null) {
      detectedPrice = price;
      detectedCurrency = currency;
      priceSourceText = line;
      if (currency) break;
    }
  }

  if (detectedPrice !== null && !detectedCurrency) {
    for (const line of lines) {
      const currency = detectCurrencyFromText(line);
      if (currency) {
        detectedCurrency = currency;
        break;
      }
    }
  }

  // Lenient fallback in flat text too
  if (detectedPrice === null) {
    for (const line of lines) {
      const nakedPrice = extractLenientPrice(line);
      if (nakedPrice !== null) {
        detectedPrice = nakedPrice;
        priceSourceText = line;
        break;
      }
    }
  }

  if (detectedPrice === null) return null;
  return {
    price: detectedPrice,
    currency: detectedCurrency,
    sourceText: priceSourceText,
    blockIndex: -1,
  };
}

// Last-resort fallback: ML Kit sometimes drops the last digit of a price (e.g.
// "4.33" → "4.3"). Accept the largest-font 1-2 decimal number that is not a
// weight nor a per-kg reference.
function findLenientBlockPrice(
  sortedBlocks: TextBlock[],
  smallPrintThreshold: number
): PriceCandidate | null {
  let bestLenientIndex = -1;
  let bestLenientHeight = 0;
  for (let i = 0; i < sortedBlocks.length; i++) {
    const block = sortedBlocks[i];
    if (isSmallPrint(block, smallPrintThreshold)) continue;
    const t = block.text.trim();
    if (/\b\d+(?:[.,]\d+)?\s*(kg|g|gr|ml|l|lb|oz)\b/i.test(t)) continue;
    if (/\bref\.?\s*(kg|g|lb|kilo)\b/i.test(t)) continue;
    const matches = t.match(/\d{1,3}(?:[.,]\d{1,2})/g);
    if (!matches || matches.length === 0) continue;
    const m = matches[matches.length - 1];
    const val = parseFloat(m.replace(',', '.'));
    if (isNaN(val) || val <= 0) continue;
    const h = avgElementHeight(block);
    if (h > bestLenientHeight) {
      bestLenientHeight = h;
      bestLenientIndex = i;
    }
  }
  if (bestLenientIndex >= 0) {
    const t = sortedBlocks[bestLenientIndex].text.trim();
    const matches = t.match(/\d{1,3}(?:[.,]\d{1,2})/g);
    if (matches && matches.length > 0) {
      const m = matches[matches.length - 1];
      return {
        price: parseFloat(m.replace(',', '.')),
        currency: null,
        sourceText: t,
        blockIndex: bestLenientIndex,
      };
    }
  }
  return null;
}

/**
 * Parses recognized OCR text/blocks into a scan result.
 *
 * @param text Raw text returned by ML Kit.
 * @param blocks Block layout returned by ML Kit.
 * @param exchangeRate BCV USD rate used to convert between currencies.
 */
export function parseRecognizedText(
  text: string,
  blocks: TextBlock[],
  exchangeRate: number
): ScanResult {
  if (!text || text.trim().length === 0) {
    return {
      productName: null,
      price: 0,
      currency: 'BS',
      priceBs: 0,
      priceUsd: 0,
      confidence: 0,
      warning: 'No se pudo leer la etiqueta. Acerca la cámara y asegura buena iluminación.',
    };
  }

  // ── Block-aware parsing ──────────────────────────────────────────
  const sortedBlocks = [...blocks].sort((a, b) => a.frame.top - b.frame.top);

  // Compute global average font size for small-print threshold
  const globalAvgHeight =
    sortedBlocks.reduce((sum, b) => sum + avgElementHeight(b), 0) / sortedBlocks.length;
  const SMALL_PRINT_THRESHOLD = globalAvgHeight * 0.6;

  // Find the product name block (biggest-font natural text).
  const productBlockIndex = findProductBlockIndex(sortedBlocks, globalAvgHeight);

  // Price selection: best scored block, then flat-text parsing, then a lenient
  // large-font fallback.
  const priceCandidate =
    findBestPriceBlock(sortedBlocks, productBlockIndex, globalAvgHeight, SMALL_PRINT_THRESHOLD) ??
    findFlatTextPrice(text) ??
    findLenientBlockPrice(sortedBlocks, SMALL_PRINT_THRESHOLD);

  const detectedPrice: number | null = priceCandidate?.price ?? null;
  let detectedCurrency: 'BS' | 'USD' | null = priceCandidate?.currency ?? null;
  const priceSourceText = priceCandidate?.sourceText ?? '';
  const bestBlockIndex = priceCandidate?.blockIndex ?? -1;

  // ── Magnitude heuristic ──────────────────────────────────────────
  if (detectedPrice !== null && !detectedCurrency) {
    detectedCurrency = guessCurrencyFromPrice(detectedPrice, priceSourceText);
  }
  if (!detectedCurrency) detectedCurrency = 'BS';

  if (detectedPrice === null) {
    return {
      productName: null,
      price: 0,
      currency: detectedCurrency,
      priceBs: 0,
      priceUsd: 0,
      confidence: 0.3,
      warning: 'No se detectó un precio. Asegúrate de que el precio esté visible.',
    };
  }

  // ── Product name ──────────────────────────────────────────────────
  let productName: string | null = null;
  const nameLines = collectProductNameLines(sortedBlocks, productBlockIndex);
  if (nameLines.length > 0) {
    productName = nameLines.join(' ');
  }

  // ── Currency conversion ───────────────────────────────────────────
  let priceBs: number;
  let priceUsd: number;

  // Labels sometimes show both prices on one line ("BS. 13.221,07/REF:21,41"
  // or "1.842,42/Ref:2,28"). When that happens, use both real prices instead of
  // converting one.
  const dualPrices =
    extractDualCurrencyPrices(priceSourceText) ?? extractBsRefPair(priceSourceText);
  if (dualPrices) {
    priceBs = dualPrices.bs;
    priceUsd = dualPrices.usd;
  } else if (detectedCurrency === 'BS') {
    priceBs = detectedPrice;
    priceUsd = convertBsToUsd(detectedPrice, exchangeRate);
  } else {
    priceUsd = detectedPrice;
    priceBs = convertUsdToBs(detectedPrice, exchangeRate);
  }

  // ── Confidence ────────────────────────────────────────────────────
  const totalElements = blocks.reduce(
    (sum, b) => sum + b.lines.reduce((s, l) => s + l.elements.length, 0),
    0
  );

  let confidence = 0.4;
  if (totalElements >= 3) confidence += 0.1;
  if (totalElements >= 5) confidence += 0.1;
  if (blocks.length >= 2) confidence += 0.05;
  if (bestBlockIndex >= 0) confidence += 0.1;
  if (productBlockIndex >= 0) confidence += 0.05;
  // Bonus if price block has large font (confirmed main price)
  if (bestBlockIndex >= 0 && !isSmallPrint(sortedBlocks[bestBlockIndex], SMALL_PRINT_THRESHOLD)) {
    confidence += 0.05;
  }
  // Bonus for multi-line product name (more info captured)
  if (nameLines.length >= 2) confidence += 0.05;

  confidence = Math.round(Math.min(0.95, Math.max(0.3, confidence)) * 100) / 100;

  // ── Debug (temporary) ─────────────────────────────────────────────
  console.log('[OCR] blocks:');
  sortedBlocks.forEach((b, i) => {
    console.log(
      `  [${i}] h=${Math.round(avgElementHeight(b) * 10) / 10} name=${i === productBlockIndex} price=${i === bestBlockIndex} text="${b.text}"`
    );
  });
  console.log('[OCR] result:', {
    productName,
    price: detectedPrice,
    currency: detectedCurrency,
    priceBs,
    priceUsd,
    confidence,
  });

  return {
    productName,
    price: detectedPrice,
    currency: detectedCurrency,
    priceBs,
    priceUsd,
    confidence,
  };
}
