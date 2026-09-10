/**
 * OCR parser regression tests.
 *
 * Run from the `mobile/` directory:
 *   npx ts-node --transpile-only \
 *     --compiler-options '{"module":"commonjs","moduleResolution":"node"}' \
 *     scripts/ocr.regression.ts
 *
 * Covers the fixes for the three reported labels plus the prior scanner fixes
 * (dollar-symbol split, "#" price, Ref.KG weight, single-block dual currency)
 * to guard against regressions.
 */
import { parseRecognizedText, type TextBlock } from '../lib/ocrParser';

const RATE = 808.08;

function block(text: string, h: number, top: number): TextBlock {
  const lines = text.split('\n').map(t => ({
    text: t,
    frame: { left: 0, top, right: 200, bottom: top + h },
    recognizedLanguages: [],
    elements: [{ text: t, frame: { left: 0, top, right: 200, bottom: top + h } }],
  }));
  return {
    text,
    frame: { left: 0, top, right: 200, bottom: top + h },
    recognizedLanguages: [],
    lines,
  };
}

function blocks(...specs: Array<[string, number]>): TextBlock[] {
  return specs.map(([text, h], i) => block(text, h, i * 100));
}

interface Expectation {
  productName?: string | null;
  priceUsd?: number;
  priceBs?: number;
  currency?: 'BS' | 'USD';
  price?: number;
}

interface Case {
  name: string;
  blocks: TextBlock[];
  expect: Expectation;
}

const cases: Case[] = [
  {
    name: 'image 1 — huevos (name with 15UND + REF price)',
    blocks: blocks(['HUEVOS X 15UND\nREF. 3.30', 81.2]),
    expect: { productName: 'HUEVOS X 15UND', priceUsd: 3.3, currency: 'USD' },
  },
  {
    name: 'image 2 — pan arabe (name with 6UND, total price)',
    blocks: blocks(
      ['OD00: 180027 07IO8/2026', 35.3],
      ['7597827000106', 43],
      ['PAN ARABE PITER 6UND CLASIC0', 54.8],
      ['REF# 1.94 IVA O e REF# 9.00', 38.6],
      ['Total PEF# 1.94', 60]
    ),
    expect: {
      productName: 'PAN ARABE PITER 6UND CLASIC0',
      priceUsd: 1.94,
      currency: 'USD',
    },
  },
  {
    name: 'image 3 — toston (Bs total + USD ref, IVA ignored)',
    blocks: blocks(
      ['759187400051 5', 38.5],
      ['TOSTON TOM 140GR NATURAL', 50.8],
      ['PMVP: 1,588.29 + IVA: 254.13', 37.2],
      ['TOTAL', 32],
      ['Bs.', 50],
      ['1.842,42/Ref:2,28', 69]
    ),
    expect: {
      productName: 'TOSTON TOM 140GR NATURAL',
      priceBs: 1842.42,
      priceUsd: 2.28,
    },
  },
  {
    name: 'prior — dollar glyph split from number ($ + 3.T7)',
    blocks: blocks(['$', 60], ['3.T7', 60]),
    expect: { priceUsd: 3.77, currency: 'USD' },
  },
  {
    name: 'prior — "#" price on a weight block is kept',
    blocks: blocks(['Crema ... 170Gr\n# 2.24', 40]),
    expect: { productName: 'Crema ... 170Gr', priceUsd: 2.24, currency: 'USD' },
  },
  {
    name: 'prior — single-block dual currency',
    blocks: blocks(['BS. 13.221,07/REF:21,41', 50]),
    expect: { priceBs: 13221.07, priceUsd: 21.41, currency: 'BS' },
  },
  {
    name: 'prior — weight label uses PRECIO TOTAL, not Ref.KG',
    blocks: blocks(
      ['QUESO AMARILLO', 50],
      ['PRECIO KG', 30],
      ['Ref.KG 12.50', 30],
      ['PRECIO TOTAL', 30],
      ['7.73', 55]
    ),
    expect: { priceUsd: 7.73 },
  },
  {
    name: 'prior — 0.385 kg weight never treated as a price',
    blocks: blocks(['CARNE MOLIDA', 50], ['0.385 kg', 35], ['TOTAL', 30], ['4,33', 55]),
    expect: { priceUsd: 4.33 },
  },
  {
    name: 'prior — bare integer fallback',
    blocks: blocks(['ARROZ', 50], ['TOTAL', 30], ['25', 55]),
    expect: { priceUsd: 25, currency: 'USD' },
  },
];

function approx(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005;
}

let failures = 0;

for (const c of cases) {
  const text = c.blocks.map(b => b.text).join('\n');
  const result = parseRecognizedText(text, c.blocks, RATE);
  const problems: string[] = [];

  const e = c.expect;
  if (e.productName !== undefined && result.productName !== e.productName) {
    problems.push(
      `productName expected ${JSON.stringify(e.productName)} got ${JSON.stringify(result.productName)}`
    );
  }
  if (e.currency !== undefined && result.currency !== e.currency) {
    problems.push(`currency expected ${e.currency} got ${result.currency}`);
  }
  if (e.price !== undefined && !approx(result.price, e.price)) {
    problems.push(`price expected ${e.price} got ${result.price}`);
  }
  if (e.priceUsd !== undefined && !approx(result.priceUsd, e.priceUsd)) {
    problems.push(`priceUsd expected ${e.priceUsd} got ${result.priceUsd}`);
  }
  if (e.priceBs !== undefined && !approx(result.priceBs, e.priceBs)) {
    problems.push(`priceBs expected ${e.priceBs} got ${result.priceBs}`);
  }

  if (problems.length > 0) {
    failures += 1;
    console.error(`FAIL  ${c.name}`);
    for (const p of problems) console.error(`        ${p}`);
  } else {
    console.log(`PASS  ${c.name}`);
  }
}

console.log('');
if (failures > 0) {
  throw new Error(`${failures} OCR regression case(s) failed`);
}
console.log(`All ${cases.length} OCR regression cases passed.`);
