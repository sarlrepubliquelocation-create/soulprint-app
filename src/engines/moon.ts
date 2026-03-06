/**
 * moon.ts — Moteur lunaire Kaironaute V4.9
 * Phase du jour (calcul astronomique), éclipses & phénomènes, Lune natale
 * V4.9: longitudeTropical exposée dans MoonPhase (source canonique pour convergence.ts)
 * V4.2: Void of Course Moon (Lune Hors Cours)
 * V2.9.1: Rétrogrades planétaires (Vénus, Mars, Jupiter, Saturne) 2025-2035 + scoring contextuel
 * V2.9: Mercure gradué (6 phases: direct/pré-ombre/stationnaire-rétro/rétrograde/stationnaire-direct/post-ombre)
 * V2.5: Nœuds Lunaires (système 11) — Rahu/Ketu, retours, transit nodal
 * Zéro API, zéro dépendance
 * Sprint AG: gardes div/0, bounds check, parseInt radix 10, safeInt
 */

import { safeDiv, safeInt, safeArrayGet } from './safe-utils';

/* ══ PHASE LUNAIRE ══ */

export type MoonConfidenceLevel = 'high' | 'medium' | 'low';

export interface MoonPhase {
  phase: number;          // 0-7 (8 phases)
  name: string;           // Nom français
  emoji: string;          // 🌑🌒🌓🌔🌕🌖🌗🌘
  illumination: number;   // 0-100%
  age: number;            // Jours depuis nouvelle lune
  tactical: string;       // Conseil tactique
  energy: string;         // Description énergétique
  // V4.7: Fiabilité du calcul lunaire (affectée si heure de naissance inconnue)
  confidence: MoonConfidenceLevel;
  confidenceReason?: string;
  // V4.9: Longitude tropicale (°) — source canonique pour convergence.ts
  // Remplace le recalcul Meeus inline dans convergence.ts
  // Formule : (13.1763966 × daysSinceJ2000 + 218.316547) % 360
  longitudeTropical: number;
}

const SYNODIC = 29.53059; // Mois synodique en jours
// Nouvelle Lune de référence : 6 janvier 2000 18:14 UTC
const REF_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0);

// Sprint AH — Cache LRU pour getMoonPhase (même date → même résultat)
// Clé = timestamp arrondi à la minute (précision suffisante, max 500 entrées)
const _moonCache = new Map<number, MoonPhase>();
const MOON_CACHE_MAX = 500;

function _getMoonCacheKey(date: Date): number {
  return Math.floor(date.getTime() / 60000); // arrondi à la minute
}

export function getMoonPhase(date: Date = new Date(), noTime: boolean = false): MoonPhase {
  const cacheKey = _getMoonCacheKey(date);
  // Cache uniquement si noTime=false (cas 99% des appels en boucle)
  if (!noTime) {
    const cached = _moonCache.get(cacheKey);
    if (cached) return cached;
  }
  const diff = date.getTime() - REF_NEW_MOON;
  const days = diff / (1000 * 60 * 60 * 24);
  const age = ((days % SYNODIC) + SYNODIC) % SYNODIC;
  let phaseIdx = Math.floor((age / SYNODIC) * 8) % 8;
  // Illumination approximée (cosinus)
  const illum = Math.round((1 - Math.cos(2 * Math.PI * age / SYNODIC)) / 2 * 100);
  // Snap : la pleine lune et nouvelle lune sont visuellement évidentes ±1.5j
  if (illum >= 97) phaseIdx = 4;       // Pleine Lune
  else if (illum <= 3) phaseIdx = 0;    // Nouvelle Lune

  // V4.9: Longitude tropicale — même formule que getMoonTransit() / getVoidOfCourseMoon()
  // Référence J2000.0 (2000-01-01T00:00:00Z), constantes Meeus
  const refJ2000 = new Date('2000-01-01T00:00:00Z');
  const daysSinceJ2000 = (date.getTime() - refJ2000.getTime()) / 86400000;
  let longitudeTropical = (13.1763966 * daysSinceJ2000 + 218.316547) % 360;
  if (longitudeTropical < 0) longitudeTropical += 360;

  // V4.7: Calcul de la confiance lunaire
  // La Lune se déplace ~0.55°/h → si noTime=true, incertitude de ±12h = ±6.6°
  // Seuil: si la Lune est à moins de 6° du prochain changement de signe → low
  let confidence: MoonConfidenceLevel = 'high';
  let confidenceReason: string | undefined;
  if (noTime) {
    // Position dans le signe courant (0-30°) — même formule que getVoidOfCourseMoon
    const refDate = new Date('2000-01-01T00:00:00Z');
    const daysSinceRef = (date.getTime() - refDate.getTime()) / 86400000;
    let moonLong = (13.1763966 * daysSinceRef + 218.316547) % 360;
    if (moonLong < 0) moonLong += 360;
    const positionInSign = moonLong % 30;
    const degreesLeft = 30 - positionInSign;
    const hoursUntilSignChange = safeDiv(degreesLeft, 0.55, 24); // Sprint AG: guard div/0

    if (hoursUntilSignChange < 6) {
      confidence = 'low';
      confidenceReason = 'La Lune peut changer de signe aujourd\'hui. Heure de naissance inconnue — transit lunaire incertain.';
    } else {
      confidence = 'medium';
      confidenceReason = 'Heure de naissance inconnue — précision lunaire réduite (±12h d\'incertitude).';
    }
  }

  const PHASES: { name: string; emoji: string; tactical: string; energy: string }[] = [
    {
      name: 'Nouvelle Lune',
      emoji: '🌑',
      tactical: 'Posez vos intentions. C\'est le moment idéal pour définir un objectif, lancer une idée, planter une graine. Rien de visible encore, mais tout commence ici.',
      energy: 'Énergie de germination — introspection et intention. Le ciel vous invite à regarder en dedans avant de regarder en dehors.'
    },
    {
      name: 'Premier Croissant',
      emoji: '🌒',
      tactical: 'Passez à l\'action initiale. Le doute peut surgir — c\'est normal. Avancez quand même, les premiers pas comptent plus que le plan parfait.',
      energy: 'Énergie d\'élan — la graine a germé, elle pousse vers la lumière. Courage et détermination.'
    },
    {
      name: 'Premier Quartier',
      emoji: '🌓',
      tactical: 'Moment de décision et d\'ajustement. Des obstacles peuvent apparaître — ne reculez pas, adaptez votre approche. La tension est productive.',
      energy: 'Énergie de confrontation constructive — mi-chemin entre l\'idée et la réalisation. Action et résolution.'
    },
    {
      name: 'Gibbeuse Croissante',
      emoji: '🌔',
      tactical: 'Affinez et perfectionnez. Le résultat approche — peaufinez les détails, corrigez le tir, préparez-vous à récolter.',
      energy: 'Énergie de maturation — la patience paie. Derniers réglages avant la plénitude.'
    },
    {
      name: 'Pleine Lune',
      emoji: '🌕',
      tactical: 'Récoltez et célébrez. Les résultats sont visibles, les émotions sont amplifiées. Moment de culmination et de lucidité.',
      energy: 'Énergie d\'illumination — tout est éclairé, le visible et l\'invisible. Clarté maximale, émotions intenses.'
    },
    {
      name: 'Gibbeuse Décroissante',
      emoji: '🌖',
      tactical: 'Partagez et transmettez ce que vous avez appris. Gratitude et générosité ouvrent de nouvelles portes.',
      energy: 'Énergie de diffusion — la lumière se partage. Enseignement, partage, rayonnement.'
    },
    {
      name: 'Dernier Quartier',
      emoji: '🌗',
      tactical: 'Faites le tri. Lâchez ce qui ne fonctionne plus — habitudes, projets, relations. L\'espace libéré attire le nouveau.',
      energy: 'Énergie de réévaluation — crise constructive, tri nécessaire. Lâcher prise actif.'
    },
    {
      name: 'Dernier Croissant',
      emoji: '🌘',
      tactical: 'Repos et lâcher-prise. Le cycle se termine — récupérez, rêvez, laissez l\'inconscient travailler. Le prochain cycle approche.',
      energy: 'Énergie de dissolution — transition vers le renouveau. Méditation, intuition, préparation silencieuse.'
    },
  ];

  const p = PHASES[phaseIdx];
  const result: MoonPhase = { phase: phaseIdx, name: p.name, emoji: p.emoji, illumination: illum, age: Math.round(age * 10) / 10, tactical: p.tactical, energy: p.energy, confidence, confidenceReason, longitudeTropical: Math.round(longitudeTropical * 1000) / 1000 };

  // Sprint AH — Mettre en cache (LRU simple : vider si trop grand)
  if (!noTime) {
    if (_moonCache.size >= MOON_CACHE_MAX) _moonCache.clear();
    _moonCache.set(cacheKey, result);
  }

  return result;
}

/**
 * V4.7: Score de phase lunaire — formule trigonométrique exacte (arbitrage GPT Q1)
 * Mappe les 8 phases (0-7) vers un score [-4, +4] avec asymétrie croissant/décroissant.
 * phase 0 (NL) → 0 | phase 2 (PQ) → +2 | phase 4 (PL) → +4 | phase 6 (DQ) → -2
 * Formule : 1 - 2*cos(x) + 2*sin(x) + cos(2x), x = phase × π/4
 * Interpolation de Fourier — combine illumination (cos) et dynamique d'énergie (sin).
 */
export function calcMoonPhaseScore(phase: number): number {
  const x = phase * (Math.PI / 4);
  const raw = 1 - 2 * Math.cos(x) + 2 * Math.sin(x) + Math.cos(2 * x);
  return Math.max(-4, Math.min(4, Math.round(raw)));
}

/* ══ ÉCLIPSES & PHÉNOMÈNES LUNAIRES ══ */

export interface LunarEvent {
  date: string;           // YYYY-MM-DD
  type: 'eclipse_solar' | 'eclipse_lunar' | 'supermoon' | 'blue_moon' | 'micro_moon' | 'mercury_retrograde';
  name: string;           // Nom affiché
  icon: string;
  description: string;    // Explication du phénomène
  effect: string;         // Effet sur l'utilisateur
  intensity: 'forte' | 'modérée' | 'subtile';
  endDate?: string;       // Pour les périodes (ex: rétrograde Mercure)
}

// Données astronomiques vérifiées NASA/EclipseWise 2025-2035
const LUNAR_EVENTS_HARDCODED: LunarEvent[] = [
  // ═══ 2025 ═══
  { date: '2025-03-14', type: 'eclipse_lunar', name: 'Éclipse lunaire totale', icon: '🌒🔴',
    description: 'La Terre masque entièrement le Soleil vu de la Lune — la Lune prend une teinte rouge cuivrée (Lune de Sang).',
    effect: 'Période de révélation émotionnelle intense. Ce qui était caché remonte à la surface — accueillez les prises de conscience sans résister.',
    intensity: 'forte' },
  { date: '2025-03-29', type: 'eclipse_solar', name: 'Éclipse solaire partielle', icon: '🌑☀️',
    description: 'La Lune cache partiellement le Soleil — disruption momentanée de l\'énergie solaire.',
    effect: 'Fenêtre de reset identitaire. Questionnements sur votre direction — ne prenez pas de décision majeure pendant 48h, observez.',
    intensity: 'modérée' },
  { date: '2025-09-07', type: 'eclipse_lunar', name: 'Éclipse lunaire totale', icon: '🌒🔴',
    description: 'Seconde Lune de Sang de l\'année — la Lune entre dans l\'ombre complète de la Terre.',
    effect: 'Clôture émotionnelle puissante. Un cycle qui traîne depuis 6 mois se termine — laissez-le partir.',
    intensity: 'forte' },
  { date: '2025-09-21', type: 'eclipse_solar', name: 'Éclipse solaire partielle', icon: '🌑☀️',
    description: 'La Lune cache partiellement le Soleil — disruption momentanée de l\'énergie solaire.',
    effect: 'Invitation à réévaluer vos objectifs de l\'année. Ce qui semblait clair peut nécessiter un ajustement.',
    intensity: 'modérée' },
  { date: '2025-11-05', type: 'supermoon', name: 'Super Lune', icon: '🌕✨',
    description: 'La Lune est au plus près de la Terre (périgée) et apparaît 14% plus grande et 30% plus lumineuse.',
    effect: 'Émotions amplifiées, intuition décuplée. Excellent pour les décisions qui viennent du cœur. Attention aux réactions disproportionnées.',
    intensity: 'forte' },
  { date: '2025-12-04', type: 'supermoon', name: 'Super Lune', icon: '🌕✨',
    description: 'Seconde Super Lune consécutive — la Lune est encore proche du périgée.',
    effect: 'L\'intensité émotionnelle reste élevée. Profitez de cette clarté pour boucler l\'année avec lucidité.',
    intensity: 'modérée' },

  // ═══ 2026 ═══
  { date: '2026-02-17', type: 'eclipse_solar', name: 'Éclipse solaire annulaire', icon: '🌑💫',
    description: 'La Lune passe devant le Soleil mais ne le couvre pas entièrement — un anneau de feu reste visible.',
    effect: 'Anneau de feu = illumination de vos angles morts. Ce que vous refusiez de voir devient évident. Période de vérité productive.',
    intensity: 'forte' },
  { date: '2026-03-03', type: 'eclipse_lunar', name: 'Éclipse lunaire totale', icon: '🌒🔴',
    description: 'Lune de Sang — la Lune entre dans l\'ombre complète de la Terre.',
    effect: 'Transformation émotionnelle profonde. Lâchez un attachement ancien — la place libérée attirera quelque chose de meilleur.',
    intensity: 'forte' },
  { date: '2026-08-12', type: 'eclipse_solar', name: 'Éclipse solaire totale', icon: '🌑🖤',
    description: 'Éclipse solaire totale — le Soleil disparaît complètement pendant quelques minutes. Phénomène rare et puissant.',
    effect: 'Reset total. Les éclipses solaires totales marquent des tournants de vie. Observez ce qui se termine et ce qui commence dans les 2 semaines qui suivent.',
    intensity: 'forte' },
  { date: '2026-08-28', type: 'eclipse_lunar', name: 'Éclipse lunaire partielle', icon: '🌒🟤',
    description: 'L\'ombre de la Terre couvre partiellement la Lune.',
    effect: 'Ajustement émotionnel après le reset solaire du 12 août. Intégration en douceur des changements.',
    intensity: 'modérée' },

  // ═══ 2027 ═══
  { date: '2027-02-06', type: 'eclipse_solar', name: 'Éclipse solaire annulaire', icon: '🌑💫',
    description: 'Anneau de feu visible — la Lune ne couvre pas totalement le disque solaire.',
    effect: 'Nouvelle fenêtre de clarté sur votre direction. Les intentions posées maintenant ont un potentiel de manifestation élevé.',
    intensity: 'forte' },
  { date: '2027-02-20', type: 'eclipse_lunar', name: 'Éclipse lunaire pénombrale', icon: '🌒⚪',
    description: 'La Lune traverse la pénombre de la Terre — assombrissement subtil.',
    effect: 'Effet léger mais réel : les émotions sous-jacentes remontent doucement. Bonne période d\'introspection.',
    intensity: 'subtile' },
  { date: '2027-07-18', type: 'eclipse_lunar', name: 'Éclipse lunaire pénombrale', icon: '🌒⚪',
    description: 'La Lune s\'assombrit légèrement en traversant la pénombre terrestre.',
    effect: 'Invitation subtile à faire le point émotionnel de mi-année.',
    intensity: 'subtile' },
  { date: '2027-08-02', type: 'eclipse_solar', name: 'Éclipse solaire totale', icon: '🌑🖤',
    description: 'Éclipse solaire totale — occultation complète du Soleil. Événement astronomique majeur.',
    effect: 'Tournant de vie potentiel. Les éclipses totales sont des catalyseurs de transformation — restez ouvert à l\'inattendu.',
    intensity: 'forte' },

  // ═══ 2028 (NASA/EclipseWise) ═══
  { date: '2028-01-12', type: 'eclipse_lunar', name: 'Éclipse lunaire partielle', icon: '🌒🟤',
    description: 'L\'ombre de la Terre couvre partiellement la Lune — premier événement écliptique de l\'année.',
    effect: 'Signal d\'ouverture : ce début d\'année invite à un bilan émotionnel. Les tensions non résolues de l\'année passée demandent attention.',
    intensity: 'modérée' },
  { date: '2028-01-26', type: 'eclipse_solar', name: 'Éclipse solaire annulaire', icon: '🌑💫',
    description: 'Anneau de feu — la Lune ne couvre pas totalement le Soleil, laissant un cercle lumineux.',
    effect: 'Vos angles morts deviennent visibles. Ce que vous ignoriez consciemment se révèle — utilisez cette clarté pour ajuster votre cap.',
    intensity: 'forte' },
  { date: '2028-07-06', type: 'eclipse_lunar', name: 'Éclipse lunaire partielle', icon: '🌒🟤',
    description: 'L\'ombre terrestre couvre partiellement la Lune en milieu d\'année.',
    effect: 'Bilan émotionnel de mi-année. Les projets lancés en janvier révèlent leur vraie nature — ajustez sans hésiter.',
    intensity: 'modérée' },
  { date: '2028-07-22', type: 'eclipse_solar', name: 'Éclipse solaire totale', icon: '🌑🖤',
    description: 'Éclipse solaire totale — occultation complète du Soleil. Phénomène rare visible en Australie et Nouvelle-Zélande.',
    effect: 'Reset majeur. Les éclipses totales catalysent des tournants de vie. Observez les portes qui se ferment et celles qui s\'ouvrent.',
    intensity: 'forte' },
  { date: '2028-12-31', type: 'eclipse_lunar', name: 'Éclipse lunaire totale', icon: '🌒🔴',
    description: 'Lune de Sang pour clôturer l\'année — la Lune entre dans l\'ombre complète de la Terre le soir du Nouvel An.',
    effect: 'Clôture émotionnelle puissante. Le passage à la nouvelle année se fait sous le signe de la transformation intérieure. Lâchez ce qui doit partir.',
    intensity: 'forte' },

  // ═══ 2029 (NASA/EclipseWise) ═══
  { date: '2029-01-14', type: 'eclipse_solar', name: 'Éclipse solaire partielle', icon: '🌑☀️',
    description: 'La Lune cache partiellement le Soleil — disruption légère de l\'énergie solaire.',
    effect: 'Début d\'année en douceur. Une invitation à réévaluer vos priorités avant de vous lancer dans de nouveaux projets.',
    intensity: 'modérée' },
  { date: '2029-06-12', type: 'eclipse_solar', name: 'Éclipse solaire partielle', icon: '🌑☀️',
    description: 'Éclipse solaire partielle de milieu d\'année.',
    effect: 'Fenêtre de recalibrage. Vos objectifs de début d\'année nécessitent peut-être un ajustement — écoutez les signaux.',
    intensity: 'subtile' },
  { date: '2029-06-26', type: 'eclipse_lunar', name: 'Éclipse lunaire totale', icon: '🌒🔴',
    description: 'Lune de Sang estivale — la Lune prend une teinte rouge cuivrée pendant plus d\'une heure.',
    effect: 'Révélation émotionnelle profonde. Les masques tombent, les vérités émergent. Période puissante pour les décisions venant du cœur.',
    intensity: 'forte' },
  { date: '2029-07-11', type: 'eclipse_solar', name: 'Éclipse solaire partielle', icon: '🌑☀️',
    description: 'Seconde éclipse solaire partielle en un mois — configuration rare.',
    effect: 'Double signal de reset. L\'univers insiste : ce qui ne fonctionne plus doit être abandonné.',
    intensity: 'modérée' },
  { date: '2029-12-05', type: 'eclipse_solar', name: 'Éclipse solaire partielle', icon: '🌑☀️',
    description: 'Éclipse solaire partielle de fin d\'année.',
    effect: 'Invitation à la réflexion avant la clôture annuelle. Préparez le terrain pour le prochain cycle.',
    intensity: 'subtile' },
  { date: '2029-12-20', type: 'eclipse_lunar', name: 'Éclipse lunaire totale', icon: '🌒🔴',
    description: 'Lune de Sang hivernale — dernière éclipse de la décennie 2020.',
    effect: 'Clôture d\'une décennie. Bilan émotionnel profond — honorez le chemin parcouru et préparez la transformation de la prochaine ère.',
    intensity: 'forte' },

  // ═══ 2030 (NASA) ═══
  { date: '2030-06-01', type: 'eclipse_solar', name: 'Éclipse solaire annulaire', icon: '🌑💫',
    description: 'Anneau de feu estival — la Lune laisse un cercle lumineux autour du Soleil.',
    effect: 'Illumination des projets de l\'année. Ce qui marchait en pilote automatique demande un regard neuf.',
    intensity: 'forte' },
  { date: '2030-06-15', type: 'eclipse_lunar', name: 'Éclipse lunaire partielle', icon: '🌒🟤',
    description: 'L\'ombre de la Terre couvre partiellement la Lune, deux semaines après l\'annulaire solaire.',
    effect: 'Intégration émotionnelle du reset solaire. Les ajustements faits début juin commencent à porter leurs fruits.',
    intensity: 'modérée' },
  { date: '2030-11-25', type: 'eclipse_solar', name: 'Éclipse solaire totale', icon: '🌑🖤',
    description: 'Éclipse solaire totale — visible en Australie, Afrique du Sud et océan Indien.',
    effect: 'Tournant de fin d\'année. Les éclipses totales marquent des avant/après — restez ouvert aux changements inattendus.',
    intensity: 'forte' },
  { date: '2030-12-09', type: 'eclipse_lunar', name: 'Éclipse lunaire pénombrale', icon: '🌒⚪',
    description: 'La Lune traverse la pénombre terrestre — assombrissement subtil.',
    effect: 'Fermeture douce de l\'année. Les émotions sous-jacentes remontent pour être libérées avant le nouveau cycle.',
    intensity: 'subtile' },

  // ═══ 2031 (NASA) ═══
  { date: '2031-05-07', type: 'eclipse_lunar', name: 'Éclipse lunaire pénombrale', icon: '🌒⚪',
    description: 'La Lune s\'assombrit légèrement en traversant la pénombre terrestre.',
    effect: 'Signal subtil de mi-printemps. Les intuitions de cette période méritent d\'être écoutées attentivement.',
    intensity: 'subtile' },
  { date: '2031-05-21', type: 'eclipse_solar', name: 'Éclipse solaire annulaire', icon: '🌑💫',
    description: 'Anneau de feu printanier visible en Asie.',
    effect: 'Fenêtre de clarté sur vos projets. Les zones floues se précisent — profitez-en pour trancher.',
    intensity: 'forte' },
  { date: '2031-11-14', type: 'eclipse_solar', name: 'Éclipse solaire totale', icon: '🌑🖤',
    description: 'Éclipse solaire totale — visible en Amérique du Nord et Pacifique.',
    effect: 'Reset majeur de fin d\'année. Un chapitre se ferme définitivement — faites confiance au renouveau qui suit.',
    intensity: 'forte' },

  // ═══ 2032 (NASA) ═══
  { date: '2032-04-25', type: 'eclipse_lunar', name: 'Éclipse lunaire totale', icon: '🌒🔴',
    description: 'Lune de Sang printanière — la Lune entre dans l\'ombre complète de la Terre.',
    effect: 'Révélation émotionnelle. Ce que vous portiez depuis l\'hiver se libère — accueillez la transformation.',
    intensity: 'forte' },
  { date: '2032-05-09', type: 'eclipse_solar', name: 'Éclipse solaire annulaire', icon: '🌑💫',
    description: 'Anneau de feu — visible dans l\'hémisphère sud.',
    effect: 'Double éclipse avec la lunaire du 25 avril. Période de mutation accélérée — les décisions prises maintenant ont un impact durable.',
    intensity: 'forte' },
  { date: '2032-10-18', type: 'eclipse_lunar', name: 'Éclipse lunaire totale', icon: '🌒🔴',
    description: 'Seconde Lune de Sang de l\'année — la Lune prend une teinte rouge cuivrée.',
    effect: 'Clôture d\'un cycle émotionnel de 6 mois. Ce qui a été révélé en avril trouve sa résolution.',
    intensity: 'forte' },

  // ═══ 2033 (NASA) ═══
  { date: '2033-03-30', type: 'eclipse_solar', name: 'Éclipse solaire totale', icon: '🌑🖤',
    description: 'Éclipse solaire totale de printemps — visible en Amérique du Nord et Arctique.',
    effect: 'Nouveau départ puissant. L\'énergie printanière combinée à l\'éclipse totale crée une fenêtre de lancement exceptionnelle.',
    intensity: 'forte' },
  { date: '2033-10-08', type: 'eclipse_lunar', name: 'Éclipse lunaire totale', icon: '🌒🔴',
    description: 'Lune de Sang automnale — la Lune entre dans l\'ombre terrestre complète.',
    effect: 'Récolte et lâcher-prise. Les efforts du printemps portent leurs fruits — célébrez et libérez ce qui n\'est plus nécessaire.',
    intensity: 'forte' },

  // ═══ 2034 (NASA) ═══
  { date: '2034-03-20', type: 'eclipse_solar', name: 'Éclipse solaire totale', icon: '🌑🖤',
    description: 'Éclipse solaire totale à l\'équinoxe de printemps — alignement rare et symboliquement puissant.',
    effect: 'L\'équinoxe + éclipse totale = portail de transformation majeur. Jour et nuit s\'équilibrent pendant que le Soleil disparaît. Restez centré.',
    intensity: 'forte' },
  { date: '2034-09-12', type: 'eclipse_solar', name: 'Éclipse solaire annulaire', icon: '🌑💫',
    description: 'Anneau de feu automnal visible en Amérique du Sud.',
    effect: 'Bilan de mi-automne. Les projets lancés au printemps révèlent leur potentiel réel — ajustez ou amplifiez.',
    intensity: 'forte' },
  { date: '2034-09-28', type: 'eclipse_lunar', name: 'Éclipse lunaire totale', icon: '🌒🔴',
    description: 'Lune de Sang — la Lune prend une teinte rouge pendant la pleine lune de septembre.',
    effect: 'Libération émotionnelle d\'automne. Les non-dits et les tensions accumulées trouvent enfin une voie d\'expression.',
    intensity: 'forte' },

  // ═══ 2035 (NASA) ═══
  { date: '2035-02-22', type: 'eclipse_lunar', name: 'Éclipse lunaire totale', icon: '🌒🔴',
    description: 'Lune de Sang hivernale — première éclipse totale lunaire de l\'année.',
    effect: 'Purge émotionnelle de fin d\'hiver. Ce qui pesait se libère pour faire place au renouveau printanier.',
    intensity: 'forte' },
  { date: '2035-03-09', type: 'eclipse_solar', name: 'Éclipse solaire annulaire', icon: '🌑💫',
    description: 'Anneau de feu de début de printemps — visible dans le Pacifique.',
    effect: 'Clarté sur la direction à prendre. L\'énergie du printemps naissant amplifie la lucidité — posez vos intentions.',
    intensity: 'forte' },
  { date: '2035-09-02', type: 'eclipse_solar', name: 'Éclipse solaire totale', icon: '🌑🖤',
    description: 'Éclipse solaire totale — visible en Asie orientale.',
    effect: 'Reset de rentrée. Les habitudes de l\'été cèdent la place à une nouvelle dynamique — accueillez le changement.',
    intensity: 'forte' },
];

// ═══ PRÉDICTEUR AUTOMATIQUE D'ÉCLIPSES ═══
// Basé sur les nœuds lunaires (Meeus) — précision ±1 jour
// Utilisé pour les années au-delà des données hardcodées (>2035)

const HARDCODED_MAX_YEAR = 2035;

function predictEclipsesForYear(year: number): LunarEvent[] {
  if (year <= HARDCODED_MAX_YEAR) return []; // données hardcodées prioritaires

  const events: LunarEvent[] = [];
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);

  // Itérer chaque jour de l'année, chercher les syzygies proches des nœuds
  for (let m = 0; m < 12; m++) {
    // Calculer les Nouvelles Lunes et Pleines Lunes du mois
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(Date.UTC(year, m, d, 12, 0, 0));
      const daysSinceJ2000 = (date.getTime() - J2000) / 86400000;

      // Phase lunaire (0 = nouvelle, 0.5 = pleine)
      const elapsed = (date.getTime() - REF_NEW_MOON) / 86400000;
      const phase = ((elapsed % SYNODIC) + SYNODIC) % SYNODIC;
      const phaseRatio = phase / SYNODIC; // 0..1

      // Longitude du nœud ascendant lunaire (Meeus)
      // Régresse de ~19.3549° par an depuis J2000
      const nodeLong = (125.0445479 - 0.0529539 * daysSinceJ2000) % 360;
      const nodeLongNorm = ((nodeLong % 360) + 360) % 360;

      // Longitude moyenne de la Lune
      let moonLong = (218.316547 + 13.1763966 * daysSinceJ2000) % 360;
      if (moonLong < 0) moonLong += 360;

      // Distance angulaire Lune ↔ nœud le plus proche
      const diff1 = Math.abs(moonLong - nodeLongNorm);
      const diff2 = Math.abs(moonLong - ((nodeLongNorm + 180) % 360));
      const nodeDistance = Math.min(diff1, 360 - diff1, diff2, 360 - diff2);

      // Éclipse solaire : Nouvelle Lune (phase ~0) + Lune proche d'un nœud (<18°)
      const isNewMoon = phaseRatio < 0.03 || phaseRatio > 0.97;
      const isFullMoon = phaseRatio > 0.47 && phaseRatio < 0.53;

      if (isNewMoon && nodeDistance < 17) {
        const dateStr = date.toISOString().slice(0, 10);
        // Éviter les doublons (garder le jour le plus proche)
        if (!events.some(e => e.type === 'eclipse_solar' && Math.abs(new Date(e.date).getTime() - date.getTime()) < 86400000 * 3)) {
          const isTotalOrAnnular = nodeDistance < 10;
          events.push({
            date: dateStr,
            type: 'eclipse_solar',
            name: isTotalOrAnnular ? (d % 2 === 0 ? 'Éclipse solaire totale' : 'Éclipse solaire annulaire') : 'Éclipse solaire partielle',
            icon: isTotalOrAnnular ? (d % 2 === 0 ? '🌑🖤' : '🌑💫') : '🌑☀️',
            description: isTotalOrAnnular
              ? 'Éclipse solaire majeure — alignement précis Soleil-Lune-Terre. Phénomène astronomique puissant.'
              : 'Éclipse solaire partielle — la Lune cache une portion du Soleil.',
            effect: isTotalOrAnnular
              ? 'Tournant potentiel. Les éclipses solaires majeures catalysent des changements de direction — restez ouvert à l\'inattendu.'
              : 'Fenêtre de recalibrage. Réévaluez vos priorités — ce qui semblait acquis peut nécessiter un ajustement.',
            intensity: isTotalOrAnnular ? 'forte' : 'modérée',
          });
        }
      }

      if (isFullMoon && nodeDistance < 15) {
        const dateStr = date.toISOString().slice(0, 10);
        if (!events.some(e => e.type === 'eclipse_lunar' && Math.abs(new Date(e.date).getTime() - date.getTime()) < 86400000 * 3)) {
          const isTotal = nodeDistance < 5;
          const isPartial = nodeDistance < 10;
          events.push({
            date: dateStr,
            type: 'eclipse_lunar',
            name: isTotal ? 'Éclipse lunaire totale' : isPartial ? 'Éclipse lunaire partielle' : 'Éclipse lunaire pénombrale',
            icon: isTotal ? '🌒🔴' : isPartial ? '🌒🟤' : '🌒⚪',
            description: isTotal
              ? 'Lune de Sang — la Lune entre dans l\'ombre complète de la Terre, prenant une teinte rouge cuivrée.'
              : isPartial
              ? 'L\'ombre de la Terre couvre partiellement la Lune.'
              : 'La Lune traverse la pénombre terrestre — assombrissement subtil.',
            effect: isTotal
              ? 'Libération émotionnelle profonde. Ce qui était retenu ou nié remonte — accueillez la vérité avec courage.'
              : isPartial
              ? 'Ajustement émotionnel. Les tensions accumulées trouvent une voie de résolution — restez à l\'écoute.'
              : 'Signal subtil. Les intuitions de cette période méritent attention — écoutez votre voix intérieure.',
            intensity: isTotal ? 'forte' : isPartial ? 'modérée' : 'subtile',
          });
        }
      }
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

// ═══ SUPER LUNES, MICRO LUNES & BLUE MOONS ═══
// Calculés astronomiquement pour n'importe quelle année

// Mois anomalistique (périgée à périgée) en jours
const ANOMALISTIC = 27.55455;
// Référence périgée : 6 janvier 2000 ~18h UTC
const REF_PERIGEE = Date.UTC(2000, 0, 6, 18, 0, 0);

/** Calcule la distance Terre-Lune approximative pour une date donnée (km) */
function moonDistance(date: Date): number {
  const daysSincePerigee = (date.getTime() - REF_PERIGEE) / 86400000;
  const anomaly = (2 * Math.PI * daysSincePerigee) / ANOMALISTIC;
  // Distance moyenne 385,001 km, amplitude ~21,600 km
  return 385001 - 21600 * Math.cos(anomaly);
}

/** Trouve toutes les Pleines Lunes d'une année avec leur distance */
function getFullMoonsForYear(year: number): { date: Date; dateStr: string; distance: number; month: number }[] {
  const fullMoons: { date: Date; dateStr: string; distance: number; month: number }[] = [];

  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    let bestPhaseDay: Date | null = null;
    let bestPhaseDiff = 1;

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(Date.UTC(year, m, d, 12, 0, 0));
      const elapsed = (date.getTime() - REF_NEW_MOON) / 86400000;
      const phase = ((elapsed % SYNODIC) + SYNODIC) % SYNODIC;
      const ratio = phase / SYNODIC;
      const diffToFull = Math.abs(ratio - 0.5);
      if (diffToFull < bestPhaseDiff) {
        bestPhaseDiff = diffToFull;
        bestPhaseDay = date;
      }
    }

    if (bestPhaseDay && bestPhaseDiff < 0.06) {
      fullMoons.push({
        date: bestPhaseDay,
        dateStr: bestPhaseDay.toISOString().slice(0, 10),
        distance: moonDistance(bestPhaseDay),
        month: m + 1,
      });
    }
  }
  return fullMoons;
}

/** Prédit Super Lunes, Micro Lunes et Blue Moons pour une année */
function predictLunarPhenomena(year: number): LunarEvent[] {
  const events: LunarEvent[] = [];
  const fullMoons = getFullMoonsForYear(year);

  // Compter les pleines lunes par mois pour détecter les Blue Moons
  const moonsByMonth: Record<number, typeof fullMoons> = {};
  fullMoons.forEach(fm => {
    if (!moonsByMonth[fm.month]) moonsByMonth[fm.month] = [];
    moonsByMonth[fm.month].push(fm);
  });

  fullMoons.forEach(fm => {
    // Super Lune : distance < 360 000 km
    if (fm.distance < 360000) {
      events.push({
        date: fm.dateStr,
        type: 'supermoon',
        name: 'Super Lune',
        icon: '🌕✨',
        description: `La Lune est au périgée (${Math.round(fm.distance).toLocaleString('fr')} km) et apparaît 14% plus grande et 30% plus lumineuse.`,
        effect: 'Émotions amplifiées, intuition décuplée. Excellent pour les décisions qui viennent du cœur. Attention aux réactions disproportionnées.',
        intensity: 'forte',
      });
    }
    // Micro Lune : distance > 404 000 km
    else if (fm.distance > 404000) {
      events.push({
        date: fm.dateStr,
        type: 'micro_moon',
        name: 'Micro Lune',
        icon: '🌕🔍',
        description: `La Lune est à l'apogée (${Math.round(fm.distance).toLocaleString('fr')} km) — elle apparaît plus petite et moins lumineuse que d'habitude.`,
        effect: 'Énergie émotionnelle en retrait. Période favorable à l\'introspection calme et aux tâches de fond plutôt qu\'aux décisions impulsives.',
        intensity: 'subtile',
      });
    }
  });

  // Blue Moon : 2ème pleine lune dans le même mois
  Object.values(moonsByMonth).forEach(moons => {
    if (moons.length >= 2) {
      const blueMoon = moons[moons.length - 1]; // la 2ème
      events.push({
        date: blueMoon.dateStr,
        type: 'blue_moon',
        name: 'Blue Moon',
        icon: '🌕💙',
        description: 'Seconde Pleine Lune dans le même mois calendaire — phénomène rare (une fois tous les 2-3 ans). D\'où l\'expression "once in a blue moon".',
        effect: 'Événement rare = énergie rare. Les intentions posées sous une Blue Moon ont une portée exceptionnelle. Moment idéal pour les engagements importants.',
        intensity: 'forte',
      });
    }
  });

  return events;
}

// ═══ MERCURE RÉTROGRADE ═══
// 3-4 fois par an, ~21 jours — L'événement astro le plus connu du grand public
// Hardcodé 2025-2035 (données astronomiques), prédit au-delà

const MERCURY_RETROGRADES: { start: string; end: string }[] = [
  // 2025
  { start: '2025-03-15', end: '2025-04-07' },
  { start: '2025-07-18', end: '2025-08-11' },
  { start: '2025-11-09', end: '2025-11-29' },
  // 2026
  { start: '2026-02-26', end: '2026-03-20' },
  { start: '2026-06-30', end: '2026-07-24' },
  { start: '2026-10-24', end: '2026-11-13' },
  // 2027
  { start: '2027-02-09', end: '2027-03-04' },
  { start: '2027-06-10', end: '2027-07-05' },
  { start: '2027-10-07', end: '2027-10-28' },
  // 2028
  { start: '2028-01-24', end: '2028-02-15' },
  { start: '2028-05-21', end: '2028-06-13' },
  { start: '2028-09-19', end: '2028-10-11' },
  // 2029
  { start: '2029-01-07', end: '2029-01-29' },
  { start: '2029-05-02', end: '2029-05-26' },
  { start: '2029-09-02', end: '2029-09-24' },
  { start: '2029-12-22', end: '2030-01-12' },
  // 2030
  { start: '2030-04-13', end: '2030-05-05' },
  { start: '2030-08-15', end: '2030-09-07' },
  { start: '2030-12-06', end: '2030-12-26' },
  // 2031
  { start: '2031-03-28', end: '2031-04-20' },
  { start: '2031-07-28', end: '2031-08-21' },
  { start: '2031-11-18', end: '2031-12-09' },
  // 2032
  { start: '2032-03-10', end: '2032-04-03' },
  { start: '2032-07-10', end: '2032-08-03' },
  { start: '2032-11-01', end: '2032-11-22' },
  // 2033
  { start: '2033-02-22', end: '2033-03-16' },
  { start: '2033-06-22', end: '2033-07-16' },
  { start: '2033-10-14', end: '2033-11-04' },
  // 2034
  { start: '2034-02-04', end: '2034-02-27' },
  { start: '2034-06-05', end: '2034-06-28' },
  { start: '2034-09-27', end: '2034-10-18' },
  // 2035
  { start: '2035-01-18', end: '2035-02-09' },
  { start: '2035-05-18', end: '2035-06-10' },
  { start: '2035-09-10', end: '2035-10-01' },
];

const MERCURY_HARDCODED_MAX_YEAR = 2035;

/** Prédit les rétrogrades de Mercure au-delà des données hardcodées */
function predictMercuryRetrogrades(year: number): { start: string; end: string }[] {
  if (year <= MERCURY_HARDCODED_MAX_YEAR) return [];

  // Mercure rétrograde ~3.5x/an, synodic period ~115.88 jours
  // On utilise les 3 dernières rétrogrades de 2035 comme ancres
  const anchors = MERCURY_RETROGRADES.filter(r => r.start.startsWith('2035'));
  const periods: { start: string; end: string }[] = [];
  const SYNODIC_MERCURY = 115.88;
  const RETRO_DURATION = 22; // jours moyens

  anchors.forEach(anchor => {
    const anchorDate = new Date(anchor.start + 'T00:00:00Z');
    let d = new Date(anchorDate);

    // Avancer par période synodique jusqu'à atteindre l'année cible
    while (d.getUTCFullYear() < year) {
      d = new Date(d.getTime() + SYNODIC_MERCURY * 86400000);
    }
    // Collecter les rétrogrades de l'année
    while (d.getUTCFullYear() === year) {
      const startStr = d.toISOString().slice(0, 10);
      const endDate = new Date(d.getTime() + RETRO_DURATION * 86400000);
      const endStr = endDate.toISOString().slice(0, 10);
      // Éviter doublons proches
      if (!periods.some(p => Math.abs(new Date(p.start).getTime() - d.getTime()) < 30 * 86400000)) {
        periods.push({ start: startStr, end: endStr });
      }
      d = new Date(d.getTime() + SYNODIC_MERCURY * 86400000);
    }
  });

  return periods.sort((a, b) => a.start.localeCompare(b.start));
}

const MOIS_COURTS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

/** Convertit les données rétrograde en LunarEvent[] pour une année */
function getMercuryEventsForYear(year: number): LunarEvent[] {
  const retros = [
    ...MERCURY_RETROGRADES.filter(r => r.start.startsWith(String(year))),
    ...(year > MERCURY_HARDCODED_MAX_YEAR ? predictMercuryRetrogrades(year) : []),
  ];

  return retros.map(r => {
    const endParts = r.end.split('-');
    const endMonth = safeArrayGet(MOIS_COURTS, safeInt(endParts[1] ?? '1') - 1, 'jan'); // Sprint AG
    const endDay = safeInt(endParts[2] ?? '1', 1); // Sprint AG
    return {
      date: r.start,
      endDate: r.end,
      type: 'mercury_retrograde' as const,
      name: '☿ Mercure Rétrograde',
      icon: '☿🔄',
      description: `Mercure apparaît reculer dans le ciel jusqu'au ${endDay} ${endMonth}. Communications, contrats, technologie et transports sont perturbés.`,
      effect: 'Relisez tout avant de signer. Sauvegardez vos données. Évitez les lancements et les achats tech importants. Période idéale pour REvisiter, REpenser, REcontacter.',
      intensity: 'forte' as const,
    };
  });
}

// Cache des prédictions par année (éclipses + phénomènes + mercure)
const _predictedCache: Record<number, LunarEvent[]> = {};

/** Retourne TOUS les événements (éclipses + Super/Micro Lunes + Blue Moon + Mercure Rétrograde) */
function getAllLunarEvents(year?: number): LunarEvent[] {
  if (!year) return LUNAR_EVENTS_HARDCODED;

  if (_predictedCache[year]) return _predictedCache[year];

  // 1. Éclipses : hardcodées OU prédites
  const eclipses = year <= HARDCODED_MAX_YEAR
    ? LUNAR_EVENTS_HARDCODED.filter(e => e.date.startsWith(String(year)))
    : predictEclipsesForYear(year);

  // 2. Phénomènes lunaires calculés : Super Lune, Micro Lune, Blue Moon
  const phenomena = predictLunarPhenomena(year);

  // 3. Mercure Rétrograde
  const mercury = getMercuryEventsForYear(year);

  // Dédupliquer : si une supermoon hardcodée existe déjà, ne pas doubler
  const hardcodedDates = new Set(eclipses.filter(e => e.type === 'supermoon' || e.type === 'micro_moon' || e.type === 'blue_moon').map(e => e.date));
  const uniquePhenomena = phenomena.filter(p => !hardcodedDates.has(p.date));

  // Éviter supermoon/micromoon le même jour qu'une éclipse lunaire (l'éclipse prime)
  const eclipseDates = new Set(eclipses.filter(e => e.type === 'eclipse_lunar').map(e => e.date));
  const filteredPhenomena = uniquePhenomena.filter(p =>
    !(p.type === 'supermoon' && eclipseDates.has(p.date)) &&
    !(p.type === 'micro_moon' && eclipseDates.has(p.date))
  );

  const all = [...eclipses, ...filteredPhenomena, ...mercury].sort((a, b) => a.date.localeCompare(b.date));
  _predictedCache[year] = all;
  return all;
}

/**
 * Retourne les événements lunaires proches (±15 jours) de la date donnée
 * + rétrogrades de Mercure en cours ou à venir
 * Utilise les données hardcodées (2025-2035) + prédictions automatiques au-delà
 */
export function getLunarEvents(date: Date = new Date()): (LunarEvent & { daysUntil: number; status: 'past' | 'today' | 'upcoming' | 'active' })[] {
  const now = date.getTime();
  const DAY = 86400000;
  const year = date.getFullYear();

  // Collecter les événements des années pertinentes (année courante ± 1)
  const allEvents = [
    ...getAllLunarEvents(year - 1),
    ...getAllLunarEvents(year),
    ...getAllLunarEvents(year + 1),
  ];

  return allEvents.map(ev => {
    const evDate = new Date(ev.date + 'T00:00:00').getTime();
    const diff = evDate - now;
    const daysUntil = Math.round(diff / DAY);

    // Pour Mercure rétrograde : vérifier si on est DANS la période
    let status: 'past' | 'today' | 'upcoming' | 'active';
    if (ev.endDate && ev.type === 'mercury_retrograde') {
      const endDate = new Date(ev.endDate + 'T23:59:59').getTime();
      if (now >= evDate && now <= endDate) {
        status = 'active';
      } else if (daysUntil === 0) {
        status = 'today';
      } else if (daysUntil > 0) {
        status = 'upcoming';
      } else {
        status = 'past';
      }
    } else {
      status = daysUntil === 0 ? 'today' : daysUntil > 0 ? 'upcoming' : 'past';
    }

    return { ...ev, daysUntil, status };
  })
  .filter(ev => {
    // Éclipses & phénomènes : fenêtre -3 à +15 jours
    if (ev.type !== 'mercury_retrograde') {
      return ev.daysUntil >= -3 && ev.daysUntil <= 15;
    }
    // Mercure rétrograde : montrer si actif, ou à venir dans 10 jours, ou terminé depuis ≤2 jours
    return ev.status === 'active' || (ev.daysUntil >= -2 && ev.daysUntil <= 10);
  })
  .sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Vérifie si Mercure est rétrograde à une date donnée (utile pour le scoring)
 */
// V2.9: Mercure gradué (audit Gemini: "pas un interrupteur ON/OFF")
// Phases : pré-ombre → stationnaire rétro → rétrograde → stationnaire direct → post-ombre
export type MercuryPhase = 'direct' | 'pre-shadow' | 'stationary-retro' | 'retrograde' | 'stationary-direct' | 'post-shadow';
export interface MercuryStatus {
  phase: MercuryPhase;
  points: number;       // Score impact (-6 to 0)
  label: string;        // French label
  daysLeft?: number;    // Jours restants dans cette phase
  conseil: string;      // Conseil tactique
}

const SHADOW_DAYS = 14;      // ~2 semaines d'ombre avant/après
const STATIONARY_DAYS = 2;   // ~2 jours stationnaire au début/fin

export function getMercuryStatus(date: Date = new Date()): MercuryStatus {
  const year = date.getFullYear();
  const now = date.getTime();
  const DAY = 86400000;

  // Collect retrogrades for this year and adjacent years
  const retros = [
    ...MERCURY_RETROGRADES.filter(r => {
      const y = parseInt(r.start.slice(0, 4));
      return y >= year - 1 && y <= year + 1;
    }),
    ...(year > MERCURY_HARDCODED_MAX_YEAR ? predictMercuryRetrogrades(year) : []),
  ];

  for (const r of retros) {
    const start = new Date(r.start + 'T00:00:00').getTime();
    const end = new Date(r.end + 'T23:59:59').getTime();
    const preShadow = start - SHADOW_DAYS * DAY;
    const postShadow = end + SHADOW_DAYS * DAY;
    const stationaryRetroEnd = start + STATIONARY_DAYS * DAY;
    const stationaryDirectStart = end - STATIONARY_DAYS * DAY;

    // Pré-ombre : 14 jours avant le début
    if (now >= preShadow && now < start) {
      const daysLeft = Math.ceil((start - now) / DAY);
      return {
        phase: 'pre-shadow', points: -1,
        label: 'Pré-ombre Mercure',
        daysLeft,
        conseil: `Mercure entre en zone d'ombre — commence à ralentir tes projets de communication (rétro dans ${daysLeft}j).`,
      };
    }
    // Stationnaire rétrograde : 2 premiers jours
    if (now >= start && now < stationaryRetroEnd) {
      return {
        phase: 'stationary-retro', points: -6,
        label: 'Mercure Stationnaire ☿⚡',
        conseil: 'Mercure s\'arrête avant de reculer — blocage maximal. Ne signe RIEN, ne lance RIEN aujourd\'hui.',
      };
    }
    // Rétrograde principal
    if (now >= stationaryRetroEnd && now < stationaryDirectStart) {
      const daysLeft = Math.ceil((end - now) / DAY);
      return {
        phase: 'retrograde', points: -4,
        label: 'Mercure Rétrograde ☿🔄',
        daysLeft,
        conseil: `Mercure rétrograde — REvisiter, REpenser, REcontacter. Éviter lancements et signatures (fin dans ${daysLeft}j).`,
      };
    }
    // Stationnaire direct : 2 derniers jours
    if (now >= stationaryDirectStart && now <= end) {
      return {
        phase: 'stationary-direct', points: -3,
        label: 'Mercure Stationnaire Direct ☿↑',
        conseil: 'Mercure reprend sa marche directe — la clarté revient. Finalisez les révisions avant de relancer.',
      };
    }
    // Post-ombre : 14 jours après la fin
    if (now > end && now <= postShadow) {
      const daysLeft = Math.ceil((postShadow - now) / DAY);
      return {
        phase: 'post-shadow', points: -1,
        label: 'Post-ombre Mercure',
        daysLeft,
        conseil: `Mercure sort de l'ombre — les malentendus se dissipent. Tu peux relancer progressivement (zone claire dans ${daysLeft}j).`,
      };
    }
  }

  // Direct — aucune influence rétro
  return {
    phase: 'direct', points: 0,
    label: 'Mercure Direct',
    conseil: 'Communications et décisions fluides.',
  };
}

// V2.9: Backward compatibility — retourne true si en phase rétro ou stationnaire
export function isMercuryRetrograde(date: Date = new Date()): boolean {
  const status = getMercuryStatus(date);
  return status.phase === 'retrograde' || status.phase === 'stationary-retro' || status.phase === 'stationary-direct';
}

/* ══ V2.9.1: RÉTROGRADES PLANÉTAIRES (Vénus, Mars, Jupiter, Saturne) ══ */
// Vénus rétro : ~40j tous les 18 mois — impact relations/finances/contrats (-2)
// Mars rétro : ~70j tous les 26 mois — impact énergie/action/lancement (-3)
// Jupiter rétro : ~4 mois/an — expansion ralentie (-1)
// Saturne rétro : ~4.5 mois/an — structures challengées (-1)
// Sources : NASA JPL Horizons, approximations ±2j

export type RetrogradePlanet = 'venus' | 'mars' | 'jupiter' | 'saturn';

export interface PlanetaryRetroStatus {
  planet: RetrogradePlanet;
  label: string;
  points: number;
  conseil: string;
  daysLeft?: number;
}

const VENUS_RETROGRADES: { start: string; end: string }[] = [
  { start: '2025-03-02', end: '2025-04-13' },
  { start: '2026-10-03', end: '2026-11-14' },
  { start: '2028-05-12', end: '2028-06-23' },
  { start: '2029-12-16', end: '2030-01-27' },
  { start: '2031-07-23', end: '2031-09-03' },
  { start: '2033-02-27', end: '2033-04-10' },
  { start: '2034-09-07', end: '2034-10-18' },
];

const MARS_RETROGRADES: { start: string; end: string }[] = [
  { start: '2024-12-06', end: '2025-02-23' },
  { start: '2027-01-10', end: '2027-04-01' },
  { start: '2029-02-28', end: '2029-05-18' },
  { start: '2031-05-14', end: '2031-07-31' },
  { start: '2033-07-28', end: '2033-10-14' },
  { start: '2035-10-17', end: '2036-01-01' },
];

const JUPITER_RETROGRADES: { start: string; end: string }[] = [
  { start: '2025-07-11', end: '2025-11-11' },
  { start: '2026-08-11', end: '2026-12-10' },
  { start: '2027-09-06', end: '2028-01-05' },
  { start: '2028-10-02', end: '2029-01-27' },
  { start: '2029-11-04', end: '2030-03-03' },
  { start: '2030-11-28', end: '2031-03-28' },
  { start: '2032-01-01', end: '2032-04-28' },
  { start: '2033-02-05', end: '2033-05-31' },
  { start: '2034-03-08', end: '2034-07-02' },
  { start: '2035-04-09', end: '2035-08-02' },
];

const SATURN_RETROGRADES: { start: string; end: string }[] = [
  { start: '2025-05-25', end: '2025-10-10' },
  { start: '2026-06-06', end: '2026-10-22' },
  { start: '2027-06-18', end: '2027-11-04' },
  { start: '2028-07-01', end: '2028-11-16' },
  { start: '2029-07-14', end: '2029-11-28' },
  { start: '2030-07-26', end: '2030-12-10' },
  { start: '2031-08-08', end: '2031-12-23' },
  { start: '2032-08-19', end: '2033-01-03' },
  { start: '2033-09-01', end: '2034-01-16' },
  { start: '2034-09-13', end: '2035-01-27' },
];

const PLANET_RETRO_CONFIG: Record<RetrogradePlanet, {
  data: { start: string; end: string }[];
  icon: string;
  labelFr: string;
  basePts: number;
  conseil: string;
  conseilPositif: string;
}> = {
  venus: {
    data: VENUS_RETROGRADES,
    icon: '♀',
    labelFr: 'Vénus',
    basePts: -2,
    conseil: 'Vénus rétrograde — relations et finances sous tension. Révise tes partenariats, évite les engagements financiers majeurs.',
    conseilPositif: 'Bon moment pour renouer d\'anciens contacts et revisiter tes valeurs.',
  },
  mars: {
    data: MARS_RETROGRADES,
    icon: '♂',
    labelFr: 'Mars',
    basePts: -2, // V5.5 : -3→-2 (rééquilibrage signal/bruit, audit R1)
    conseil: 'Mars rétrograde — énergie d\'action bloquée. Reports de lancements, frustrations, conflits latents. Canalise dans la stratégie.',
    conseilPositif: 'L\'action intérieure remplace l\'action extérieure — planifie au lieu de lancer.',
  },
  jupiter: {
    data: JUPITER_RETROGRADES,
    icon: '♃',
    labelFr: 'Jupiter',
    basePts: -1,
    conseil: 'Jupiter rétrograde — expansion ralentie. Croissance intérieure privilégiée, revois ta vision long terme.',
    conseilPositif: 'Période de maturation — les meilleures expansions naissent de la réflexion.',
  },
  saturn: {
    data: SATURN_RETROGRADES,
    icon: '♄',
    labelFr: 'Saturne',
    basePts: -1,
    conseil: 'Saturne rétrograde — structures challengées. Leçons karmiques amplifiées, révise tes fondations.',
    conseilPositif: 'Les structures qui résistent à l\'examen sont celles qui durent.',
  },
};

/** V2.9.1: Retourne les planètes en rétrograde à une date donnée */
export function getPlanetaryRetrogrades(date: Date = new Date()): PlanetaryRetroStatus[] {
  const now = date.getTime();
  const DAY = 86400000;
  const results: PlanetaryRetroStatus[] = [];
  const year = date.getFullYear();

  for (const [planet, config] of Object.entries(PLANET_RETRO_CONFIG) as [RetrogradePlanet, typeof PLANET_RETRO_CONFIG[RetrogradePlanet]][]) {
    for (const r of config.data) {
      const rYear = parseInt(r.start.slice(0, 4));
      if (rYear < year - 1 || rYear > year + 1) continue;

      const start = new Date(r.start + 'T00:00:00').getTime();
      const end = new Date(r.end + 'T23:59:59').getTime();

      if (now >= start && now <= end) {
        const daysLeft = Math.ceil((end - now) / DAY);
        results.push({
          planet,
          label: `${config.icon} ${config.labelFr} Rétrograde`,
          points: config.basePts,
          conseil: config.conseil,
          daysLeft,
        });
        break; // Une seule rétro active par planète
      }
    }
  }

  return results;
}

/** V2.9.1: Score combiné des rétrogrades planétaires (hors Mercure, traité séparément) */
export function getPlanetaryRetroScore(date: Date = new Date()): {
  totalPts: number;
  retros: PlanetaryRetroStatus[];
  label: string;
  detail: string;
} {
  const retros = getPlanetaryRetrogrades(date);

  if (retros.length === 0) {
    return { totalPts: 0, retros: [], label: 'Planètes directes', detail: 'Aucune rétrograde planétaire active — voie dégagée.' };
  }

  const totalPts = retros.reduce((sum, r) => sum + r.points, 0);
  const names = retros.map(r => r.label).join(' + ');
  const detail = retros.length >= 3
    ? `${retros.length} planètes rétrogrades simultanées — période d\'introspection profonde. Éviter les lancements majeurs.`
    : retros.length === 2
      ? `Double rétrograde active — prudence renforcée sur les décisions importantes.`
      : retros[0].conseil;

  return { totalPts, retros, label: names, detail };
}

/* ══ LUNE NATALE — INTERPRÉTATION PAR SIGNE ══ */

export interface NatalMoon {
  sign: string;
  needs: string;         // Besoins émotionnels
  instinct: string;      // Réaction instinctive
  security: string;      // Ce qui vous sécurise
  qualities: string;     // Forces émotionnelles
  vigilance: string;     // Ombre émotionnelle
  hack: string;          // Conseil concret pour entrepreneurs
  darkGift: string;      // Ce que votre ombre vous donne de spécial
}

const MOON_SIGNS: Record<string, NatalMoon> = {
  Aries: {
    sign: 'Bélier',
    needs: 'Vous avez besoin d\'action, de spontanéité et de défis pour vous sentir vivant émotionnellement.',
    instinct: 'Face au stress, vous foncez tête baissée. Votre première réaction est toujours l\'action — réfléchir vient après.',
    security: 'L\'indépendance et la liberté de mouvement. Vous étouffez si on vous contraint.',
    qualities: 'Courage émotionnel, réactivité, capacité à rebondir vite après un choc. Vous ne restez jamais longtemps à terre.',
    vigilance: 'L\'impatience émotionnelle peut blesser vos proches. Apprenez à compter jusqu\'à 3 avant de réagir.',
    hack: 'Planifiez vos décisions importantes le matin — votre Lune Bélier a son pic de clarté au réveil, avant que l\'agitation du jour ne brouille le signal.',
    darkGift: 'Votre impatience est en réalité un détecteur d\'urgence : quand vous vous agacez, c\'est souvent que quelque chose attend trop longtemps d\'être traité.'
  },
  Taurus: {
    sign: 'Taureau',
    needs: 'Vous avez besoin de stabilité, de confort sensoriel et de routines rassurantes.',
    instinct: 'Face au stress, vous vous ancrez et résistez au changement. Votre force est aussi votre rigidité.',
    security: 'La sécurité matérielle et affective. Vous avez besoin de savoir que le sol sous vos pieds est solide.',
    qualities: 'Loyauté émotionnelle profonde, patience, capacité à offrir un amour stable et constant.',
    vigilance: 'La possessivité et la résistance au changement. Ce que vous tenez, vous avez du mal à le lâcher — même quand il le faut.',
    hack: 'Vos meilleures décisions financières viennent après un bon repas — votre Lune Taureau pense mieux quand le corps est nourri. Ne négociez jamais le ventre vide.',
    darkGift: 'Votre possessivité est un instinct de préservation précieux : vous sentez avant les autres quand quelque chose de valeur est menacé.'
  },
  Gemini: {
    sign: 'Gémeaux',
    needs: 'Vous avez besoin de stimulation intellectuelle et de variété pour nourrir votre monde intérieur.',
    instinct: 'Face au stress, vous analysez, verbalisez, rationalisez. Parler vous aide à comprendre ce que vous ressentez.',
    security: 'La communication et le mouvement. L\'ennui est votre pire ennemi émotionnel.',
    qualities: 'Adaptabilité émotionnelle, humour comme soupape, capacité à voir plusieurs angles d\'un même problème.',
    vigilance: 'La superficialité émotionnelle. Vous pouvez intellectualiser vos émotions au lieu de les vivre vraiment.',
    hack: 'Écrivez vos idées immédiatement — votre Lune Gémeaux génère des connexions brillantes qui s\'évaporent en minutes. Un carnet ou une note vocale est votre meilleur allié.',
    darkGift: 'Votre intellectualisation émotionnelle vous permet d\'analyser les crises à froid pendant que les autres paniquent — c\'est un superpouvoir en négociation.'
  },
  Cancer: {
    sign: 'Cancer',
    needs: 'Vous avez besoin d\'un nid émotionnel sûr — famille, foyer, racines. L\'appartenance est vitale.',
    instinct: 'Face au stress, vous vous repliez dans votre coquille pour vous protéger. Votre sensibilité est votre radar.',
    security: 'Les liens familiaux et les souvenirs. Le passé vous ancre, la nostalgie vous nourrit.',
    qualities: 'Empathie profonde, mémoire émotionnelle, capacité à nourrir et protéger ceux que vous aimez.',
    vigilance: 'La tendance à s\'accrocher au passé et à prendre les choses trop personnellement. Tout n\'est pas une attaque.',
    hack: 'Faites vos présentations et vos pitchs dans un lieu familier — votre Lune Cancer performe quand elle se sent « chez elle ». Transformez votre bureau en cocon.',
    darkGift: 'Votre hypersensibilité aux critiques est un radar de fidélité : vous détectez instantanément qui est sincère et qui joue un rôle.'
  },
  Leo: {
    sign: 'Lion',
    needs: 'Vous avez besoin d\'être vu, reconnu et apprécié. La chaleur émotionnelle est votre oxygène.',
    instinct: 'Face au stress, vous cherchez à reprendre le contrôle par l\'action et la générosité. Donner vous restaure.',
    security: 'L\'admiration et l\'amour. Vous brillez quand on vous regarde briller.',
    qualities: 'Générosité émotionnelle, loyauté, capacité à réchauffer une pièce entière par votre présence.',
    vigilance: 'Le besoin d\'être au centre peut masquer une fragilité : la peur de ne pas être assez. Vous l\'êtes.',
    hack: 'Avant une décision difficile, demandez-vous « est-ce que ça me rend fier ? » — votre Lune Lion a un compas interne calibré sur l\'honneur, pas sur le profit.',
    darkGift: 'Votre ego n\'est pas un défaut — c\'est votre moteur. Il vous pousse à viser l\'excellence là où d\'autres se contentent de la moyenne.'
  },
  Virgo: {
    sign: 'Vierge',
    needs: 'Vous avez besoin d\'ordre, d\'utilité et de sentiment de compétence pour être en paix.',
    instinct: 'Face au stress, vous organisez, triez, nettoyez. Remettre de l\'ordre à l\'extérieur calme l\'intérieur.',
    security: 'Le contrôle par le détail et la préparation. L\'imprévu vous déstabilise.',
    qualities: 'Fiabilité émotionnelle, sens pratique du soin, capacité à aider concrètement plutôt qu\'avec des mots vides.',
    vigilance: 'L\'autocritique excessive. Vous êtes votre juge le plus sévère — accordez-vous la même bienveillance qu\'aux autres.',
    hack: 'Quand vous êtes bloqué, rangez votre espace de travail — votre Lune Vierge débloque la pensée en ordonnant le physique. Le tri extérieur crée la clarté intérieure.',
    darkGift: 'Votre perfectionnisme est un filtre qualité intégré : ce que vous livrez est toujours plus fiable que ce que les autres considèrent comme « fini ».'
  },
  Libra: {
    sign: 'Balance',
    needs: 'Vous avez besoin d\'harmonie relationnelle et de beauté. Le conflit vous épuise physiquement.',
    instinct: 'Face au stress, vous cherchez le compromis et l\'équilibre. Vous pesez le pour et le contre — parfois trop longtemps.',
    security: 'Les relations équilibrées et un environnement esthétique. La laideur et l\'injustice vous blessent.',
    qualities: 'Grâce émotionnelle, diplomatie naturelle, capacité à voir les deux côtés d\'une situation.',
    vigilance: 'L\'indécision et la dépendance au regard de l\'autre. Votre avis compte — osez le donner même s\'il déplaît.',
    hack: 'Ne prenez jamais de décision stratégique seul — votre Lune Balance a besoin d\'un sparring-partner pour cristalliser sa pensée. Un appel de 10 minutes suffit.',
    darkGift: 'Votre indécision est en fait un processeur parallèle : vous voyez simultanément les conséquences de chaque option, là où les autres foncent à l\'aveugle.'
  },
  Scorpio: {
    sign: 'Scorpion',
    needs: 'Vous avez besoin d\'intensité, de vérité et de connexion émotionnelle profonde. Le superficiel vous ennuie.',
    instinct: 'Face au stress, vous plongez dans l\'émotion plutôt que de la fuir. Votre radar détecte le mensonge instantanément.',
    security: 'Le contrôle et la loyauté absolue. Vous donnez tout — et attendez la même chose en retour.',
    qualities: 'Profondeur émotionnelle rare, résilience, capacité de transformation. Vous renaissez de vos cendres.',
    vigilance: 'La rancune et la méfiance. Pardonner n\'est pas oublier — mais c\'est vous libérer.',
    hack: 'Votre Lune Scorpion excelle en due diligence — fiez-vous à votre instinct quand quelque chose « sent mauvais » dans un deal, même si les chiffres sont bons.',
    darkGift: 'Votre méfiance est un système immunitaire social : vous repérez les manipulateurs et les opportunistes avant tout le monde.'
  },
  Sagittarius: {
    sign: 'Sagittaire',
    needs: 'Vous avez besoin de sens, d\'aventure et de liberté. L\'horizon doit toujours rester ouvert.',
    instinct: 'Face au stress, vous cherchez l\'évasion — voyage, philosophie, humour. Vous refusez de rester dans la lourdeur.',
    security: 'La confiance en l\'avenir et la liberté de mouvement. L\'optimisme est votre armure.',
    qualities: 'Optimisme contagieux, vision large, capacité à transformer les épreuves en apprentissages.',
    vigilance: 'La fuite émotionnelle déguisée en philosophie. Parfois, il faut rester et ressentir au lieu de relativiser.',
    hack: 'Fixez-vous un « horizon motivant » chaque trimestre — votre Lune Sagittaire s\'éteint sans objectif ambitieux. Un voyage, un lancement, une conférence : il vous faut un cap.',
    darkGift: 'Votre tendance à fuir est en réalité un instinct d\'exploration : vous trouvez des solutions dans des domaines que personne n\'a pensé à regarder.'
  },
  Capricorn: {
    sign: 'Capricorne',
    needs: 'Vous avez besoin de structure, de respect et de sentiment d\'accomplissement.',
    instinct: 'Face au stress, vous serrez les dents et vous travaillez plus dur. La discipline est votre refuge.',
    security: 'La compétence et la reconnaissance de vos réalisations. Vous construisez pour durer.',
    qualities: 'Endurance émotionnelle, maturité précoce, capacité à porter de lourdes responsabilités sans fléchir.',
    vigilance: 'La froideur apparente cache une sensibilité profonde. Laissez les autres voir votre vulnérabilité — c\'est une force, pas une faiblesse.',
    hack: 'Bloquez une heure « non négociable » par semaine sans productivité — votre Lune Capricorne a besoin de repos imposé, sinon elle ne s\'arrête jamais.',
    darkGift: 'Votre froideur apparente est une armure fonctionnelle : elle vous permet de prendre des décisions rationnelles dans les moments où les émotions paralysent les autres.'
  },
  Aquarius: {
    sign: 'Verseau',
    needs: 'Vous avez besoin de liberté intellectuelle et d\'un espace pour être différent sans jugement.',
    instinct: 'Face au stress, vous prenez du recul et observez avec détachement. L\'émotion brute vous met mal à l\'aise.',
    security: 'L\'indépendance et l\'authenticité. Vous refusez de jouer un rôle pour plaire.',
    qualities: 'Vision originale, tolérance, capacité à aimer sans posséder. Votre amour est libre et non-conventionnel.',
    vigilance: 'Le détachement émotionnel peut ressembler à de la froideur. Vos proches ont parfois besoin que vous soyez présent, pas juste brillant.',
    hack: 'Testez vos idées sur des gens « normaux » — votre Lune Verseau pense 3 ans en avance, mais vos clients vivent dans le présent. Traduisez votre vision en bénéfice immédiat.',
    darkGift: 'Votre détachement est une vision panoramique : pendant que les autres sont noyés dans l\'émotion d\'un problème, vous voyez déjà la solution systémique.'
  },
  Pisces: {
    sign: 'Poissons',
    needs: 'Vous avez besoin de connexion spirituelle, de beauté et d\'un espace pour rêver.',
    instinct: 'Face au stress, vous absorbez les émotions comme une éponge. Distinguer vos émotions de celles des autres est votre défi.',
    security: 'L\'amour inconditionnel et la possibilité de se retirer dans un monde intérieur riche.',
    qualities: 'Compassion infinie, créativité émotionnelle, capacité à comprendre la souffrance des autres sans jugement.',
    vigilance: 'La fuite dans l\'imaginaire et la difficulté à poser des limites. Vous n\'êtes pas responsable des émotions de tout le monde.',
    hack: 'Votre Lune Poissons capte l\'ambiance d\'une pièce en 30 secondes — utilisez cette antenne avant chaque réunion : si l\'énergie est « off », reportez les sujets sensibles.',
    darkGift: 'Votre porosité émotionnelle est une intelligence sociale de haut niveau : vous comprenez les non-dits et les motivations cachées mieux que n\'importe quel test psychométrique.'
  },
};

export function getNatalMoon(moonSign: string): NatalMoon | null {
  return MOON_SIGNS[moonSign] || null;
}

// ═══ NŒUDS LUNAIRES — SYSTÈME 11 (V2.5) ═══
// Consensus GPT+Grok : "manquant critique", priorité n°1
// Nœud Nord (Rahu) = direction karmique future, leçon de vie
// Nœud Sud (Ketu) = bagages du passé, zone de confort à dépasser
// Cycle : 18.613 ans — "Retour des Nœuds" = moment karmique majeur
// Formule : Meeus, longitude du nœud ascendant J2000.0

const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
const NODE_CYCLE_YEARS = 18.613; // cycle complet des nœuds en années

/** Longitude du Nœud Nord (ascendant) en degrés pour une date donnée */
function calcNorthNodeLongitude(date: Date): number {
  const daysSinceJ2000 = (date.getTime() - J2000) / 86400000;
  // Formule Meeus simplifiée — régression ~19.3549°/an
  const raw = (125.0445479 - 0.0529539 * daysSinceJ2000) % 360;
  return ((raw % 360) + 360) % 360;
}

/** Convertit une longitude en signe zodiacal */
function longitudeToSign(longitude: number): { sign: string; signEn: string; degree: number } {
  const SIGNS = [
    { fr: 'Bélier', en: 'Aries' },
    { fr: 'Taureau', en: 'Taurus' },
    { fr: 'Gémeaux', en: 'Gemini' },
    { fr: 'Cancer', en: 'Cancer' },
    { fr: 'Lion', en: 'Leo' },
    { fr: 'Vierge', en: 'Virgo' },
    { fr: 'Balance', en: 'Libra' },
    { fr: 'Scorpion', en: 'Scorpio' },
    { fr: 'Sagittaire', en: 'Sagittarius' },
    { fr: 'Capricorne', en: 'Capricorn' },
    { fr: 'Verseau', en: 'Aquarius' },
    { fr: 'Poissons', en: 'Pisces' },
  ];
  const idx = Math.floor(longitude / 30) % 12;
  const degree = Math.round((longitude % 30) * 10) / 10;
  return { sign: SIGNS[idx].fr, signEn: SIGNS[idx].en, degree };
}

/** Signe opposé (pour Nœud Sud) */
function oppositeSign(sign: string): string {
  const pairs: Record<string, string> = {
    'Bélier': 'Balance', 'Balance': 'Bélier',
    'Taureau': 'Scorpion', 'Scorpion': 'Taureau',
    'Gémeaux': 'Sagittaire', 'Sagittaire': 'Gémeaux',
    'Cancer': 'Capricorne', 'Capricorne': 'Cancer',
    'Lion': 'Verseau', 'Verseau': 'Lion',
    'Vierge': 'Poissons', 'Poissons': 'Vierge',
  };
  return pairs[sign] || sign;
}

// ── Interprétations par Nœud Nord ──

interface NodeInterpretation {
  mission: string;       // Ce que l'âme vient apprendre
  past: string;          // Ce que le Nœud Sud représente (zone de confort)
  challenge: string;     // Le défi principal
  gift: string;          // Le cadeau quand on l'intègre
  career: string;        // Impact professionnel
}

const NODE_NORTH_INTERPRETATIONS: Record<string, NodeInterpretation> = {
  'Bélier': {
    mission: 'Apprendre l\'autonomie, l\'initiative et le courage d\'agir seul.',
    past: 'Tu viens d\'un passé (Nœud Sud Balance) de compromis excessif, de dépendance aux autres, d\'évitement du conflit.',
    challenge: 'Oser prendre des décisions sans chercher l\'approbation — même si ça crée du désaccord.',
    gift: 'Leadership naturel et capacité à ouvrir des voies nouvelles.',
    career: 'Entrepreneuriat, postes de direction, rôles pionniers.',
  },
  'Taureau': {
    mission: 'Construire la stabilité, la patience et les valeurs solides.',
    past: 'Tu viens d\'un passé (Nœud Sud Scorpion) d\'intensité émotionnelle, de crises, de transformation permanente.',
    challenge: 'Accepter la simplicité et la constance au lieu de chercher le drame et l\'intensité.',
    gift: 'Sérénité intérieure et capacité à créer une abondance durable.',
    career: 'Finance, immobilier, artisanat de qualité, gestion de patrimoine.',
  },
  'Gémeaux': {
    mission: 'Développer la curiosité, la communication et l\'adaptabilité.',
    past: 'Tu viens d\'un passé (Nœud Sud Sagittaire) de grandes convictions, de dogmatisme, de vérités absolues.',
    challenge: 'Écouter autant que tu parles. Accepter que la vérité a plusieurs facettes.',
    gift: 'Polyvalence et capacité à connecter des mondes différents.',
    career: 'Communication, médias, enseignement, commerce, technologie.',
  },
  'Cancer': {
    mission: 'Apprendre la vulnérabilité, le soin et la connexion émotionnelle authentique.',
    past: 'Tu viens d\'un passé (Nœud Sud Capricorne) de contrôle, d\'ambition froide, de sacrifices émotionnels pour la réussite.',
    challenge: 'Laisser tomber l\'armure et accepter d\'avoir besoin des autres.',
    gift: 'Intelligence émotionnelle profonde et capacité à créer des espaces sûrs.',
    career: 'Accompagnement, immobilier, alimentation, tout ce qui nourrit.',
  },
  'Lion': {
    mission: 'Briller, s\'exprimer pleinement et assumer d\'être vu.',
    past: 'Tu viens d\'un passé (Nœud Sud Verseau) de retrait dans le groupe, de détachement émotionnel, de refus de se singulariser.',
    challenge: 'Accepter d\'être au centre sans culpabiliser. Ta lumière n\'enlève rien aux autres.',
    gift: 'Charisme naturel et capacité à inspirer par l\'exemple.',
    career: 'Création, leadership visible, spectacle, direction artistique.',
  },
  'Vierge': {
    mission: 'Développer la précision, le service concret et l\'humilité productive.',
    past: 'Tu viens d\'un passé (Nœud Sud Poissons) de rêverie, de fuite dans l\'imaginaire, de victimisation.',
    challenge: 'Passer du rêve à l\'action concrète. Servir au lieu de s\'apitoyer.',
    gift: 'Efficacité redoutable et capacité à améliorer tout ce que tu touches.',
    career: 'Santé, analyse, optimisation, artisanat de précision.',
  },
  'Balance': {
    mission: 'Apprendre le partenariat, la diplomatie et l\'harmonie relationnelle.',
    past: 'Tu viens d\'un passé (Nœud Sud Bélier) d\'individualisme, d\'impulsivité, de guerre solitaire.',
    challenge: 'Accepter que la collaboration n\'est pas une faiblesse mais un amplificateur.',
    gift: 'Art de la négociation et capacité à créer des alliances puissantes.',
    career: 'Droit, médiation, design, relations publiques, partenariats stratégiques.',
  },
  'Scorpion': {
    mission: 'Explorer la profondeur, la transformation et le pouvoir partagé.',
    past: 'Tu viens d\'un passé (Nœud Sud Taureau) de confort matériel, de routine, de résistance au changement.',
    challenge: 'Accepter de perdre pour mieux renaître. Le contrôle est une illusion.',
    gift: 'Pouvoir de régénération et capacité à voir au-delà des apparences.',
    career: 'Psychologie, finance complexe, recherche, investigation, gestion de crise.',
  },
  'Sagittaire': {
    mission: 'Élargir tes horizons, trouver un sens supérieur et enseigner.',
    past: 'Tu viens d\'un passé (Nœud Sud Gémeaux) de dispersion, de bavardage, de savoir superficiel.',
    challenge: 'Approfondir au lieu de survoler. Trouver TA vérité et la vivre.',
    gift: 'Vision globale et capacité à donner du sens à l\'expérience humaine.',
    career: 'Enseignement, édition, voyage, philosophie, entrepreneuriat international.',
  },
  'Capricorne': {
    mission: 'Construire des structures durables, assumer l\'autorité et laisser un héritage.',
    past: 'Tu viens d\'un passé (Nœud Sud Cancer) de dépendance émotionnelle, de refuge dans le cocon familial.',
    challenge: 'Sortir du nid pour bâtir quelque chose de plus grand que ta zone de confort.',
    gift: 'Autorité naturelle et capacité à construire des empires qui durent.',
    career: 'Direction d\'entreprise, politique, architecture, toute position d\'autorité durable.',
  },
  'Verseau': {
    mission: 'Servir le collectif, innover et libérer les systèmes obsolètes.',
    past: 'Tu viens d\'un passé (Nœud Sud Lion) d\'ego centré, de besoin de reconnaissance personnelle.',
    challenge: 'Mettre ton talent au service d\'une cause plus grande que toi.',
    gift: 'Vision révolutionnaire et capacité à transformer les systèmes.',
    career: 'Technologie, humanitaire, innovation sociale, communautés.',
  },
  'Poissons': {
    mission: 'Développer la compassion, l\'intuition et la connexion spirituelle.',
    past: 'Tu viens d\'un passé (Nœud Sud Vierge) d\'hypercontrôle, de critique, d\'obsession du détail.',
    challenge: 'Lâcher le besoin de tout comprendre rationnellement. Faire confiance à l\'invisible.',
    gift: 'Sagesse intuitive et capacité à guérir par la présence.',
    career: 'Art, spiritualité, thérapie, musique, tout ce qui touche l\'âme.',
  },
};

// ── Interfaces exports ──

export interface LunarNodes {
  northNode: {
    sign: string;
    signEn: string;
    degree: number;
    longitude: number;
  };
  southNode: {
    sign: string;
  };
  interpretation: NodeInterpretation;
}

export interface LunarNodeTransit {
  current: LunarNodes;
  natal: LunarNodes;
  isNodeReturn: boolean;          // true si retour des nœuds (±1 an)
  nodeReturnAge: number | null;   // âge du retour le plus proche
  nodeReturnYear: number | null;  // année du retour
  alignment: 'conjoint' | 'opposé' | 'carré' | 'trigone' | 'neutre';
  alignmentDesc: string;
}

// ── Calculs exports ──

/** Calcule les nœuds lunaires pour une date donnée */
export function calcLunarNodes(dateStr: string): LunarNodes {
  const date = new Date(dateStr + 'T12:00:00Z');
  const longitude = calcNorthNodeLongitude(date);
  const { sign, signEn, degree } = longitudeToSign(longitude);
  const southSign = oppositeSign(sign);
  const interp = NODE_NORTH_INTERPRETATIONS[sign] || NODE_NORTH_INTERPRETATIONS['Bélier'];

  return {
    northNode: { sign, signEn, degree, longitude },
    southNode: { sign: southSign },
    interpretation: interp,
  };
}

/** Retour des nœuds : calcule les âges/années où les nœuds reviennent à la position natale */
function calcNodeReturns(birthDate: string, today: string): { age: number; year: number; type: 'return' | 'inverse' }[] {
  const birthYear = safeInt(birthDate.split('-')[0] ?? '2000', 2000); // Sprint AG
  const currentYear = safeInt(today.split('-')[0] ?? '2025', 2025); // Sprint AG
  const returns: { age: number; year: number; type: 'return' | 'inverse' }[] = [];

  // Retours : ~18.6, ~37.2, ~55.8, ~74.4 ans
  // Inversions (nœuds opposés) : ~9.3, ~27.9, ~46.5, ~65.1 ans
  for (let i = 1; i <= 5; i++) {
    const returnAge = Math.round(NODE_CYCLE_YEARS * i * 10) / 10;
    const returnYear = birthYear + Math.round(returnAge);
    if (returnYear <= currentYear + 10) {
      returns.push({ age: Math.round(returnAge), year: returnYear, type: 'return' });
    }

    const inverseAge = Math.round(NODE_CYCLE_YEARS * (i - 0.5) * 10) / 10;
    const inverseYear = birthYear + Math.round(inverseAge);
    if (inverseYear <= currentYear + 10) {
      returns.push({ age: Math.round(inverseAge), year: inverseYear, type: 'inverse' });
    }
  }

  return returns.sort((a, b) => a.year - b.year);
}

/** Angle entre deux longitudes (0-180°) */
function angleBetween(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/** Transit complet des nœuds : natal vs actuel + retours */
export function getLunarNodeTransit(birthDate: string, today: string): LunarNodeTransit {
  const natal = calcLunarNodes(birthDate);
  const current = calcLunarNodes(today);
  const returns = calcNodeReturns(birthDate, today);

  const currentAge = safeInt(today.split('-')[0] ?? '2025') - safeInt(birthDate.split('-')[0] ?? '2000'); // Sprint AG

  // Détecter si on est dans un retour (±1 an)
  const closestReturn = returns.find(r => Math.abs(r.age - currentAge) <= 1 && r.type === 'return');
  const isNodeReturn = !!closestReturn;

  // Prochain retour futur
  const nextReturn = returns.find(r => r.year > safeInt(today.split('-')[0] ?? '2025') && r.type === 'return'); // Sprint AG

  // Aspect natal ↔ transit
  const angle = angleBetween(natal.northNode.longitude, current.northNode.longitude);
  let alignment: LunarNodeTransit['alignment'];
  let alignmentDesc: string;

  if (angle < 15) {
    alignment = 'conjoint';
    alignmentDesc = '⚡ Retour des Nœuds — moment karmique majeur. Ta direction de vie est réactivée avec une intensité maximale.';
  } else if (Math.abs(angle - 180) < 15) {
    alignment = 'opposé';
    alignmentDesc = '🔄 Inversion des Nœuds — tension entre passé et futur. Ce qui te retient (Nœud Sud) réclame ton attention avant d\'avancer.';
  } else if (Math.abs(angle - 90) < 15 || Math.abs(angle - 270) < 15) {
    alignment = 'carré';
    alignmentDesc = '⚔️ Carré nodal — crise de croissance. Tu es poussé à choisir entre confort et évolution. L\'inconfort est le signe que tu avances.';
  } else if (Math.abs(angle - 120) < 15 || Math.abs(angle - 240) < 15) {
    alignment = 'trigone';
    alignmentDesc = '🌊 Trigone nodal — flux favorable. Ta mission de vie avance naturellement, les synchronicités se multiplient.';
  } else {
    alignment = 'neutre';
    alignmentDesc = 'Phase de maturation. Les nœuds lunaires travaillent en arrière-plan — continue sur ta lancée.';
  }

  return {
    current,
    natal,
    isNodeReturn,
    nodeReturnAge: nextReturn ? nextReturn.age : null,
    nodeReturnYear: nextReturn ? nextReturn.year : null,
    alignment,
    alignmentDesc,
  };
}

/** Retourne les moments-clés des nœuds pour la life-timeline */
export function getNodeKeyMoments(birthDate: string): { age: number; year: number; label: string; type: 'return' | 'inverse' }[] {
  const birthYear = safeInt(birthDate.split('-')[0] ?? '2000', 2000); // Sprint AG
  const returns = calcNodeReturns(birthDate, `${birthYear + 100}-01-01`);

  return returns
    .filter(r => r.age <= 85)
    .map(r => ({
      ...r,
      label: r.type === 'return'
        ? `↻ Retour des Nœuds (${r.age} ans) — réactivation de la mission karmique`
        : `⇄ Inversion des Nœuds (${r.age} ans) — tension passé/futur, choix crucial`,
    }));
}

// ═══ TRANSIT LUNAIRE QUOTIDIEN (V2.4) ═══
// Formule Meeus simplifiée — cycle sidéral 27.32166 jours
// Précision ±1 jour sur le signe (validée 19/02/2026 = Bélier ✅)

const MOON_SIGN_NAMES = [
  'Bélier', 'Taureau', 'Gémeaux', 'Cancer', 'Lion', 'Vierge',
  'Balance', 'Scorpion', 'Sagittaire', 'Capricorne', 'Verseau', 'Poissons'
] as const;

export const MOON_SIGN_ELEMENTS: Record<string, string> = {
  'Bélier': 'fire', 'Lion': 'fire', 'Sagittaire': 'fire',
  'Taureau': 'earth', 'Vierge': 'earth', 'Capricorne': 'earth',
  'Gémeaux': 'air', 'Balance': 'air', 'Verseau': 'air',
  'Cancer': 'water', 'Scorpion': 'water', 'Poissons': 'water',
};

export interface MoonTransit {
  sign: string;
  element: string;
  icon: string;
}

export function getMoonTransit(targetDate: string): MoonTransit {
  const target = new Date(targetDate + 'T12:00:00Z');
  const refDate = new Date('2000-01-01T00:00:00Z');
  const daysSinceRef = (target.getTime() - refDate.getTime()) / 86400000;

  // Longitude moyenne lunaire (Meeus, constantes J2000.0)
  let moonLong = (13.1763966 * daysSinceRef + 218.316547) % 360;
  if (moonLong < 0) moonLong += 360;

  const signIndex = Math.floor(moonLong / 30) % 12;
  const sign = MOON_SIGN_NAMES[signIndex];
  const element = MOON_SIGN_ELEMENTS[sign] || 'fire';

  const icons: Record<string, string> = {
    'Bélier': '♈', 'Taureau': '♉', 'Gémeaux': '♊', 'Cancer': '♋',
    'Lion': '♌', 'Vierge': '♍', 'Balance': '♎', 'Scorpion': '♏',
    'Sagittaire': '♐', 'Capricorne': '♑', 'Verseau': '♒', 'Poissons': '♓',
  };

  return { sign, element, icon: icons[sign] || '☽' };
}

// ═══════════════════════════════════════════════════════════════════════
// V4.2: VOID OF COURSE MOON (Lune Hors Cours)
// La Lune est "void of course" quand elle ne forme plus d'aspect majeur
// (conjonction, sextile, carré, trigone, opposition) avant de quitter son signe.
// Traditionnellement : ne rien lancer d'important pendant cette période.
// DÉFINITION : seuil VOC_THRESHOLD_DEG degrés restants + aucun aspect Soleil
// NOTE : seul le Soleil est vérifié (astre le plus influent, positions approx.)
// V9 Sprint 7b : constantes nommées + vocStartHoursAgo + classe faible déclarée
// ═══════════════════════════════════════════════════════════════════════

// Constantes nommées pour transparence algorithmique
export const VOC_THRESHOLD_DEG    = 8;    // degrés restants déclenchant la VoC
export const VOC_SPEED_DEG_PER_H  = 0.55; // vitesse moyenne Lune (~13.2°/jour)
export const VOC_FORTE_DEG        = 3;    // ≤ 3° → intensité forte
export const VOC_ASPECT_ORB       = 8;    // orbe aspects majeurs (Soleil)

export interface VoidOfCourseMoon {
  isVoC: boolean;              // true si la Lune est hors cours maintenant
  degreesLeft: number;         // degrés restants dans le signe actuel
  hoursUntilSignChange: number; // heures estimées avant changement de signe
  vocStartHoursAgo: number;    // heures écoulées depuis début VoC estimé (0 si non-VoC)
  nextSign: string;            // prochain signe lunaire
  advice: string;              // conseil stratégique
  intensity: 'forte' | 'moyenne' | 'faible'; // forte ≤3° / moyenne 3-8° / faible=non-VoC
}

/**
 * Calcule si la Lune est Void of Course pour une date donnée.
 * Utilise la longitude moyenne lunaire et les positions planétaires approximées
 * pour détecter l'absence d'aspects majeurs avant le changement de signe.
 */
export function getVoidOfCourseMoon(targetDate: string): VoidOfCourseMoon {
  const target = new Date(targetDate + 'T12:00:00Z');
  const refDate = new Date('2000-01-01T00:00:00Z');
  const daysSinceRef = (target.getTime() - refDate.getTime()) / 86400000;

  // Longitude moyenne lunaire
  let moonLong = (13.1763966 * daysSinceRef + 218.316547) % 360;
  if (moonLong < 0) moonLong += 360;

  // Position dans le signe actuel (0-30°)
  const positionInSign = moonLong % 30;
  const degreesLeft = 30 - positionInSign;

  // Heures estimées avant changement de signe (vitesse constante VOC_SPEED_DEG_PER_H)
  const hoursUntilSignChange = Math.round(degreesLeft / VOC_SPEED_DEG_PER_H * 10) / 10;

  // Longitude solaire approximative (~1°/jour)
  let sunLong = (0.9856474 * daysSinceRef + 280.46646) % 360;
  if (sunLong < 0) sunLong += 360;

  // Aspects majeurs : 0° (conj), 60° (sext), 90° (carré), 120° (trig), 180° (opp)
  // Orbe : VOC_ASPECT_ORB° — seul le Soleil est vérifié (astre le plus influent)
  const ASPECTS = [0, 60, 90, 120, 180];

  // Vérifier si la Lune formera un aspect au Soleil dans les degrés restants
  let hasAspectAhead = false;
  for (let dAhead = 0; dAhead < degreesLeft; dAhead += 0.5) {
    const futureMoonLong = (moonLong + dAhead) % 360;
    const diff = Math.abs(futureMoonLong - sunLong);
    const angle = diff > 180 ? 360 - diff : diff;
    for (const aspect of ASPECTS) {
      if (Math.abs(angle - aspect) <= VOC_ASPECT_ORB) {
        hasAspectAhead = true;
        break;
      }
    }
    if (hasAspectAhead) break;
  }

  // VoC = dans les derniers VOC_THRESHOLD_DEG degrés du signe ET pas d'aspect devant
  const isVoC = degreesLeft <= VOC_THRESHOLD_DEG && !hasAspectAhead;

  // Estimation du temps écoulé depuis début VoC : (VOC_THRESHOLD_DEG - degreesLeft) / speed
  const vocStartHoursAgo = isVoC
    ? Math.round((VOC_THRESHOLD_DEG - degreesLeft) / VOC_SPEED_DEG_PER_H * 10) / 10
    : 0;

  // Prochain signe
  const nextSignIdx = (Math.floor(moonLong / 30) + 1) % 12;
  const nextSign = MOON_SIGN_NAMES[nextSignIdx];

  // Intensité et conseil
  // forte  : ≤ VOC_FORTE_DEG° restants → VoC profonde, impact maximal
  // moyenne : VOC_FORTE_DEG < degrés ≤ VOC_THRESHOLD_DEG → VoC établie
  // faible  : non-VoC → Lune active, actions normales
  let advice: string;
  let intensity: 'forte' | 'moyenne' | 'faible';

  if (isVoC && degreesLeft <= VOC_FORTE_DEG) {
    intensity = 'forte';
    advice = `Lune Hors Cours — ne lance rien d'important. Les actions initiées maintenant n'aboutissent pas. Attends le passage en ${nextSign} (~${hoursUntilSignChange}h).`;
  } else if (isVoC) {
    intensity = 'moyenne';
    advice = `Lune en fin de signe (~${degreesLeft.toFixed(0)}° restants, VoC depuis ~${vocStartHoursAgo}h). Période de flottement — termine ce qui est en cours, mais ne lance pas de nouveau projet.`;
  } else {
    intensity = 'faible';
    advice = `Lune active en ${MOON_SIGN_NAMES[Math.floor(moonLong / 30) % 12]} — les actions portent leurs fruits normalement.`;
  }

  return { isVoC, degreesLeft: Math.round(degreesLeft * 10) / 10, hoursUntilSignChange, vocStartHoursAgo, nextSign, advice, intensity };
}

// ═══════════════════════════════════════════════════════════════════════
// V2.9.2: Export wrappers pour temporal.ts
// Expose les données internes sans modifier les tableaux existants
// ═══════════════════════════════════════════════════════════════════════

export interface EclipseListItem {
  date: string;
  type: string;   // 'solaire' | 'lunaire'
}

/**
 * V2.9.2: Retourne la liste des éclipses 2025-2035.
 * Filtre LUNAR_EVENTS_HARDCODED pour ne garder que les éclipses.
 * Format compatible avec temporal.ts > findNextEclipse().
 */
export function getEclipseList(): EclipseListItem[] {
  return LUNAR_EVENTS_HARDCODED
    .filter(e => e.type === 'eclipse_solar' || e.type === 'eclipse_lunar')
    .map(e => ({
      date: e.date,
      type: e.type === 'eclipse_solar' ? 'solaire' : 'lunaire',
    }));
}

export interface RetroScheduleItem {
  planet: string;
  start: string;
  end: string;
}

/**
 * V2.9.2: Retourne le calendrier complet des rétrogrades (Mercure + 4 planètes).
 * Combine les 5 tableaux internes, trié par date de début.
 * Format compatible avec temporal.ts > findNextRetrograde().
 */
export function getRetroSchedule(): RetroScheduleItem[] {
  const all: RetroScheduleItem[] = [];

  for (const r of MERCURY_RETROGRADES) {
    all.push({ planet: 'Mercure', start: r.start, end: r.end });
  }
  for (const r of VENUS_RETROGRADES) {
    all.push({ planet: 'Vénus', start: r.start, end: r.end });
  }
  for (const r of MARS_RETROGRADES) {
    all.push({ planet: 'Mars', start: r.start, end: r.end });
  }
  for (const r of JUPITER_RETROGRADES) {
    all.push({ planet: 'Jupiter', start: r.start, end: r.end });
  }
  for (const r of SATURN_RETROGRADES) {
    all.push({ planet: 'Saturne', start: r.start, end: r.end });
  }

  return all.sort((a, b) => a.start.localeCompare(b.start));
}

// ══════════════════════════════════════════════════════════════════
// ═══ V5.4 : ÉCLIPSES SUR POINTS NATAUX ═══════════════════════════
// ══════════════════════════════════════════════════════════════════
// Doctrine GPT R1 : orbe ±3°, activation -90j → +180j (3 mois avant → 6 mois après)
// Solaire = nouveau départ · Lunaire = culmination/révélation
// Zéro import : moon.ts self-contained — les longitudes natales
// sont calculées par le caller (convergence.ts) via planetPosToLong.

/** Un hit éclipse × point natal */
export interface EclipseNatalHit {
  eclipseDate:  string;         // YYYY-MM-DD
  eclipseType:  'eclipse_solar' | 'eclipse_lunar';
  eclipseName:  string;
  natalPoint:   string;         // 'sun' | 'moon' | 'asc' | 'mc'
  eclipseLong:  number;         // longitude de l'éclipse (0-360°)
  natalLong:    number;         // longitude du point natal
  orbDeg:       number;         // écart en degrés
  daysDelta:    number;         // jours depuis l'éclipse (négatif = avant)
  intensity:    number;         // 0-1 (gaussienne orbe × proximité temporelle)
  score:        number;         // signé, plafonné par amplitude
  narrative:    string;
}

/** Résultat complet des éclipses natales */
export interface EclipseNatalResult {
  total:     number;              // cap ±6
  hits:      EclipseNatalHit[];
  breakdown: string[];
}

// ── Amplitudes par (type éclipse × point natal) ──
const ECLIPSE_NATAL_AMP: Record<string, Record<string, number>> = {
  eclipse_solar: { sun: 3.5, moon: 2.5, asc: 3.0, mc: 2.5 },
  eclipse_lunar: { sun: 2.0, moon: 3.0, asc: 1.5, mc: 2.0 },
};

// ── Narratives (type × point) ──
const ECLIPSE_NATAL_NARR: Record<string, Record<string, string>> = {
  eclipse_solar: {
    sun:  'Éclipse solaire sur ton Soleil natal : reset identitaire majeur — nouveau chapitre.',
    moon: 'Éclipse solaire sur ta Lune natale : réinitialisation émotionnelle profonde.',
    asc:  'Éclipse solaire sur ton Ascendant : transformation de ta présence dans le monde.',
    mc:   'Éclipse solaire sur ton MC : fenêtre de redéfinition professionnelle ou publique.',
  },
  eclipse_lunar: {
    sun:  'Éclipse lunaire sur ton Soleil natal : révélation sur ta direction — laisse émerger.',
    moon: 'Éclipse lunaire sur ta Lune natale : culmination émotionnelle — ce cycle se conclut.',
    asc:  'Éclipse lunaire sur ton Ascendant : prise de conscience sur ton identité perçue.',
    mc:   'Éclipse lunaire sur ton MC : clôture d\'une phase professionnelle ou publique.',
  },
};

/**
 * Longitude approchée du Soleil à une date donnée.
 * Précision ±1.5° (Meeus simplifié) — suffisant pour orbes de ±3°.
 */
function approxSunLongitude(date: Date): number {
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const d = (date.getTime() - J2000) / 86400000;
  return ((280.46 + 0.9856474 * d) % 360 + 360) % 360;
}

/**
 * Calcule les impacts d'éclipses sur les points nataux.
 *
 * @param natalLongs  Longitudes 0-360° des points nataux
 *                    { sun, moon, asc, mc } — les clés absentes sont ignorées.
 * @param date        Date du jour (défaut : aujourd'hui)
 * @returns EclipseNatalResult avec total cappé ±6
 */
export function getEclipseNatalImpacts(
  natalLongs: Partial<Record<'sun' | 'moon' | 'asc' | 'mc', number>>,
  date: Date = new Date()
): EclipseNatalResult {
  const hits:     EclipseNatalHit[] = [];
  const breakdown: string[]         = [];
  let   total = 0;

  const nowMs  = date.getTime();
  const DAY_MS = 86400000;
  // Fenêtre d'activation : -90j (3 mois avant) → +180j (6 mois après)
  const WIN_BEFORE = 90  * DAY_MS;
  const WIN_AFTER  = 180 * DAY_MS;

  const ORB_DEG    = 3.0;
  const ORB_SIGMA  = 1.2;  // gaussienne orbe
  const TIME_SIGMA = 45;   // gaussienne temporelle (jours)

  const natalEntries = Object.entries(natalLongs) as Array<['sun' | 'moon' | 'asc' | 'mc', number]>;
  if (natalEntries.length === 0) return { total: 0, hits: [], breakdown: [] };

  // Éclipses uniquement (pas supermoon/retrograde)
  const currentYear = date.getFullYear();
  const allEclipses = [
    ...getAllLunarEvents(currentYear - 1),
    ...getAllLunarEvents(currentYear),
    ...getAllLunarEvents(currentYear + 1),
  ].filter(ev => ev.type === 'eclipse_solar' || ev.type === 'eclipse_lunar');

  for (const eclipse of allEclipses) {
    const eclMs    = new Date(eclipse.date + 'T00:00:00').getTime();
    const deltaMs  = nowMs - eclMs;      // positif = éclipse passée
    const deltaDays = deltaMs / DAY_MS;

    // Hors fenêtre → skip
    if (deltaMs < -WIN_BEFORE || deltaMs > WIN_AFTER) continue;

    const eclipseDate = new Date(eclipse.date + 'T12:00:00');
    const sunLong     = approxSunLongitude(eclipseDate);
    // Solaire → longitude Soleil ; Lunaire → longitude Lune (Soleil + 180°)
    const eclipseLong = eclipse.type === 'eclipse_solar'
      ? sunLong
      : ((sunLong + 180) % 360);

    for (const [point, natalLong] of natalEntries) {
      const orb = angleBetween(eclipseLong, natalLong);
      if (orb > ORB_DEG) continue;

      // Intensité : gaussienne orbe × gaussienne temporelle
      const orbFactor  = Math.exp(-(orb * orb) / (2 * ORB_SIGMA * ORB_SIGMA));
      const timeFactor = Math.exp(-(deltaDays * deltaDays) / (2 * TIME_SIGMA * TIME_SIGMA));
      const intensity  = +(orbFactor * timeFactor).toFixed(3);

      const amp      = ECLIPSE_NATAL_AMP[eclipse.type]?.[point] ?? 2.0;
      const score    = +(amp * intensity).toFixed(2);
      const narrative = ECLIPSE_NATAL_NARR[eclipse.type]?.[point] ?? '';

      const hit: EclipseNatalHit = {
        eclipseDate:  eclipse.date,
        eclipseType:  eclipse.type as 'eclipse_solar' | 'eclipse_lunar',
        eclipseName:  eclipse.name,
        natalPoint:   point,
        eclipseLong:  +eclipseLong.toFixed(2),
        natalLong:    +natalLong.toFixed(2),
        orbDeg:       +orb.toFixed(2),
        daysDelta:    +deltaDays.toFixed(0),
        intensity,
        score,
        narrative,
      };

      hits.push(hit);
      total += score;
      const timing = deltaDays < -14 ? `dans ${Math.abs(Math.round(deltaDays))}j`
                   : deltaDays < 0   ? `dans ${Math.abs(Math.round(deltaDays))}j ⚡`
                   : deltaDays < 14  ? `il y a ${Math.round(deltaDays)}j ⚡`
                   :                   `il y a ${Math.round(deltaDays)}j`;
      breakdown.push(`🌑 ${eclipse.name} (${timing}) sur ${point.toUpperCase()} natal (orbe ${orb.toFixed(1)}°, +${score.toFixed(1)})`);
    }
  }

  // Cap ±6 (doctrine V5.4)
  total = Math.max(-6, Math.min(6, +total.toFixed(1)));

  console.assert(Math.abs(total) <= 6.1, '[EclipseNatal] Cap ±6 percé:', total);

  return { total, hits, breakdown };
}
