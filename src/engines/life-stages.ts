/**
 * life-stages.ts — Aiguillage planète × tranche d'âge (couche d'affichage uniquement)
 *
 * Issu de la Ronde #34 (consensus 3/3) + #34bis (traduction vers clés réelles).
 * Adapte le narratif des domaines selon la phase de vie de l'utilisateur :
 *   ex. à 69 ans, "Mars" ne s'affiche plus comme "carrière" mais comme "vitalité/transmission".
 *
 * IMPORTANT : aucune modification du scoring math (tanh, dashaMult, résonance lunaire).
 * Seuls les LABELS et NARRATIFS sont impactés.
 *
 * Bornes ancrées sur cycles astrologiques :
 *   28 = Saturn Return ; 42 = Uranus opposition ; 59 = 2e Saturn Return.
 *
 * Rollback : passer LIFE_STAGES_ENABLED à false → comportement legacy (domaine "natif").
 */

import type { LifeDomain } from './convergence.types';

// =============================================================================
// FEATURE FLAG (rollback)
// =============================================================================

/** Si false, getDomainForPlanet() renvoie le domaine "natif" sans aiguillage d'âge. */
export const LIFE_STAGES_ENABLED = true;

// =============================================================================
// TYPES
// =============================================================================

export type LifeBracket = '0-27' | '28-41' | '42-58' | '59+';

/** Planètes couvertes par le mapping d'âge (consensus R3 : 6 classiques, Mercure exclu). */
export type AgePlanet = 'Sun' | 'Moon' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn';

/** Mode de vie déclaré par l'utilisateur (toggle UI à 59+). */
export type LifeMode = 'still_active' | null;

// =============================================================================
// LABELS DES TRANCHES (pour UI / pop-up bascule 59 ans)
// =============================================================================

export const BRACKET_LABEL: Record<LifeBracket, string> = {
  '0-27':  'Formation',
  '28-41': 'Établissement',
  '42-58': 'Maturité',
  '59+':   'Transmission',
};

// =============================================================================
// CALCUL DE LA TRANCHE
// =============================================================================

/** Retourne la tranche d'âge à partir d'un âge entier. */
export function getLifeBracket(age: number): LifeBracket {
  if (age < 28) return '0-27';
  if (age < 42) return '28-41';
  if (age < 59) return '42-58';
  return '59+';
}

/** Calcule l'âge entier (années révolues) à partir d'une date de naissance ISO 'YYYY-MM-DD'. */
export function computeAge(bd: string, today: Date = new Date()): number {
  const [y, m, d] = bd.split('-').map(Number);
  if (!y || !m || !d) return 0;
  let age = today.getFullYear() - y;
  const beforeBirthday =
    today.getMonth() + 1 < m ||
    (today.getMonth() + 1 === m && today.getDate() < d);
  if (beforeBirthday) age -= 1;
  return Math.max(0, age);
}

/** Helper combiné : tranche depuis une bd ISO. */
export function getLifeBracketFromBd(bd: string, today: Date = new Date()): LifeBracket {
  return getLifeBracket(computeAge(bd, today));
}

// =============================================================================
// MAPPING PLANÈTE × TRANCHE → DOMAINE(S)
// Source : Ronde #34bis (consensus 3/3 sur traduction, 2/3 sur Lune 59+ → INTROSPECTION)
// Format : tableau ordonné [primaire, secondaire?]
//   - primaire utilisée par getDomainForPlanet()
//   - secondaire (si présente) utilisée par addAgeContext() pour enrichir le narratif
// =============================================================================

const PLANET_DOMAIN_BY_BRACKET: Record<AgePlanet, Record<LifeBracket, LifeDomain[]>> = {
  Sun: {
    '0-27':  ['VITALITE'],
    '28-41': ['VITALITE'],
    '42-58': ['VITALITE'],
    '59+':   ['VITALITE'],
  },
  Moon: {
    '0-27':  ['VITALITE'],
    '28-41': ['AMOUR'],
    '42-58': ['AMOUR', 'INTROSPECTION'],
    '59+':   ['INTROSPECTION'],
  },
  Venus: {
    '0-27':  ['AMOUR'],
    '28-41': ['AMOUR'],
    '42-58': ['AMOUR'],
    '59+':   ['AMOUR'],
  },
  Mars: {
    '0-27':  ['VITALITE'],
    '28-41': ['BUSINESS'],
    '42-58': ['BUSINESS'],
    '59+':   ['VITALITE'],
  },
  Jupiter: {
    '0-27':  ['INTROSPECTION'],
    '28-41': ['BUSINESS'],
    '42-58': ['INTROSPECTION'],
    '59+':   ['INTROSPECTION'],
  },
  Saturn: {
    '0-27':  ['INTROSPECTION'],
    '28-41': ['BUSINESS'],
    '42-58': ['BUSINESS'],
    '59+':   ['INTROSPECTION'],
  },
};

/**
 * Domaine "natif" d'une planète sans considération d'âge (fallback si LIFE_STAGES_ENABLED=false).
 * Conserve la mapping classique pré-R34 pour la rétrocompatibilité.
 */
const PLANET_DOMAIN_NATIVE: Record<AgePlanet, LifeDomain> = {
  Sun:     'VITALITE',
  Moon:    'AMOUR',
  Venus:   'AMOUR',
  Mars:    'BUSINESS',
  Jupiter: 'BUSINESS',
  Saturn:  'BUSINESS',
};

// =============================================================================
// HELPERS PUBLICS
// =============================================================================

/**
 * Retourne le domaine PRIMAIRE d'une planète pour une tranche d'âge donnée.
 * Si LIFE_STAGES_ENABLED=false, renvoie le domaine natif.
 */
export function getDomainForPlanet(
  planet: AgePlanet,
  bracket: LifeBracket,
): LifeDomain {
  if (!LIFE_STAGES_ENABLED) return PLANET_DOMAIN_NATIVE[planet];
  return PLANET_DOMAIN_BY_BRACKET[planet][bracket][0];
}

/**
 * Retourne tous les domaines associés à une planète pour une tranche (primaire + secondaire si présente).
 * Utilisé par addAgeContext() pour enrichir le narratif sans créer de fractionnement UI.
 */
export function getDomainsForPlanet(
  planet: AgePlanet,
  bracket: LifeBracket,
): LifeDomain[] {
  if (!LIFE_STAGES_ENABLED) return [PLANET_DOMAIN_NATIVE[planet]];
  return [...PLANET_DOMAIN_BY_BRACKET[planet][bracket]];
}

/**
 * Retourne le label affiché d'un domaine, avec ajustement dynamique pour BUSINESS à 59+.
 *
 * BUSINESS :
 *   - tranches 0-27 / 28-41 / 42-58 → 'Affaires' (label par défaut)
 *   - tranche 59+ :
 *       lifeMode === 'still_active' → 'Affaires' (toggle activé)
 *       sinon → 'Réalisations' (consensus R34bis : 2/3 GPT+Grok vs 'Projets' Gemini)
 *
 * Tous les autres domaines : label par défaut (résolu par le caller via DOMAIN_META).
 * Cette fonction ne retourne QUE l'override BUSINESS 59+ ; caller fait fallback DOMAIN_META.
 */
export function getDisplayedDomainLabel(
  domain: LifeDomain,
  bracket: LifeBracket,
  lifeMode: LifeMode = null,
): string | null {
  if (!LIFE_STAGES_ENABLED) return null;
  if (domain !== 'BUSINESS') return null;
  if (bracket !== '59+') return null;
  if (lifeMode === 'still_active') return 'Affaires';
  return 'Réalisations';
}

/**
 * Résout le label final d'un domaine selon la doctrine R34 (planète × tranche d'âge).
 * Helper centralisé : prend le label par défaut en paramètre pour éviter une dépendance
 * circulaire vers DOMAIN_META (life-stages ne doit pas connaître convergence).
 *
 * Logique :
 *   - Si LIFE_STAGES_ENABLED=false → renvoie defaultLabel (pas d'aiguillage)
 *   - Sinon, applique getDisplayedDomainLabel() (override BUSINESS@59+) ou fallback defaultLabel
 *
 * @param domain       Clé interne du domaine (BUSINESS, AMOUR, etc.)
 * @param defaultLabel Label par défaut (ex: 'Affaires' depuis DOMAIN_META[domain].label)
 * @param bracket      Tranche d'âge calculée
 * @param lifeMode     Mode de vie déclaré (toggle 59+)
 */
export function resolveDomainLabel(
  domain: LifeDomain,
  defaultLabel: string,
  bracket: LifeBracket,
  lifeMode: LifeMode = null,
): string {
  const override = getDisplayedDomainLabel(domain, bracket, lifeMode);
  return override ?? defaultLabel;
}

/**
 * Enrichit un narratif de transit avec un contexte d'âge approprié (vocabulaire corporel pour 59+).
 *
 * Consensus R34 : pour les transits difficiles à 59+, ajouter une dimension corporelle
 * douce (ex. "écoute ton corps", "respect du rythme") plutôt que les directives d'action
 * brute appropriées aux tranches plus jeunes.
 *
 * Retourne null si aucun contexte n'est applicable (caller utilise alors le narratif standard).
 *
 * @param planet  Planète impliquée dans le transit
 * @param aspect  Type d'aspect (conjonction, carré, opposition, trigone, sextile)
 * @param bracket Tranche d'âge de l'utilisateur
 */
export function addAgeContext(
  planet: AgePlanet,
  aspect: string,
  bracket: LifeBracket,
): string | null {
  if (!LIFE_STAGES_ENABLED) return null;
  if (bracket !== '59+') return null;

  const aspectLower = aspect.toLowerCase();
  const isDifficult =
    aspectLower.includes('carré') ||
    aspectLower.includes('opposition') ||
    aspectLower.includes('square');

  if (!isDifficult) return null;

  // Vocabulaire corporel doux par planète (consensus R34)
  switch (planet) {
    case 'Mars':
      return 'Écoute ton corps — l\'élan reste là, mais il se canalise dans la durée plutôt que dans l\'urgence.';
    case 'Saturn':
      return 'Le poids du temps se fait sentir — ralentir n\'est pas reculer, c\'est intégrer.';
    case 'Jupiter':
      return 'L\'expansion se vit désormais en profondeur — moins de territoires nouveaux, plus de sens.';
    case 'Sun':
      return 'Ton énergie vitale demande des cycles plus respectueux — alterne pleinement effort et récupération.';
    case 'Moon':
      return 'Tes émotions se déposent — donne-leur l\'espace de se révéler sans précipitation.';
    case 'Venus':
      return 'Les liens se nuancent — la qualité prime sur l\'intensité.';
    default:
      return null;
  }
}

// =============================================================================
// EXPORTS POUR TESTS / INTROSPECTION
// =============================================================================

export const _internals = {
  PLANET_DOMAIN_BY_BRACKET,
  PLANET_DOMAIN_NATIVE,
};
