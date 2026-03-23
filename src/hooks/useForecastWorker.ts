// ═══ Hook : useForecastWorker ═══
// Exécute generateForecast36Months dans un Web Worker.
// Fallback automatique sur le thread principal si Worker indisponible.

import { useState, useEffect, useRef, useCallback } from 'react';
import { generateForecast36Months, type MonthForecast } from '../engines/convergence';
import type { NumerologyProfile } from '../engines/numerology';
import type { ChineseZodiac } from '../engines/chinese-zodiac';
import type { AstroChart } from '../engines/astrology';
import type { ForecastWorkerRequest, ForecastWorkerResponse } from '../workers/forecast.worker';

interface ForecastResult {
  forecast: MonthForecast[];
  loading: boolean;
  durationMs: number | null;
  workerUsed: boolean;
}

export function useForecastWorker(
  bd: string,
  num: NumerologyProfile,
  cz: ChineseZodiac,
  astro: AstroChart | null,
  transitBonus: number = 0,
): ForecastResult {
  const [forecast, setForecast] = useState<MonthForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [workerUsed, setWorkerUsed] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  // Stable serialized deps key to trigger recompute
  const depsKey = `${bd}_${num.lp.v}_${cz.animal}_${transitBonus}`;

  const fallback = useCallback(() => {
    setLoading(true);
    const t0 = performance.now();
    setTimeout(() => {
      try {
        const result = generateForecast36Months(bd, num, cz, new Date(), transitBonus, astro);
        setForecast(result);
        setDurationMs(Math.round(performance.now() - t0));
        setWorkerUsed(false);
      } catch (e) {
        console.error('Forecast fallback error:', e);
        setForecast([]);
      }
      setLoading(false);
    }, 0);
  }, [bd, num, cz, astro, transitBonus]);

  useEffect(() => {
    setLoading(true);

    // Try Worker first
    try {
      const worker = new Worker(
        new URL('../workers/forecast.worker.ts', import.meta.url),
        { type: 'module' },
      );
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent<ForecastWorkerResponse | { type: string; error: string }>) => {
        if (e.data.type === 'forecast-result') {
          const resp = e.data as ForecastWorkerResponse;
          setForecast(resp.data);
          setDurationMs(resp.durationMs);
          setWorkerUsed(true);
          setLoading(false);
        } else if (e.data.type === 'forecast-error') {
          console.warn('Worker error, falling back:', (e.data as any).error);
          fallback();
        }
        worker.terminate();
        workerRef.current = null;
      };

      worker.onerror = () => {
        console.warn('Worker creation failed, falling back to main thread');
        worker.terminate();
        workerRef.current = null;
        fallback();
      };

      const msg: ForecastWorkerRequest = {
        type: 'compute-forecast',
        bd, num, cz, transitBonus, astro,
      };
      worker.postMessage(msg);
    } catch {
      // Worker not supported or import.meta.url issue
      fallback();
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [depsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { forecast, loading, durationMs, workerUsed };
}
