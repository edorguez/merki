export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function toCentsNullable(amount: number | null): number | null {
  return amount === null ? null : Math.round(amount * 100);
}

export function fromCentsNullable(cents: number | null): number | null {
  return cents === null ? null : cents / 100;
}

interface HasPrices {
  priceBs: number;
  priceUsd: number;
}

export function transformPrices<T extends HasPrices>(obj: T): T {
  return {
    ...obj,
    priceBs: fromCents(obj.priceBs),
    priceUsd: fromCents(obj.priceUsd),
  };
}
