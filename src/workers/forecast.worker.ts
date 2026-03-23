// ═══ Kaironaute — Web Worker : Forecast 36 mois ═══
// Décharge le thread principal des ~1080 appels calcDayPreview.
// Vite bundle automatiquement toutes les dépendances dans le worker.

import { generateForecast36Months } from '../engines/convergence';
import type { NumerologyProfile } from '../engines/numerology';
import type { ChineseZodiac } from '../engines/chinese-zodiac';
import type { AstroChart } from '../engines/astrology';

export interface ForecastWorkerRequest {
  type: 'compute-forecast';
  bd: string;
  num: NumerologyProfile;
  cz: ChineseZodiac;
  transitBonus: number;
  astro: AstroChart | null;
}

export interface ForecastWorkerResponse {
  type: 'forecast-result';
  data: ReturnType<typeof generateForecast36Months>;
  durationMs: number;
}

self.addEventListener('message', (e: MessageEvent<ForecastWorkerRequest>) => {
  if (e.data.type === 'compute-forecast') {
    const t0 = performance.now();
    try {
      const result = generateForecast36Months(
        e.data.bd,
        e.data.num,
        e.data.cz,
        new Date(),
        e.data.transitBonus,
        e.data.astro,
      );
      const resp: ForecastWorkerResponse = {
        type: 'forecast-result',
        data: result,
        durationMs: Math.round(performance.now() - t0),
      };
      self.postMessage(resp);
    } catch (err) {
      self.postMessage({
        type: 'forecast-error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
});
