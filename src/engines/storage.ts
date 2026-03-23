/**
 * storage.ts — Wrapper localStorage avec TTL et nettoyage automatique
 *
 * Résout l'audit #15 : clés sans expiration, resonance_log qui grandit,
 * clés date-based (inclusionBadgeDismissed_*) qui s'accumulent.
 *
 * Usage :
 *   import { sto } from './storage';
 *   sto.set('key', data, 30);          // expire dans 30 jours
 *   const val = sto.get<MyType>('key'); // null si expiré
 *   sto.cleanup();                      // purge les clés expirées
 */

const TTL_SUFFIX = '__ttl';

/** Vérifie si une clé a un TTL expiré */
function isExpired(key: string): boolean {
  const ttlRaw = localStorage.getItem(key + TTL_SUFFIX);
  if (!ttlRaw) return false; // Pas de TTL = pas d'expiration (clés legacy)
  return Date.now() > parseInt(ttlRaw, 10);
}

export const sto = {
  /**
   * Lit une valeur JSON du localStorage (null si absente ou expirée)
   */
  get<T = unknown>(key: string): T | null {
    if (isExpired(key)) {
      localStorage.removeItem(key);
      localStorage.removeItem(key + TTL_SUFFIX);
      return null;
    }
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    try { return JSON.parse(raw) as T; }
    catch { return raw as unknown as T; }
  },

  /**
   * Lit une valeur brute (string) du localStorage (null si absente ou expirée)
   */
  getRaw(key: string): string | null {
    if (isExpired(key)) {
      localStorage.removeItem(key);
      localStorage.removeItem(key + TTL_SUFFIX);
      return null;
    }
    return localStorage.getItem(key);
  },

  /**
   * Écrit une valeur avec TTL optionnel (en jours)
   * Sans ttlDays → pas d'expiration (permanent)
   */
  set(key: string, value: unknown, ttlDays?: number): void {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, serialized);
    if (ttlDays !== undefined) {
      localStorage.setItem(key + TTL_SUFFIX, String(Date.now() + ttlDays * 86400000));
    }
  },

  /** Supprime une clé + son TTL */
  remove(key: string): void {
    localStorage.removeItem(key);
    localStorage.removeItem(key + TTL_SUFFIX);
  },

  /**
   * Purge toutes les clés expirées + clés date-based orphelines.
   * À appeler au démarrage de l'app (App.tsx useEffect).
   */
  cleanup(): void {
    const toRemove: string[] = [];
    const now = Date.now();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // 1. Purge TTL expirées
      if (key.endsWith(TTL_SUFFIX)) {
        const ttlVal = parseInt(localStorage.getItem(key) || '0', 10);
        if (ttlVal > 0 && now > ttlVal) {
          const dataKey = key.slice(0, -TTL_SUFFIX.length);
          toRemove.push(key, dataKey);
        }
        continue;
      }

      // 2. Purge clés date-based > 7 jours
      //    Pattern: inclusionBadgeDismissed_YYYY-MM-DD, k_synced_YYYY-MM-DD
      const dateMatch = key.match(/_(\d{4}-\d{2}-\d{2})$/);
      if (dateMatch) {
        const keyDate = dateMatch[1];
        if (keyDate < todayStr) {
          // Garder la clé d'hier (pour blind check-in), purger le reste
          const daysDiff = Math.floor((today.getTime() - new Date(keyDate + 'T00:00:00').getTime()) / 86400000);
          if (daysDiff > 2) {
            toRemove.push(key);
          }
        }
      }
    }

    for (const key of toRemove) {
      localStorage.removeItem(key);
    }

    if (toRemove.length > 0 && import.meta.env.DEV) {
      console.log(`[storage] cleanup: ${toRemove.length} clés purgées`);
    }
  },
};
