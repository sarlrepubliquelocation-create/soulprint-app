# MEMO Kaironaute V10.9 — Sprints O → U
> Moteur de scoring védique journalier TypeScript
> Protocole : zéro initiative · diff avant/après · 3 options + choix explicite · oracles obligatoires
> Dernière mise à jour : Sprint U — 51/51 oracles

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

## Compteur oracles

| Sprint | Oracles ajoutés | Total cumulé |
|--------|-----------------|--------------|
| O→Q (sessions précédentes) | ~33 | 33 |
| Sprint R | +3 | 36 |
| Sprint S | +3 | 39 |
| Sprint T | +3 | 42 |
| Sprint U | +9 | **51/51** |
