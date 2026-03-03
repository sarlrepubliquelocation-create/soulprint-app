// ═══ DOMAIN WEIGHTS V6.0 ═══
// Matrice de pondération domaine-spécifique par module.
// Décisions verrouillées : Ronde V6.0 R2 GPT + Gemini.
//
// Principe : chaque module a un MULTIPLICATEUR par domaine (neutre = 1.0).
//   > 1.0 → signal amplifié pour ce domaine
//   < 1.0 → signal atténué pour ce domaine
//   0.0   → module ignoré pour ce domaine
//
// Intégration dans calculateContextualScores() :
//   domainRaw[d] += b.points * DOMAIN_AFFINITY[b.system][d] * MODULE_DOMAIN_WEIGHTS[b.system][d]
//   (le weight modifie l'amplitude de l'affinité, pas son signe)
//
// Architecture : fichier centralisé (Option C Gemini R2) — IDs techniques normalisés.
// Clés = valeurs du champ `system` dans breakdown[] (doit correspondre exactement).
//
// ═══════════════════════════════════════════════════════════════════════════════

import type { LifeDomain } from './convergence';

// ── Interface ──

export interface DomainWeights {
  BUSINESS:       number;
  AMOUR:          number;
  RELATIONS:      number;
  CREATIVITE:     number;
  INTROSPECTION:  number;
  VITALITE:       number;
}

// ── Valeurs par défaut (neutre) ──

const NEUTRAL: DomainWeights = {
  BUSINESS: 1.0, AMOUR: 1.0, RELATIONS: 1.0,
  CREATIVITE: 1.0, INTROSPECTION: 1.0, VITALITE: 1.0,
};

// ── Matrice principale ──
// Clés : valeurs exactes de breakdown[i].system dans convergence.ts
//
// Justification des 5 choix les plus structurants (GPT R2) :
//   Mercure rétro BUSINESS=1.6 → contrats/comm/décisions pro : signal maximal
//   Éclipses Natales BUSINESS=1.5 → éclipse sur MC/Soleil = bascule de trajectoire
//   Nakshatra AMOUR=1.4 → système lunaire, dominance relationnelle
//   I Ching INTROSPECTION=1.4 → guidance oraculaire = signal intérieur fort
//   Phase lunaire RELATIONS=1.4 → Pleine Lune = climax collectif

export const MODULE_DOMAIN_WEIGHTS: Record<string, DomainWeights> = {
  //                          BIZ    AMR    REL    CREA   INTRO  VITA
  'Numérologie':      { BUSINESS: 1.2, AMOUR: 1.0, RELATIONS: 1.0, CREATIVITE: 1.1, INTROSPECTION: 0.9, VITALITE: 1.0 },
  'BaZi':             { BUSINESS: 1.3, AMOUR: 1.2, RELATIONS: 1.2, CREATIVITE: 1.1, INTROSPECTION: 1.0, VITALITE: 1.3 },
  'I Ching':          { BUSINESS: 1.1, AMOUR: 1.1, RELATIONS: 1.2, CREATIVITE: 1.3, INTROSPECTION: 1.4, VITALITE: 0.9 },
  'Hex Nucléaire':    { BUSINESS: 0.9, AMOUR: 1.0, RELATIONS: 1.0, CREATIVITE: 1.2, INTROSPECTION: 1.3, VITALITE: 0.8 },
  'Nakshatra':        { BUSINESS: 1.0, AMOUR: 1.4, RELATIONS: 1.3, CREATIVITE: 1.2, INTROSPECTION: 1.2, VITALITE: 1.3 },
  'Mercure':          { BUSINESS: 1.6, AMOUR: 0.8, RELATIONS: 1.3, CREATIVITE: 1.1, INTROSPECTION: 0.9, VITALITE: 0.7 },
  'Astrologie':       { BUSINESS: 1.3, AMOUR: 1.3, RELATIONS: 1.3, CREATIVITE: 1.2, INTROSPECTION: 1.2, VITALITE: 1.3 },
  'Planètes':         { BUSINESS: 1.2, AMOUR: 1.3, RELATIONS: 1.3, CREATIVITE: 1.0, INTROSPECTION: 1.1, VITALITE: 0.9 },
  'Trinity':          { BUSINESS: 1.4, AMOUR: 1.3, RELATIONS: 1.3, CREATIVITE: 1.2, INTROSPECTION: 1.2, VITALITE: 1.1 },
  'Synergies':        { BUSINESS: 1.3, AMOUR: 1.2, RELATIONS: 1.2, CREATIVITE: 1.1, INTROSPECTION: 1.1, VITALITE: 1.1 },
  'Synergies V6':     { BUSINESS: 1.3, AMOUR: 1.2, RELATIONS: 1.2, CREATIVITE: 1.1, INTROSPECTION: 1.2, VITALITE: 1.0 },
  'Retours Planétaires': { BUSINESS: 1.5, AMOUR: 1.3, RELATIONS: 1.2, CREATIVITE: 1.1, INTROSPECTION: 1.1, VITALITE: 1.3 },
  'Progressions':     { BUSINESS: 1.2, AMOUR: 1.2, RELATIONS: 1.1, CREATIVITE: 1.3, INTROSPECTION: 1.4, VITALITE: 1.1 },
  'Vimshottari Dasha':{ BUSINESS: 1.4, AMOUR: 1.3, RELATIONS: 1.2, CREATIVITE: 1.1, INTROSPECTION: 1.3, VITALITE: 1.2 },
  'Cycles de Vie':    { BUSINESS: 1.1, AMOUR: 1.0, RELATIONS: 1.0, CREATIVITE: 1.0, INTROSPECTION: 1.2, VITALITE: 1.0 },
  'Éclipses Natales': { BUSINESS: 1.5, AMOUR: 1.4, RELATIONS: 1.3, CREATIVITE: 1.2, INTROSPECTION: 1.3, VITALITE: 1.1 },
  'Lune':             { BUSINESS: 0.9, AMOUR: 1.3, RELATIONS: 1.4, CREATIVITE: 1.2, INTROSPECTION: 1.3, VITALITE: 1.0 },
  // Modules neutres (pas dans DOMAIN_AFFINITY → poids 1.0 par défaut)
  'Contexte Temporel':{ BUSINESS: 1.0, AMOUR: 1.0, RELATIONS: 1.0, CREATIVITE: 1.0, INTROSPECTION: 1.0, VITALITE: 1.0 },
};

// ── Fonction d'accès avec fallback ──

export function getModuleDomainWeight(moduleSystem: string, domain: LifeDomain): number {
  const weights = MODULE_DOMAIN_WEIGHTS[moduleSystem];
  if (!weights) return 1.0; // fallback neutre — module inconnu
  return weights[domain] ?? 1.0;
}

// ── Fonction de scoring domaine par module ──
// Usage : calcDomainScore('BaZi', +8) → Record<LifeDomain, number>
// Retourne le delta par domaine avant accumulation.

export function calcDomainScore(
  moduleSystem: string,
  pts: number,
  affinity: number, // coefficient DOMAIN_AFFINITY[system][domain] passé par convergence.ts
  domain: LifeDomain,
): number {
  const weight = getModuleDomainWeight(moduleSystem, domain);
  return Number((pts * affinity * weight).toFixed(2));
}
