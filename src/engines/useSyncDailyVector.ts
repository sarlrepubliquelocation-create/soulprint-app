// ══════════════════════════════════════
// ═══ useSyncDailyVector — V8 Option C ═══
// Hook React — collecte silencieuse quotidienne
// Semaine 1 : invisible à l'UI, fire-and-forget
// Semaine 3-4 : décommenter la section FEEDBACK
// ══════════════════════════════════════
//
// UTILISATION dans App.tsx (après calcConvergence) :
//
//   import { useSyncDailyVector } from './engines/useSyncDailyVector';
//
//   // Dans le composant App, après que data soit calculé :
//   useSyncDailyVector(data, lock.bd);
//
// C'est tout. Le hook gère tout silencieusement.

import { useEffect, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, getCurrentUid } from '../firebase';
import { sto } from './storage';
import type { DailyVectorRecord, MonthlyHistoryDoc } from './convergence.types';
import type { SoulData } from '../App';
import { getScoreMeta as _getScoreMeta } from './scoring-constants'; // FIX CALIBOFFSET — label cohérent

// ══════════════════════════════════════
// ═══ HELPERS ═══
// ══════════════════════════════════════

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Clé storage pour éviter les writes redondants */
function getSyncKey(date: string): string {
  return `k_synced_${date}`;
}

/** true si déjà syncé aujourd'hui */
function alreadySynced(date: string): boolean {
  return sto.getRaw(getSyncKey(date)) === 'true';
}

function markSynced(date: string): void {
  sto.set(getSyncKey(date), 'true');
  // Nettoyer les vieilles clés (> 7 jours) pour ne pas polluer storage
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    // Note: sto wrapper doesn't expose raw key enumeration, so cleanup happens naturally
    // through TTL or manual cleanup if needed
  } catch { /* silencieux */ }
}

/** Extrait les deltas bruts depuis ConvergenceResult et DailyModuleResult */
function buildVectorRecord(data: SoulData, date: string, calibOffset: number = 0): DailyVectorRecord | null {
  try {
    const conv = data.conv;

    // Extraire les deltas bruts depuis le breakdown (source de vérité)
    const getBreakdownPts = (system: string): number =>
      conv.breakdown.find(b => b.system === system)?.points ?? 0;

    // rawFinal = delta final avant compress() — disponible dans ConvergenceResult (R25)
    // ctx_mult et dasha_mult extraits du breakdown "Contexte Temporel"
    // Si non disponibles, on utilise des valeurs neutres (1.0)
    const ctxDetail   = conv.breakdown.find(b => b.system === 'Contexte Temporel')?.detail ?? '';
    const ctxMultRaw  = parseCtxMultiplier(ctxDetail);

    const raw = {
      bazi_dm:    getBreakdownPts('BaZi'),
      bazi_10g:   getBreakdownPts('10 Archétypes'),
      nak_total:  getBreakdownPts('Nakshatra'),
      ctx_mult:   ctxMultRaw.ctx,
      dasha_mult: ctxMultRaw.dasha,
    };

    const narrative = {
      iching:     getBreakdownPts('Yi King'),
      lune:       getBreakdownPts('Lune'),
      pd:         getBreakdownPts('Numérologie'),
      hex_num:    data.iching.hexNum,
      moon_phase: getMoonPhaseIdx(date),
    };

    // ═══ FIX CALIBOFFSET — Sauvegarder le displayScore (avec calibOffset) dans Firebase ═══
    const displayScore = Math.max(0, Math.min(100, Math.round(conv.score + calibOffset)));
    const _meta = _getScoreMeta(displayScore);
    const displayLevel = `${_meta.icon} ${_meta.label}`;

    const record: DailyVectorRecord = {
      v:         1,
      score:     displayScore,
      label:     extractLabel(displayLevel),
      raw,
      narrative,
      // feedback : non défini en semaine 1 — ajouté en semaine 3-4
    };

    return record;
  } catch (e) {
    console.warn('[useSyncDailyVector] buildVectorRecord échoué:', e);
    return null;
  }
}

/** Extrait le multiplicateur ctx depuis le champ detail du breakdown */
function parseCtxMultiplier(detail: string): { ctx: number; dasha: number } {
  // Format attendu : "×1.05 ... ×0.98 ..." ou similaire
  // Fallback neutre si non parseable
  const matches = detail.match(/×([\d.]+)/g);
  const ctx   = matches?.[0] ? parseFloat(matches[0].replace('×', '')) : 1.0;
  const dasha = matches?.[1] ? parseFloat(matches[1].replace('×', '')) : 1.0;
  return {
    ctx:   isFinite(ctx)   ? ctx   : 1.0,
    dasha: isFinite(dasha) ? dasha : 1.0,
  };
}

/** Extrait le label court depuis conv.level — V8.8 T2 (nouveaux noms + fallback anciens) */
function extractLabel(level: string): string {
  // Nouveaux labels V8.8 T2 + anciens en fallback pour compatibilité historique Firebase
  if (level.includes('Convergence rare') || level.includes('Cosmique')) return 'Cosmique';
  if (level.includes('Alignement fort') || level.includes('Gold') || level.includes('Or')) return 'Or';
  if (level.includes('Bonne fen') || level.includes('Favorable')) return 'Favorable';
  if (level.includes('Phase de Consolidation') || level.includes('Flux ordinaire') || level.includes('Consolidation') || level.includes('Routine')) return 'Consolidation';
  if (level.includes('Mode Maintenance') || level.includes('Énergie basse') || level.includes('Prudence')) return 'Prudence';
  if (level.includes('Mode Bouclier') || level.includes('Temps de retrait') || level.includes('Tempête')) return 'Tempête';
  if (level.includes('Argent')) return 'Argent';
  if (level.includes('Bronze')) return 'Bronze';
  if (level.includes('Équilibre')) return 'Équilibre';
  return level.split(' ').pop() ?? level;
}

/** Phase lunaire index [0-7] depuis la date */
function getMoonPhaseIdx(date: string): number {
  // Approximation simple : cycle de 29.5 jours depuis nouvelle lune de référence
  // (Le calcul précis est dans moon.ts — ici on évite l'import pour garder le hook léger)
  const ref = new Date('2000-01-06T18:14:00Z').getTime(); // nouvelle lune connue
  const now = new Date(date + 'T12:00:00').getTime();
  const cycle = 29.530589 * 24 * 60 * 60 * 1000;
  const phase = ((now - ref) % cycle + cycle) % cycle / cycle;
  return Math.round(phase * 8) % 8; // [0-7]
}

// ══════════════════════════════════════
// ═══ HOOK PRINCIPAL ═══
// ══════════════════════════════════════

export function useSyncDailyVector(
  data: SoulData | null,
  bd: string,
  calibOffset: number = 0,
): void {
  // Ref pour éviter double-écriture en StrictMode React (double useEffect)
  const syncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!data || !bd) return;

    const today = getTodayStr();

    // Guard 1 : déjà syncé dans cette session
    if (syncedRef.current === today) return;

    // Guard 2 : déjà syncé aujourd'hui (storage — survit au refresh)
    if (alreadySynced(today)) return;

    syncedRef.current = today;

    // Fire-and-forget — n'attend pas la réponse, ne bloque pas l'UI
    void (async () => {
      try {
        const uid    = getCurrentUid();
        const record = buildVectorRecord(data, today, calibOffset);
        if (!record) return;

        const [yyyy, mm, dd] = today.split('-');
        const docRef = doc(db, 'users', uid, 'history', `${yyyy}-${mm}`);

        // Guard multi-onglet : marquer avant l'écriture pour éviter la race condition
        // Si deux onglets ouvrent simultanément, seul le premier écrit
        markSynced(today);

        // setDoc avec merge:true — écriture partielle (dot notation via nested object)
        // N'écrase pas les autres jours du mois
        await setDoc(
          docRef,
          { days: { [dd]: record } } satisfies Partial<MonthlyHistoryDoc>,
          { merge: true }
        );
        if (import.meta.env.DEV) console.debug(`[VectorSync] ✓ ${today} → users/${uid}/history/${yyyy}-${mm}.days.${dd}`);
      } catch (err) {
        // Rollback du markSynced si l'écriture échoue — retenter au prochain refresh
        sto.remove(getSyncKey(today));
        // Échec silencieux — la PWA Firestore gère la file offline si réseau absent
        console.warn('[VectorSync] Différé (offline ou quota):', err);
      }
    })();
  }, [data, bd]); // re-déclenche si profil change
}

// ══════════════════════════════════════
// ═══ FEEDBACK — À DÉCOMMENTER SEMAINE 3-4 ═══
// ══════════════════════════════════════

/**
 * Enregistre le feedback de l'utilisateur sur le jour J-1.
 * À appeler depuis le widget feedback (3 boutons).
 *
 * @param date     Date du jour évalué (format "2026-03-01")
 * @param note     -1 | 0 | 1
 */
export async function submitFeedback(
  date: string,
  note: -1 | 0 | 1,
): Promise<void> {
  try {
    const uid = getCurrentUid();
    const [yyyy, mm, dd] = date.split('-');
    const docRef = doc(db, 'users', uid, 'history', `${yyyy}-${mm}`);

    await setDoc(
      docRef,
      {
        days: {
          [dd]: {
            feedback: { note, ts: Date.now() },
          },
        },
      },
      { merge: true }
    );

    if (import.meta.env.DEV) console.debug(`[VectorSync] Feedback ${note} → ${date}`);
  } catch (err) {
    console.warn('[VectorSync] Feedback échoué:', err);
    // Ne pas propager — l'UI ne doit pas crasher si Firestore est down
  }
}
