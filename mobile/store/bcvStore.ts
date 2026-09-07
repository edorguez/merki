import { useEffect, useSyncExternalStore } from 'react';
import { getBCVRates } from '../services/bcvService';
import { safeGetItem, safeSetItem } from '../utils/storage';

const STORAGE_KEY = '@merki_bcv_rate';

function localDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface BCVRateData {
  createdAt: string;
  usdRate: number;
  eurRate: number;
}

interface StoreEntry {
  usdRate: number;
  eurRate: number;
  createdAt: string;
  lastFetched: string;
}

interface BCVState {
  rate: BCVRateData | null;
  isLoading: boolean;
  error: Error | null;
}

export interface BCVRateRef {
  refresh: () => Promise<void>;
}

let state: BCVState = {
  rate: null,
  isLoading: true,
  error: null,
};

const listeners = new Set<() => void>();

function emit(next: BCVState): void {
  state = next;
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): BCVState {
  return state;
}

let fetching = false;
let loadedOnce = false;

export async function loadRate(force = false): Promise<void> {
  if (fetching) return;
  fetching = true;

  try {
    let cachedRate: BCVRateData | null = null;
    try {
      const cached = await safeGetItem(STORAGE_KEY);
      if (cached) {
        const parsed: StoreEntry = JSON.parse(cached);
        if (parsed.usdRate > 0) {
          cachedRate = {
            createdAt: parsed.createdAt,
            usdRate: parsed.usdRate,
            eurRate: parsed.eurRate,
          };
        }
      }
    } catch {
      // ignore parse errors, fetch fresh
    }

    if (cachedRate && !state.rate) {
      emit({ ...state, rate: cachedRate });
    }

    if (!force && loadedOnce && state.rate) return;

    emit({ ...state, isLoading: true, error: state.rate ? state.error : null });

    try {
      const response = await getBCVRates();
      if (response.success) {
        const data: StoreEntry = {
          usdRate: response.data.usdRate / 100,
          eurRate: response.data.eurRate / 100,
          createdAt: response.data.createdAt,
          lastFetched: localDateStr(),
        };
        await safeSetItem(STORAGE_KEY, JSON.stringify(data));
        emit({
          rate: {
            createdAt: response.data.createdAt,
            usdRate: data.usdRate,
            eurRate: data.eurRate,
          },
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      const nextError = err instanceof Error ? err : new Error('Failed to load BCV rate');
      emit({
        ...state,
        isLoading: false,
        error: state.rate ? state.error : nextError,
      });
    }
  } finally {
    fetching = false;
    loadedOnce = true;
  }
}

export const refresh = async (): Promise<void> => {
  await loadRate(true);
};

export function useBCV() {
  const current = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    loadRate();
  }, []);

  return {
    rate: current.rate,
    isLoading: current.isLoading,
    error: current.error,
    refresh,
    loadRate,
  };
}
