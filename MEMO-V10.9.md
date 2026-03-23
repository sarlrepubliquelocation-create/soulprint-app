# MEMO Kaironaute V10.9 — Sprints O → X + fixes infra
> Moteur de scoring védique journalier TypeScript
> Protocole : zéro initiative · diff avant/après · 3 options + choix explicite · oracles obligatoires
> Dernière mise à jour : Ronde 9 Oracle/Compatibilité (20 correctifs · 4 sprints · conformité 100%)

---

## Architecture globale

```
L1 — convergence-daily.ts   → signal quotidien (BaZi ±15 / Lune ±16 / Éphem ±14)
L2 — convergence-slow.ts    → terrain (ctx.multiplier × dashaMultiplier) + synergies R21-R29
     astrology.ts            → calcPersonalTransits (transits gaussiens + stationFactor + retroFactor)
     interactions.ts         → règles R27, R29 (synergies inter-niveaux)
     panchanga.ts            → Graha Drishti, Yoga Kartari, combinedBala, Panchanga
```

### Groupes L1
| Groupe | Cap | Modules inclus |
|--------|-----|----------------|
| C_BAZI | ±15 | BaZi core, Changsheng, Na Yin, Jian Chu |
| C_LUNE | ±16 | Nakshatra, Tarabala, Chandrabala, ASV☽, Panchanga ±4, Graha Drishti, Yoga Kartari, VoC |
| C_EPHEM | ±14 | Transits gaussiens ±6, Étoiles Fixes ±5, Heure planétaire |

### LuneGate (Sprint P)
`luneGroupCapped ≥ +7 → ephemGroupPts × 1.06`
`luneGroupCapped ≤ −7 → ephemGroupPts × 0.92`

### Terrain L2
`terrain = ctx.multiplier × dashaMultiplier ∈ [0.51 ; 1.50]`
`capScale = max(0.85, min(1.00, 1 − 0.20 × |terrain−1|))` — Sprint Q
`delta_final = (dailyDeltaSnapshot × capScale + v6SynergyBonus) × ctx.multiplier × dashaMultiplier + offsetPts`

---

## Sprint O — Piliers FAIRE / LIER / ÊTRE

**Problème :** Les 3 piliers (FAIRE/LIER/ÊTRE) retournaient des valeurs aberrantes ou incohérentes.
**Fix :** Recalibration des poids domaines pour chaque pilier.
**Fichiers :** `convergence-daily.ts`, `domain-weights.ts`
**Oracles :** régression piliers validée

---

## Sprint P — combinedBala · LuneGate · AntaraDasha · SCIS

### combinedBala
Fusionne Tarabala + Chandrabala avec compression ×0.7 quand même signe :
```typescript
combinedBala(T, C) = T + 0.5×C  // signes opposés → annulation algébrique
                   = round((T+C) × 0.7)  // même signe → compression
```

### LuneGate
Modulateur Éphem basé sur le signal lunaire fort :
```typescript
luneGate = luneGroupCapped >= 7 ? 1.06 : luneGroupCapped <= -7 ? 0.92 : 1.00
ephemGroupPts = Math.round(ephemGroupPts × luneGate)
```

### AntaraDasha Activation (P2)
Si seigneur Nakshatra transit = seigneur Antardasha → ±1 amplifié
`delta += Math.sign(nakBk.points)` — capé ±1 exactement

### SCIS — Score Cohérence Inter-Systèmes (P2)
4 groupes (NUM / BaZi / Lune / Éphem) — si 3/4 ou 4/4 alignés → ±2
`if (Math.abs(sumSigns) >= 3) delta += sumSigns > 0 ? 2 : -2`

---

## Sprint Q — capScale(terrain) · DOMAIN_AFFINITY dynamique

### capScale
Atténue le signal L1 quand le terrain est extrême (évite empilement L1 fort + terrain fort) :
```typescript
capScale = max(0.85, min(1.00, 1 − 0.20 × |terrain−1|))
```
β=0.20 — consensus GPT Ronde 14

### DOMAIN_AFFINITY dynamique
Poids domaines recalculés dynamiquement selon le profil utilisateur au lieu de valeurs fixes.

---

## Sprint R — Neutralisation double-comptage Transits × Graha Drishti

**Problème :** Jupiter et Saturn présents dans TRANSIT_AMPLITUDES ET GRAHA_DRISHTI_ASPECTS → double-comptage sur la Lune natale.

**Fix (`convergence-daily.ts`) :**
```typescript
const DRISHTI_SLOW_R = new Set(['jupiter', 'saturn']);
const drOverlapR = personalTransits.breakdown
  .filter(b => DRISHTI_SLOW_R.has(b.transitPlanet) && (b as any).natalPoint === 'moon')
  .reduce((s, b) => s + b.score, 0);
astroPts = Math.max(-6, Math.min(6, Math.round(personalTransits.total - drOverlapR)));
```

**Oracles :** 36/36 → 3 nouveaux (drOverlap filter, vide=0, mars=0)

---

## Sprint S — R29 Seigneur Maha en transit fort

**Problème :** `dashaLordTransitScore` calculé mais jamais utilisé (R21 supprimée trop large).

**Fix (`interactions.ts`) :**
```typescript
// R29 — Seigneur de la Maha actif — Période et transit en phase
{
  id: 29,
  test: ctx => Math.abs(ctx.dashaLordTransitScore) >= 2
             && ['Jupiter', 'Vénus', 'Mercure', 'Lune'].includes(ctx.dashaLord ?? ''),
  bonusFn: ctx => Math.max(-3, Math.min(3, Math.round(ctx.dashaLordTransitScore * 0.60))),
  domains: ['BUSINESS', 'CREATIVITE', 'RELATIONS'],
}
```
Lords bénéfiques uniquement · seuil |score| ≥ 2 · clamp ±3 · 60% du score transit

**Oracles :** 36 → 39/39

---

## Sprint T — Double-comptages résiduels (2 fixes)

### Fix 1 — dashaLordTransitScore incluait encore Jupiter/Saturn→Moon
(`convergence-slow.ts`)
```typescript
const DRISHTI_SLOW_T = new Set(['jupiter', 'saturn']);
const dashaLordTransitScore = dashaLordKey
  ? _transitBreakdown
      .filter(b => b.transitPlanet === dashaLordKey
                && !(DRISHTI_SLOW_T.has(b.transitPlanet) && (b as any).natalPoint === 'moon'))
      .reduce((s, b) => s + b.score, 0)
  : 0;
```

### Fix 2 — Guard R27 × R29
Si profectionLord === dashaLord → R27 prend ownership → R29 neutralisé :
```typescript
const dashaLordTransitScoreForCtx = (dashaLordKey && profLordKey && dashaLordKey === profLordKey)
  ? 0
  : Math.round(dashaLordTransitScore);
```

**Oracles :** 39 → 42/42

---

## Sprint U — Calibration 5 modules (post 4 rondes IA)

> Processus : 4 rondes de confrontation GPT/Grok/Gemini + test empirique (Option B)
> Découverte clé : stationFactor est DISCRET {1.0, 1.3, 2.0} → threshold 1.65 ne bloque pas sf=1.3

### U1 — Étoiles Fixes cap ±8 → ±5 (`convergence-daily.ts`)
```typescript
ephemGroupPts += Math.max(-5, Math.min(5, fixedStarResult.total)); // Sprint U1
```

### U2 — I Ching tanh compression (`convergence-daily.ts`)
Réintroduit dans le delta (était supprimé V8) avec soft-clamp :
```typescript
const ichingCapped = Math.round(6 * Math.tanh(ichRes.pts / 6)); // Sprint U2
if (ichingCapped !== 0) delta += ichingCapped;
```
`pts=±9 → ±5` | `pts=±6 → ±5` | `pts=0 → 0` — direction préservée, queues compressées

### U3 — Panchanga cap ±4 explicite (`convergence-daily.ts`)
```typescript
luneGroupPts += Math.max(-4, Math.min(4, panchangaResult.total)); // Sprint U3
```

### U4 — retroFactor ×1.08 rétrogrades normales (`astrology.ts`)
```typescript
// stationFactor discret : 1.0 (normal) / 1.3 (quasi-station) / 2.0 (station totale)
// threshold 1.1 : bloque sf=1.3 ET sf=2.0, applique uniquement sf=1.0
const retroFactor = (planetSpeeds && planetSpeeds[tr.tp] !== undefined
                     && planetSpeeds[tr.tp] < 0 && sf < 1.1) ? 1.08 : 1.0;
const score = amplitude * natalMult * structuralMod * dignityMod * intensity * sf * retroFactor;
```
Ordre opérations : amplitude → natalMult → structuralMod → dignityMod → gaussian → stationFactor → retroFactor

### U5 — Nœuds Lunaires L2 (`convergence-slow.ts`)
```typescript
const rahuNatal    = astro.pl.find((p: any) => p.k === 'northNode');
const houseRahu    = rahuNatal?.h ?? 0;
const nodeLordScore = ([1, 4, 7, 10].includes(houseRahu) && eclipseNatalPts < 4) ? 3 : 0;
```
Rahu natal en kendra (1/4/7/10) → +3
Guard `eclipseNatalPts < 4` : évite double-comptage nœuds × éclipses
Ketu exclu (moksha/détachement — BPHS Ch.47 — annulation systématique si pair)
Placement L2 : accès à `eclipseNatalPts` + cohérence avec R27/R29

**Oracles :** 42 → 51/51 (U2×3 + U4×3 + U5×3)

---

## Règles de gouvernance actives

| Règle | Description |
|-------|-------------|
| Zéro initiative | Aucun changement sans choix explicite A/B/C |
| Read avant Edit | Toujours lire un fichier avant de l'éditer |
| Diff avant/après | Vérification `grep` systématique post-edit |
| Oracles obligatoires | Minimum 3 oracles par module · run complet avant commit |
| tsx@3.14.0 | `./node_modules/.bin/tsx scripts/regression-check.ts` (v4.x EPERM) |
| Pas de commit rouge | `❌ ÉCHEC ORACLE` bloque le commit |

---

## État des doubles-comptages audités

| Paire | Statut | Sprint |
|-------|--------|--------|
| Jupiter/Saturn transit gaussien × Graha Drishti → Lune | ✅ Neutralisé | R |
| dashaLordTransitScore incluait Jupiter/Saturn→Moon | ✅ Neutralisé | T Fix1 |
| R27 × R29 quand profectionLord = dashaLord | ✅ Neutralisé | T Fix2 |
| Yoga Kartari × Graha Drishti (maisons 2/12) | ✅ Aucun chevauchement | Audit T |

---

## Sprint V — Fix calcMeta (vraie moyenne)

**Problème :** `calcMeta = max(a,b) + 15%×min(a,b)` gonflait les scores meta de +8 à +12 pts.
**Fix (`ConvergenceTab.tsx`) :**
```typescript
const calcMeta = (a: number, b: number) => Math.round((a + b) / 2);
```
**Oracles :** +3 (51 → 54)

---

## Sprint W — Alignement domaines bas de page sur adjustDomain

**Problème :** 3 systèmes de normalisation incohérents — bas de page utilisait `d.score` engine brut au lieu d'`adjustDomain`.
**Fix (`ConvergenceTab.tsx`) :** section domaines bas de page recalcule inline avec adjustDomain :
```typescript
const _terrain = (cv.ctxMult ?? 1.0) * (cv.dashaMult ?? 1.0);
const _global  = cv.score ?? 50;
const _t1      = 50 + (d.score - 50) * _terrain;
const pct      = Math.max(5, Math.min(97, Math.round(_t1 * 0.60 + _global * 0.40)));
```
**Oracles :** +3 (54 → 57)

---

## Sprint X — Clamp routing nW [0.93, 1.07]

**Problème :** FAIRE=57 < global=64 — routing nW trop agressif (amplitude ±13%).
**Fix (`ConvergenceTab.tsx`) :**
```typescript
const nF = Math.max(0.93, Math.min(1.07, (wF / wTotal) * 3));
```
Amplitude réduite ±13% → ±7% · FAIRE=57 → FAIRE=61
**Oracles :** +4 (57 → 61)

---

## Fix crash — getLunarNodeTransit NaN

**Cause :** `getLunarNodeTransit(bd, todayStr)` sans try-catch → `calcNorthNodeLongitude(NaN)` → `SIGNS[NaN]` undefined → crash total de l'app.
**Fix (`convergence-daily.ts`) :**
```typescript
let nodeTransit: ReturnType<typeof getLunarNodeTransit> | null = null;
try { nodeTransit = getLunarNodeTransit(bd, todayStr); } catch { /* fail silently */ }
if (nodeTransit) { /* bloc switch/push/breakdown */ }
```
Type propagé dans `DailyModuleResult` et `ConvergenceResult` : `lunarNodes: LunarNodeTransit | null`

---

## Fix infra — HMR dev (Shift+R n'est plus nécessaire)

**Causes identifiées (3 couches) :**

| Cause | Fix | Fichier |
|-------|-----|---------|
| Service Worker `cache-first` interceptait index.html + assets en dev | SW désactivé en mode dev, désenregistrement auto | `src/main.tsx` |
| Vite 6 token crypto WebSocket — browser cache l'ancien client JS | `legacy.skipWebSocketTokenCheck: true` | `vite.config.ts` |
| Events FS Windows non détectés depuis la VM Linux | `watch: { usePolling: true, interval: 800 }` | `vite.config.ts` |

**Workflow validé :**
- `npm run dev` → modifications visibles en direct (plus de Shift+R)
- `git push` → sauvegarde GitHub uniquement
- `netlify deploy` → production seulement (économie crédits)

---

## Fix build Netlify — jieqi.ts non tracké

`src/engines/jieqi.ts` existait localement mais n'était pas dans git → build Netlify échouait.
Fix : `git add src/engines/jieqi.ts`

---

## Compteur oracles

| Sprint | Oracles ajoutés | Total cumulé |
|--------|-----------------|--------------|
| O→Q (sessions précédentes) | ~33 | 33 |
| Sprint R | +3 | 36 |
| Sprint S | +3 | 39 |
| Sprint T | +3 | 42 |
| Sprint U | +9 | 51 |
| Sprint V | +3 | 54 |
| Sprint W | +3 | 57 |
| Sprint X | +4 | **61/61** |

---

## Sprints Y — Cœur Unifié (Moteur tanh + Noyau védique)

> Référence paramètres : MEMO-Y0.md (N=50 000 jours, seed=10908)
> Protocole : shadow mode → validation → bascule production (Y5)

### Y0 ✅ — Calibration

Paramètres calibrés : A=36, k=0.840, bias=+5, MAX_DELTA=22
Caps P95 par module, terrain squashé, SCIS seuil, table Tithi → voir MEMO-Y0.md

---

### Y1 ✅ — Noyau védique `base_signal` en shadow

**Fichier :** `convergence-slow.ts`

```typescript
// base_signal = clamp(0.55×S_dasha + 0.40×S_nak + 0.05×S_tithi, -1, +1)
shadowBaseSignal = clamp(0.55*S_dasha + 0.40*S_nak + 0.05*S_tithi, -1, +1);
```

Table 30 Tithis (Grok Ronde 3) embarquée dans TITHI_SCORES.
Propagé : `ConvergenceResult.shadowBaseSignal?: number`

---

### Y2 ✅ — Formule tanh unifiée en shadow

**Fichier :** `convergence.ts`

```typescript
function calcShadowScore(finalDelta, ctxMult, dashaMult, shadowBaseSignal): number | undefined {
  const X          = clamp(finalDelta / 22, -2, +2);
  const terrain_sq = 1 + 0.25 * tanh((ctxMult*dashaMult - 1) / 0.35);
  const X_total    = X + 0.8 * (shadowBaseSignal ?? 0);
  return clamp(Math.round(50 + 36*tanh(0.840*X_total)*terrain_sq + 5), 0, 100);
}
```

Propagé : `ConvergenceResult.shadowScore?: number`

---

### Y3 ✅ — R32 + R33 + SCIS seuil 4/4

**Fichier :** `convergence-daily.ts` (R32, R33) + `convergence-slow.ts` (SCIS)

**R32** — Retour Nakshatra natal : `luneGroupPts += tarabala >= 2 ? 1.5 : 3.0` (~13j/an)

**R33** — Wu Xing ↔ Tattwa : `delta += dmTattwa === nakTattwa ? 1.5 : -1.0`
Correspondances : Bois=Vayu · Feu=Agni · Terre=Prithvi · Métal=Akasha · Eau=Jala

**SCIS Y3c** — Nouveau seuil : 4/4 alignés + 3+ groupes magnitude > 3.5 pts → ~15-18j/an (vs ~40-50j/an ancien)

---

### Y4 ✅ — UX : Posture + Triade IMPACT/RÉSONANCE/ANCRAGE + feedback shadow

**Fichiers :** `ConvergenceTab.tsx`, `FeedbackWidget.tsx`

5 postures (OFFENSIVE/ACTIVE/TACTIQUE/OBSERVATION/DÉFENSIVE) selon `actionReco.verb` + score global.
Triade 3 panneaux : IMPACT (meilleur domaine), RÉSONANCE (shadowBaseSignal + shadowScore), ANCRAGE (alerte/domaine faible).
FeedbackWidget : bandeau `🧪 Moteur Cœur` coloré selon |shadowScore − score| (vert ≤5, amber ≤12, rouge >12).

---

### Y5 ✅ — Bascule production

**Fichier :** `convergence.ts`

```typescript
// Remplace compress(finalDelta) — fallback silencieux si calcShadowScore() échoue
const _scoreY5 = calcShadowScore(finalDelta, ctxMult, dashaMult, shadowBaseSignal);
const score = _scoreY5 !== undefined
  ? Math.max(5, Math.min(97, _scoreY5))
  : Math.max(5, Math.min(97, compress(finalDelta)));
```
`compress()` conservée pour CI, yearly scores et baseline L1.

---

### Z1 ✅ — Nettoyage post-Y5

**Fichiers :** `convergence.ts`, `FeedbackWidget.tsx`

- `console.debug` supprimé dans `calcShadowScore` (loggait à chaque calcul)
- TODOs Sprint 2 obsolètes (lignes 68/892) → commentaires neutres
- Bandeau `🧪 Moteur Cœur (candidat)` désactivé dans FeedbackWidget (`shadowScore = score` depuis Y5)

---

### Z2-B ✅ — Observabilité groupes (Ronde Z consensus 3/3 Option B)

**Fichiers :** `convergence.types.ts`, `convergence-daily.ts`, `convergence.ts`

Exposition des 3 deltas de groupe dans `ConvergenceResult` sans modification des formules ni des caps :

```typescript
baziGroupDelta?:  number;  // C_BAZI capé ±15
luneGroupDelta?:  number;  // C_LUNE capé ±16
ephemGroupDelta?: number;  // C_EPHEM capé ±14 (après LuneGate)
```

Propagation propre L1 → L3. Zéro impact sur score, zéro modification modules L1/L2.
Utilisables pour monitoring futur si un groupe domine la distribution.

---

## Ronde 9 — Audit doctrinal Oracle + Compatibilité (20 correctifs)

> Processus : Ronde 9 / 9bis (confrontation croisée) / 9ter (arbitrage final)
> 3 IAs : GPT (Dr. Chen numérologie) / Grok (Dr. Patel BaZi) / Gemini (Pr. Suzuki Yi Jing)
> Résultat : 20 décisions verrouillées — conformité 100% (audit croisé vérifié)

### Sprint 1 — Corrections simples (8 edits)

| # | Correctif | Fichier | Détail |
|---|-----------|---------|--------|
| 1 | Bug Master Bébé | `oracle.ts` | CdV parent préservé (11≠2) |
| 2 | 7 chinois neutre | `oracle.ts` | CHINESE_DIGIT_BONUS[7] : -2 → 0 |
| 3 | Voyage sensible Mercure | `oracle.ts` | `mercurySensitive: true` |
| 4 | Présentation sensible Mercure | `oracle.ts` | `mercurySensitive: true` |
| 5 | Mercure malus graduel | `oracle.ts` | Remplace cap dur 71 → malus -6 à -12 par catégorie |
| 6 | A+B=65 supprimé | `compatibility.ts` | Heuristique arithmétique sans base Yi Jing |
| 7 | Même hexagramme +2 | `compatibility.ts` | Résonance profonde au lieu de malus |
| 8 | PB retirée BaZi | `bazi.ts` | +8 → 0, module séparé dans compatibility |
| 9 | BaZi scoring recalibré | `bazi.ts` | 天合+18, Liu He+12, San He+14, Clash-13, Harm-11 |
| 10 | PB gradation | `compatibility.ts` | Ancien 30/100 → 50/80 (inactive/active) |
| 11 | BaZi normalisation | `compatibility.ts` | `(score+34)/78×100` nouveau range [-34,+44] |

### Sprint 2 — Formules nouvelles (3 edits)

| # | Correctif | Fichier | Détail |
|---|-----------|---------|--------|
| 1 | Y contextuel GPT 3 niveaux | `oracle.ts` + `numerology.ts` | Y initial→cons, après cons→voy, sinon→cons |
| 2 | DATE Oracle 3 composantes | `oracle.ts` | `0.40×vibDate + 0.30×compat(date,CdV) + 0.30×cycle` |
| 3 | I Ching 4 trigrammes croisés | `compatibility.ts` | bas↔bas + haut↔haut (fort) + croisés (léger) + Roi Wen +3 |

### Sprint 3 — Calibration (6 edits)

| # | Correctif | Fichier | Détail |
|---|-----------|---------|--------|
| 1 | Poids modes | `compatibility.ts` | Amour 45/25/20/10 · Pro 35/30/25/10 · Famille 40/30/30/0 |
| 2 | Sous-poids numérologie | `compatibility.ts` | LP/Expr/Soul par mode (40/25/35 · 30/45/25 · 40/30/30) |
| 3 | NUM_COMPAT 9×9 | `compatibility.ts` | Nouvelle matrice consensus (1-5=9, 2-6=9, 3-9=9, 4-8=9) |
| 4 | Maîtres Nombres | `compatibility.ts` | 11×22: 10→6, 11×11: 9→8, 22×22: 8→7, 22×33: 9→7 |
| 5 | BUSINESS_NUMBERS | `oracle.ts` | 4: 2→7, 7: 1→3, 8: 9→10, 1: 7→8 |
| 6 | Hex famille +2 max | `compatibility.ts` | Séparé du score doctrinal, "Résonance Archétypale" |

### Sprint 4 — Polish (1 edit)

| # | Correctif | Fichier | Détail |
|---|-----------|---------|--------|
| 1 | Bonus 168 Yi Lu Fa | `oracle.ts` | 一六八 "chemin vers la fortune" +10 chineseBonus |

### Fichiers de référence Ronde 9

```
Ronde9-brief-unique.txt              — Brief audit initial
Ronde9-Confrontation.txt             — Première confrontation
Ronde9bis-confrontation-croisee.txt  — Confrontation croisée
Ronde9bis-Synthese-Finale.txt        — 20 décisions + matrices
Ronde9ter-5points-friction.txt       — 5 points friction arbitrés
Ronde9ter-Decisions-Verrouillees.txt — Décisions finales verrouillées
```
