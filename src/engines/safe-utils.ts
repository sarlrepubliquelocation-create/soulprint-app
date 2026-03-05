// ══════════════════════════════════════════════════════════
// ═══ SAFE UTILS — Sprint AG (Cas limites & robustesse) ═══
// ══════════════════════════════════════════════════════════
// Utilitaires défensifs réutilisés par tous les engines.
// Zéro dépendance, zéro side-effect.

/**
 * Parse et valide une date YYYY-MM-DD.
 * Retourne un Date à midi UTC, ou null si invalide.
 * Couvre : format incorrect, mois 0/13, jour 0/32, 30 février, etc.
 */
export function safeParseDateStr(s: unknown): Date | null {
  if (typeof s !== 'string') return null;
  // Format strict YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;

  const [yStr, mStr, dStr] = s.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const d = parseInt(dStr, 10);

  // Bornes basiques
  if (y < 1900 || y > 2200) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;

  // Construire la date et vérifier le round-trip (détecte 31 février, etc.)
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null; // le navigateur a "corrigé" la date → invalide
  }

  return date;
}

/**
 * Même logique mais retourne un Date en heure locale à midi.
 * Utile pour les calculs astronomiques qui attendent du local.
 */
export function safeParseDateLocal(s: unknown): Date | null {
  if (typeof s !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;

  const [yStr, mStr, dStr] = s.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const d = parseInt(dStr, 10);

  if (y < 1900 || y > 2200) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;

  const date = new Date(y, m - 1, d, 12, 0, 0);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }

  return date;
}

/**
 * Division sûre : retourne fallback si diviseur est 0 ou résultat non-fini.
 */
export function safeDiv(numerator: number, denominator: number, fallback: number = 0): number {
  if (denominator === 0 || !isFinite(denominator)) return fallback;
  const result = numerator / denominator;
  return isFinite(result) ? result : fallback;
}

/**
 * Garde NaN/Infinity : retourne fallback si valeur non-finie.
 */
export function safeNum(value: number, fallback: number = 0): number {
  return isFinite(value) ? value : fallback;
}

/**
 * parseInt sûr avec radix 10 et fallback.
 */
export function safeInt(s: string, fallback: number = 0): number {
  const n = parseInt(s, 10);
  return isNaN(n) ? fallback : n;
}

/**
 * Accès array sûr avec fallback.
 */
export function safeArrayGet<T>(arr: T[], index: number, fallback: T): T {
  if (index < 0 || index >= arr.length) return fallback;
  return arr[index] ?? fallback;
}
