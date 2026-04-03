import { useState, useEffect, useMemo, useCallback } from 'react';
import { sto } from '../engines/storage';
import { type SoulData } from '../App';
import { SIGNS, SIGN_FR, SIGN_SYM, SIGN_ELEM, PLANET_FR, PLANET_SYM, ASPECT_SYM, ASPECT_COL, ELEM_FR, ELEM_COL, DIG_SYM, DIG_FR, getPlanetHousePlacidus, type AstroChart, type Stellium, type DominantPlanet, type GrandTrine, type TSquare } from '../engines/astrology';
import { getPlanetSignDesc } from '../engines/astro-descriptions';
import { Sec, Cd, P, SectionGroup, a11yClick } from './ui';
// Phase 3d — calculs purs extraits dans useAstroComputed
import { useAstroComputed } from '../hooks/useAstroComputed';

// === Domaines de vie par maison (unique source de vérité) ===
const HOUSE_DOMAIN: Record<number, string> = {
  1: 'Identité', 2: 'Finances', 3: 'Communication', 4: 'Foyer',
  5: 'Créativité', 6: 'Santé', 7: 'Relations', 8: 'Transformations',
  9: 'Sagesse', 10: 'Carrière', 11: 'Projets', 12: 'Spiritualité',
};

// === Labels courts pour la roue ===
const PL_SHORT: Record<string, string> = { sun:'So', moon:'Lu', mercury:'Me', venus:'Vé', mars:'Ma', jupiter:'Ju', saturn:'Sa', uranus:'Ur', neptune:'Ne', pluto:'Pl', northNode:'☊', southNode:'☋', chiron:'⚷', lilith:'⚸' };

// === Ce que chaque planète représente EN TOI (langage humain) ===
const PL_HUMAN: Record<string, string> = {
  sun: 'ton identité', moon: 'ton monde émotionnel', mercury: 'ta pensée', venus: 'ton cœur',
  mars: 'ton énergie', jupiter: 'ta chance', saturn: 'ta structure',
  uranus: 'ton originalité', neptune: 'ton intuition', pluto: 'ta transformation',
  northNode: 'ta direction de vie', southNode: 'ton héritage passé',
  chiron: 'ton point de sensibilité profonde', lilith: 'ta part sauvage',
};

// === Verbes d'aspect en langage naturel (pour lecture de thème) ===
const ASPECT_HUMAN: Record<string, string> = {
  conjunction: 'fusionne avec', opposition: 'doit composer avec',
  trine: 'nourrit naturellement', square: 'est en tension créative avec',
  sextile: 'ouvre des portes à',
  quincunx: 'est en ajustement avec',
  sesquisquare: 'est en friction subtile avec',
};

// ══════════════════════════════════════
// PORTRAIT ASTRAL IA — V8.5
// buildNatalContext : sérialise le thème natal → ~180 tokens pour Claude API
// Doctrine R30 Grok : signal/bruit optimal — P1 seulement
// ══════════════════════════════════════

function buildNatalContext(astro: AstroChart): string {
  const pFR = (k: string) => PLANET_FR[k] || k;
  const sFR = (k: string) => SIGN_FR[k] || k;
  const eFR = (k: string) => ELEM_FR[k] || k;
  const parts: string[] = [];
  parts.push(`Soleil : ${sFR(astro.b3.sun)}`);
  parts.push(`Lune : ${sFR(astro.b3.moon)}`);
  parts.push(`Ascendant : ${sFR(astro.b3.asc)}`);
  if (astro.mcSign) parts.push(`MC : ${sFR(astro.mcSign)}`);
  if (astro.dominant?.length) parts.push(`Dominante : ${pFR(astro.dominant[0].planet)}`);
  astro.stelliums?.forEach((s: Stellium) => {
    if (s.planets.length >= 3)
      parts.push(`Stellium ${s.type} ${s.name} (${s.planets.length} planètes) : ${s.planets.map(pFR).join(', ')}`);
  });
  astro.grandTrines?.forEach((gt: GrandTrine) => {
    parts.push(`Grand Trigone ${eFR(gt.element)} : ${gt.planets.map(pFR).join(' – ')}`);
  });
  astro.tSquares?.forEach((ts: TSquare) => {
    parts.push(`T-Carré apex ${pFR(ts.apex)} (opposition : ${ts.opposition.map(pFR).join(' / ')})`);
  });
  const topAspects = [...(astro.as || [])].sort((a, b) => a.o - b.o).slice(0, 8);
  if (topAspects.length)
    parts.push(`Aspects serrés : ${topAspects.map(a => `${pFR(a.p1)}-${pFR(a.p2)} ${a.t} (${a.o.toFixed(1)}°)`).join(' | ')}`);
  return parts.join('\n');
}

const PORTRAIT_SYSTEM_PROMPT = `Tu es l'IA astrologique de Kaironaute. Tu génères des portraits personnels basés UNIQUEMENT sur les données fournies.

RÈGLES STRICTES :
- Ancre CHAQUE affirmation sur une donnée exacte du thème (planète + signe/maison/aspect nommé).
- Minimum 8 références astrales uniques dans l'ensemble du texte.
- Langue : français courant, ton psychologique et direct — jamais mystico-vague.
- INTERDITS : "parfois", "il se peut que", "beaucoup de gens", "en général", "tu es sensible".
- Si stellium exceptionnel (5+ planètes), souligne explicitement cette rareté.
- Pas de prédictions temporelles, pas de conseils médicaux/financiers.

FORMAT DE SORTIE — JSON strict, rien d'autre :
{
  "sections": [
    {"titre": "L'Essence", "contenu": "..."},
    {"titre": "La Force de Frappe", "contenu": "..."},
    {"titre": "Le Don Inné", "contenu": "..."},
    {"titre": "Le Défi Formateur", "contenu": "..."}
  ]
}
- "Le Don Inné" : inclure SEULEMENT si Grand Trigone présent dans les données.
- "Le Défi Formateur" : inclure SEULEMENT si T-Carré présent dans les données.
- Chaque contenu : 80-120 mots maximum.
- Zéro markdown hors JSON.`;

const PORTRAIT_CACHE_KEY = 'kaironaute_portrait_v1';

function getPortraitCacheKey(astro: { b3: { sun: string; moon: string; asc: string } }): string {
  return `${PORTRAIT_CACHE_KEY}_${astro.b3.sun}_${astro.b3.moon}_${astro.b3.asc}`;
}

interface PortraitSection { titre: string; contenu: string; }
interface PortraitData { sections: PortraitSection[]; }


// === Rôle de chaque planète (une phrase) ===
const PL_ROLE: Record<string, string> = {
  sun: 'Identité · Volonté · Vitalité',
  moon: 'Émotions · Instinct · Besoins',
  mercury: 'Communication · Pensée · Apprentissage',
  venus: 'Relations · Valeurs · Attractivité',
  mars: 'Action · Énergie · Combativité',
  jupiter: 'Expansion · Chance · Vision',
  saturn: 'Discipline · Limites · Maturité',
  uranus: 'Innovation · Rupture · Liberté',
  neptune: 'Intuition · Inspiration · Illusions',
  pluto: 'Pouvoir · Transformation · Ombres',
  northNode: 'Cap de vie · Ce que tu construis · Direction à cultiver',
  southNode: 'Héritage naturel · Ce que tu portes déjà · À transcender',
  chiron: 'Point de sensibilité · Là où l\'épreuve devient force · Guérison',
  lilith: 'Énergie brute non filtrée · Puissance instinctive · Ce que tu n\'apprivoises pas encore',
};

// === Aspects en français clair ===
const ASPECT_FR: Record<string, string> = {
  conjunction: 'en fusion avec',
  opposition: 'face à face avec',
  trine: 'en harmonie avec',
  square: 'en friction créative avec',
  sextile: 'en soutien de',
  quincunx: 'en ajustement avec',
  sesquisquare: 'en friction subtile avec',
};
const ASPECT_VIBE: Record<string, { label: string; col: string }> = {
  conjunction: { label: '🌟 Fusion (conjonction)', col: '#FFD700' },
  opposition: { label: '🔵 Face-à-face (opposition)', col: '#60a5fa' },
  trine: { label: '🟢 Harmonie (trigone)', col: '#4ade80' },
  square: { label: '🟠 Friction créative (carré)', col: '#f97316' },
  sextile: { label: '🟢 Opportunité (sextile)', col: '#60a5fa' },
  quincunx: { label: '🟠 Ajustement (quinconce)', col: '#FF8C00' },
  sesquisquare: { label: '🟠 Friction subtile (sesqui-carré)', col: '#FF6347' },
};
// Micro-explications : ce que chaque aspect signifie concrètement
const ASPECT_EXPLAIN: Record<string, string> = {
  conjunction: 'Ces deux énergies fusionnent : elles s\'amplifient, pour le meilleur ou le plus intense.',
  opposition: 'Deux parties de toi tirent dans des directions opposées — le défi est de trouver l\'équilibre entre les deux.',
  trine: 'Un talent naturel : ces deux énergies coulent ensemble sans effort, c\'est un cadeau inné.',
  square: 'Ça frotte, ça coince parfois — mais c\'est exactement cette tension qui te pousse à bouger et grandir.',
  sextile: 'Une porte ouverte : l\'opportunité est là, mais c\'est à toi de la saisir.',
  quincunx: 'Ces deux parties de toi ne parlent pas la même langue — il faut ajuster en permanence, ça rend créatif.',
  sesquisquare: 'Un petit caillou dans la chaussure — pas grave, mais ça pousse à corriger le tir.',
};

// === Transit descriptions vulgarisées ===
const TRANSIT_DESC: Record<string, string> = {
  conjunction: 'fusionne avec et amplifie',
  opposition: 'te met face à face avec',
  trine: 'facilite et soutient',
  square: 'crée une friction créative avec',
  sextile: 'ouvre une porte vers',
};
// Conseil actionnable par type d'aspect (affiché sous chaque transit)
const TRANSIT_ADVICE: Record<string, string> = {
  conjunction: '→ Profite de cette intensification pour poser une intention claire.',
  opposition: '→ Prends du recul, écoute les deux côtés avant de décider.',
  trine: '→ C\'est le bon moment — avance avec confiance, le courant te porte.',
  square: '→ Quelque chose résiste ? C\'est un signal — agis, ajuste, ne reste pas bloqué.',
  sextile: '→ Une opportunité se présente — fais un petit pas concret aujourd\'hui.',
};

// Saveurs des signes pour la profection annuelle (ce que ça veut dire concrètement)
const PROF_SIGN_FLAVOR: Record<string, string> = {
  Aries: 'Année d\'initiative — tu oses, tu fonces.',
  Taurus: 'Année de construction — tu stabilises, tu savoures.',
  Gemini: 'Année d\'échanges — tu communiques, tu apprends, tu t\'adaptes.',
  Cancer: 'Année de cocon — tu te recentres sur tes émotions et ton foyer.',
  Leo: 'Année de rayonnement — tu brilles, tu crées, tu prends ta place.',
  Virgo: 'Année d\'optimisation — tu tries, tu organises, tu améliores.',
  Libra: 'Année de relations — tu collabores, tu négocies, tu harmonises.',
  Scorpio: 'Année de transformation — tu creuses, tu mues, tu te réinventes.',
  Sagittarius: 'Année d\'expansion — tu explores, tu voyages, tu apprends.',
  Capricorn: 'Année d\'ambition — tu structures, tu grimpes, tu concrétises.',
  Aquarius: 'Année de renouveau — tu innoves, tu te libères, tu surprends.',
  Pisces: 'Année d\'intuition — tu ressens, tu rêves, tu te connectes.',
};
// Saveurs des planètes guide
const PROF_PLANET_FLAVOR: Record<string, string> = {
  mars: 'Moteur : l\'action et le courage.',
  vénus: 'Moteur : l\'amour, l\'art et la douceur.',
  mercure: 'Moteur : la parole, les idées et les contacts.',
  lune: 'Moteur : les émotions et l\'instinct.',
  soleil: 'Moteur : la confiance et la volonté.',
  jupiter: 'Moteur : la chance et la croissance.',
  saturne: 'Moteur : la discipline et la maturité.',
};

// Interprétations des signes progressés par planète
const PROG_SUN_INTERP: Record<string, string> = {
  Aries: 'Tu es dans une phase de volonté brute — besoin d\'affirmer qui tu es, d\'oser.',
  Taurus: 'Ta motivation profonde cherche la stabilité et le concret — tu veux construire.',
  Gemini: 'Tu es poussé par la curiosité — envie d\'apprendre, communiquer, explorer.',
  Cancer: 'Ce qui te motive, c\'est le cocon — famille, émotions, sécurité intérieure.',
  Leo: 'Tu veux rayonner — créer, être vu, exprimer ta singularité.',
  Virgo: 'Tu es dans une phase d\'analyse — besoin d\'améliorer, d\'ordonner, d\'être utile.',
  Libra: 'Tu cherches l\'équilibre — les autres comptent beaucoup dans tes choix.',
  Scorpio: 'Phase de transformation intense — tu creuses, tu veux la vérité.',
  Sagittarius: 'Tu veux plus grand — voyager, apprendre, dépasser tes limites.',
  Capricorn: 'Tu es dans une phase d\'ambition structurée — discipline et long terme.',
  Aquarius: 'Tu as besoin de liberté — innover, surprendre, sortir du cadre.',
  Pisces: 'Ta volonté se fait intuitive — tu avances au feeling, guidé par tes rêves.',
};
const PROG_MOON_INTERP: Record<string, string> = {
  Aries: 'Émotionnellement, tu as besoin d\'action — l\'attente te pèse.',
  Taurus: 'Besoin de douceur et de sécurité émotionnelle — ralentis et savoure.',
  Gemini: 'Tes émotions passent par les mots — tu as besoin de parler, d\'échanger.',
  Cancer: 'Tes émotions sont intenses et profondes — le foyer et la famille te touchent fort.',
  Leo: 'Tu as besoin de reconnaissance affective — d\'être aimé pour qui tu es.',
  Virgo: 'Tes émotions se calment quand tu es utile et que les choses sont en ordre.',
  Libra: 'Tu as besoin d\'harmonie relationnelle — les conflits te perturbent profondément.',
  Scorpio: 'Tes émotions sont intenses — tu ressens tout en profondeur, pas de demi-mesure.',
  Sagittarius: 'Tu as besoin d\'espace et d\'optimisme — ton humeur dépend de ta liberté.',
  Capricorn: 'Émotionnellement, tu te protèges — tu gères en gardant le contrôle.',
  Aquarius: 'Tu prends du recul émotionnel — besoin d\'indépendance affective.',
  Pisces: 'Tes émotions sont poreuses — tu absorbes l\'ambiance autour de toi.',
};
const PROG_MARS_INTERP: Record<string, string> = {
  Aries: 'Ton énergie d\'action est directe et explosive — tu fonces sans hésiter.',
  Taurus: 'Tu agis lentement mais sûrement — endurance et ténacité.',
  Gemini: 'Tu te bats avec les mots et les idées — stratégie plutôt que force.',
  Cancer: 'Tu agis pour protéger tes proches — ta combativité est émotionnelle.',
  Leo: 'Tu agis avec panache — besoin que tes actions soient reconnues.',
  Virgo: 'Tu es méthodique dans l\'action — chaque geste est précis et utile.',
  Libra: 'Tu agis par la diplomatie — tu cherches le compromis plutôt que l\'affrontement.',
  Scorpio: 'Ton énergie est intense et stratégique — tu ne lâches rien.',
  Sagittarius: 'Tu agis avec enthousiasme et spontanéité — tu vises loin.',
  Capricorn: 'Tu agis avec discipline — chaque effort est calculé pour durer.',
  Aquarius: 'Tu agis de manière originale — tu bouscules les habitudes.',
  Pisces: 'Ton énergie est fluide et intuitive — tu agis quand tu le sens, pas quand on te dit.',
};

// Interprétation des phases lunaires par signe
const NEW_MOON_SIGN: Record<string, string> = {
  Aries: 'C\'est le moment d\'oser un nouveau départ — prendre une initiative, affirmer ce que tu veux. L\'énergie Bélier pousse à l\'action directe.',
  Taurus: 'L\'heure de poser les bases de quelque chose de concret — finances, confort, projets stables. Fais simple et solide.',
  Gemini: 'Lance une nouvelle communication, un apprentissage, un contact. L\'énergie Gémeaux ouvre les échanges et la curiosité.',
  Cancer: 'Moment idéal pour prendre soin de toi et de ton foyer — poser une intention liée à ta sécurité émotionnelle.',
  Leo: 'C\'est le moment de créer, de te montrer, de lancer un projet personnel. L\'énergie Lion t\'invite à briller.',
  Virgo: 'Lance une nouvelle routine, un plan santé, une méthode de travail. L\'énergie Vierge aide à optimiser.',
  Libra: 'Le moment de poser une intention relationnelle — collaboration, partenariat, équilibre à trouver avec l\'autre.',
  Scorpio: 'Moment puissant pour une transformation intérieure — lâcher ce qui ne sert plus, creuser en profondeur.',
  Sagittarius: 'Lance un voyage, une formation, un projet d\'expansion. L\'énergie Sagittaire pousse à viser plus grand.',
  Capricorn: 'Le moment de poser une ambition concrète — carrière, structure, engagement long terme.',
  Aquarius: 'Lance quelque chose d\'original — un projet collectif, une idée innovante, un changement de cadre.',
  Pisces: 'Moment d\'écouter ton intuition — poser une intention spirituelle, créative ou de lâcher-prise.',
};
const FULL_MOON_SIGN: Record<string, string> = {
  Aries: 'Un sujet lié à ton affirmation personnelle arrive à maturité — tu vois clairement ce que tu veux (ou ne veux plus).',
  Taurus: 'Quelque chose autour de tes finances ou de ton confort arrive à un point de décision. C\'est le moment de récolter.',
  Gemini: 'Une communication ou un échange important arrive à son aboutissement. Clarté sur une information attendue.',
  Cancer: 'Un sujet émotionnel ou familial s\'éclaire — ce que tu ressens devient impossible à ignorer.',
  Leo: 'Un projet créatif ou personnel arrive à son apogée — c\'est le moment d\'être vu et reconnu.',
  Virgo: 'Ta routine ou ta santé demande un ajustement — tu vois ce qui fonctionne et ce qui doit changer.',
  Libra: 'Une relation arrive à un tournant — équilibre à trouver, décision à prendre à deux.',
  Scorpio: 'Une vérité profonde émerge — transformation inévitable, quelque chose doit être lâché.',
  Sagittarius: 'Un voyage, une quête de sens ou un apprentissage arrive à son point culminant.',
  Capricorn: 'Un objectif professionnel ou une ambition atteint un palier — bilan et décision.',
  Aquarius: 'Un projet collectif ou une amitié arrive à un moment charnière — ce qui est authentique reste.',
  Pisces: 'Ton intuition est à son maximum — écoute tes rêves et tes émotions, ils te disent quelque chose d\'important.',
};

// Interprétation de la planète dominante — ce que ça dit de toi
const DOMINANT_PLANET_INTERP: Record<string, string> = {
  sun: 'Tu es fondamentalement solaire — besoin de rayonner, de créer et d\'être reconnu. Tu attires naturellement l\'attention.',
  moon: 'Tes émotions mènent la danse — tu es intuitif·ve, empathique, et ton humeur colore tout ce que tu fais.',
  mercury: 'Tu vis par les idées — communication, apprentissage, analyse. Ton esprit est toujours en mouvement.',
  venus: 'Les relations et l\'harmonie sont au centre de ta vie — tu cherches la beauté, le lien, le plaisir.',
  mars: 'Tu es porté·e par l\'action — courage, compétition, énergie. Tu as besoin de bouger et de te battre pour avancer.',
  jupiter: 'Tu vois toujours plus grand — expansion, optimisme, quête de sens. Tu inspires confiance et tu sais motiver.',
  saturn: 'Tu es bâti·e pour la durée — discipline, structure, responsabilité. Tu prends les choses au sérieux et tu construis solide.',
  uranus: 'Tu es un électron libre — innovation, originalité, besoin de casser les codes. Tu surprends et tu déranges.',
  neptune: 'Tu vis entre rêve et réalité — intuition, créativité, sensibilité aux atmosphères. Tu captes ce que les autres ne voient pas.',
  pluto: 'Tu vis en profondeur — transformation, intensité, pouvoir. Tu ne fais rien à moitié et tu cherches la vérité.',
};

// Interprétation des signes pour les stelliums
const STELLIUM_SIGN_INTERP: Record<string, string> = {
  Aries: 'Concentration massive en Bélier — tu es une force d\'initiative. L\'action, l\'indépendance et le courage dominent ta personnalité.',
  Taurus: 'Concentration massive en Taureau — le concret, la stabilité et les plaisirs des sens sont au cœur de qui tu es.',
  Gemini: 'Concentration massive en Gémeaux — la communication, la curiosité et l\'agilité mentale te définissent.',
  Cancer: 'Concentration massive en Cancer — les émotions, la famille et le besoin de sécurité sont omniprésents chez toi.',
  Leo: 'Concentration massive en Lion — créativité, rayonnement et besoin de reconnaissance sont centraux dans ta vie.',
  Virgo: 'Concentration massive en Vierge — l\'analyse, le perfectionnisme et le sens du service te caractérisent.',
  Libra: 'Concentration massive en Balance — les relations, l\'équilibre et l\'esthétique sont ta priorité naturelle.',
  Scorpio: 'Concentration massive en Scorpion — l\'intensité, la transformation et la quête de vérité dominent ta vie intérieure.',
  Sagittarius: 'Concentration massive en Sagittaire — l\'aventure, l\'expansion et la quête de sens sont ton moteur.',
  Capricorn: 'Concentration massive en Capricorne — l\'ambition, la structure et la vision long terme guident tes choix.',
  Aquarius: 'Concentration massive en Verseau — l\'originalité, la liberté et les idéaux collectifs te portent.',
  Pisces: 'Concentration massive en Poissons — l\'intuition, la compassion et la vie intérieure sont au premier plan.',
};

// Interprétation du signe pour la RS annuelle
const RS_SIGN_INTERP: Record<string, string> = {
  Aries: 'L\'énergie Bélier colore ton année : année d\'initiatives, de nouveaux départs et d\'affirmation de soi.',
  Taurus: 'L\'énergie Taureau colore ton année : année de construction, de stabilisation et de plaisirs concrets.',
  Gemini: 'L\'énergie Gémeaux colore ton année : année d\'échanges, d\'apprentissages et de contacts multiples.',
  Cancer: 'L\'énergie Cancer colore ton année : année centrée sur les émotions, le foyer et les racines.',
  Leo: 'L\'énergie Lion colore ton année : année de créativité, de visibilité et d\'expression personnelle.',
  Virgo: 'L\'énergie Vierge colore ton année : année d\'optimisation, de santé et de mise en ordre.',
  Libra: 'L\'énergie Balance colore ton année : année de relations, de négociations et de recherche d\'équilibre.',
  Scorpio: 'L\'énergie Scorpion colore ton année : année de transformation profonde et de vérités qui émergent.',
  Sagittarius: 'L\'énergie Sagittaire colore ton année : année d\'expansion, de voyages et de quête de sens.',
  Capricorn: 'L\'énergie Capricorne colore ton année : année d\'ambition structurée et de résultats concrets.',
  Aquarius: 'L\'énergie Verseau colore ton année : année de renouveau, d\'innovation et de liberté.',
  Pisces: 'L\'énergie Poissons colore ton année : année d\'intuition, de lâcher-prise et de connexion spirituelle.',
};

// Traduction des raisons techniques de dominance en langage clair
const REASON_FR: Record<string, string> = {
  'Domicile': 'chez elle dans son signe',
  'Exaltation': 'amplifiée dans ce signe',
  'Maître ASC': 'gouverne ton Ascendant',
  'Maître MC': 'gouverne ta carrière',
  'Maison angulaire': 'en position de force',
  'Conjonction Soleil': 'fusionnée avec ton identité',
  'Conjonction Lune': 'liée à tes émotions',
  'Conjonction ASC': 'visible dans ton image',
  'Aspects multiples': 'connectée à beaucoup d\'autres planètes',
  'Singleton': 'seule dans son élément — rôle unique',
};

// Thèmes des maisons (pour traduire "Maison 7" en langage humain)
const HOUSE_THEME_FR: Record<number, string> = {
  1: 'identité', 2: 'finances', 3: 'communication', 4: 'foyer',
  5: 'créativité et amour', 6: 'santé et quotidien', 7: 'relations',
  8: 'transformations', 9: 'voyages et expansion', 10: 'carrière',
  11: 'projets et amitiés', 12: 'spiritualité',
};

const MODE_FR: Record<string, string> = { cardinal: '🌟 Initiateur', fixed: '🔒 Stabilisateur', mutable: '🔄 Adaptateur' };
const MODE_TECH: Record<string, string> = { cardinal: 'cardinal', fixed: 'fixe', mutable: 'mutable' };
const MODE_DESC: Record<string, string> = { cardinal: 'Tu lances, tu diriges, tu prends les devants', fixed: 'Tu persévères, tu stabilises, tu ne lâches pas', mutable: 'Tu t\'adaptes, tu évolues, tu rebondis' };
const MODE_COL: Record<string, string> = { cardinal: '#FF6B6B', fixed: '#FFD700', mutable: '#4ade80' };
const DIG_COL: Record<string, string> = { dom: '#4ade80', exa: '#60a5fa', fall: '#ef4444', exi: '#FF6B6B' };
const DIG_HINT: Record<string, string> = {
  dom: '✦ Chez elle (Domicile en astro classique) — cette planète est dans le signe qu\'elle gouverne : elle s\'exprime avec puissance et naturel. Ton énergie coule sans forcer.',
  exa: '✦ Amplifiée (Exaltation en astro classique) — cette planète est dans un signe qui la magnifie : elle rayonne plus fort que la normale. Un point de force rare dans ton thème.',
  fall: '✦ Zone sensible (Chute en astro classique) — cette planète s\'exprime avec moins de facilité ici. C\'est un terrain qui te demande plus de conscience, mais qui te fait grandir.',
  exi: '✦ À apprivoiser (Exil en astro classique) — cette planète est dans un signe éloigné de sa zone de confort. C\'est un terrain moins naturel, mais formateur et riche d\'enseignements.',
};
// Raisons spécifiques de dignité par planète+signe (pourquoi cette planète est ici forte/faible)
const DIG_REASON: Record<string, Record<string, string>> = {
  sun: {
    Leo: 'Le Soleil gouverne le Lion — il est chez lui, il rayonne naturellement.',
    Aries: 'Le Soleil est exalté en Bélier — l\'énergie pionnière amplifie la volonté.',
    Libra: 'Le Soleil est en chute en Balance — la Balance cherche le compromis et l\'autre, alors que le Soleil veut briller seul. L\'égo doit apprendre à coexister avec le « nous ».',
    Aquarius: 'Le Soleil est en exil en Verseau — le Verseau pense collectif, ce qui dilue l\'affirmation individuelle du Soleil.',
  },
  moon: {
    Cancer: 'La Lune gouverne le Cancer — elle est chez elle, les émotions coulent avec fluidité.',
    Taurus: 'La Lune est exaltée en Taureau — la stabilité du Taureau sécurise les émotions.',
    Scorpio: 'La Lune est en chute en Scorpion — les émotions sont intenses et profondes, parfois trop pour être confortables.',
    Capricorn: 'La Lune est en exil en Capricorne — les émotions sont contrôlées, mises au service de l\'ambition.',
  },
  mercury: {
    Gemini: 'Mercure gouverne les Gémeaux — communication fluide et rapide.',
    Virgo: 'Mercure gouverne aussi la Vierge — analyse précise et méthodique.',
    Sagittarius: 'Mercure est en exil en Sagittaire — l\'esprit vise large au détriment de la précision.',
    Pisces: 'Mercure est en chute/exil en Poissons — la pensée devient intuitive mais floue.',
  },
  venus: {
    Taurus: 'Vénus gouverne le Taureau — elle savoure les plaisirs et la beauté.',
    Libra: 'Vénus gouverne aussi la Balance — elle excelle dans les relations et l\'harmonie.',
    Pisces: 'Vénus est exaltée en Poissons — l\'amour devient universel et compassionnel.',
    Aries: 'Vénus est en exil en Bélier — l\'amour est impatient et direct, moins diplomate.',
    Scorpio: 'Vénus est en exil en Scorpion — l\'amour est intense mais possessif.',
    Virgo: 'Vénus est en chute en Vierge — l\'amour s\'exprime par le service plus que par la passion.',
  },
  mars: {
    Aries: 'Mars gouverne le Bélier — l\'action est directe et puissante.',
    Scorpio: 'Mars gouverne aussi le Scorpion — l\'énergie est stratégique et intense.',
    Capricorn: 'Mars est exalté en Capricorne — l\'action est disciplinée et efficace.',
    Libra: 'Mars est en exil en Balance — l\'action est freinée par le besoin de consensus.',
    Cancer: 'Mars est en chute en Cancer — l\'énergie combative est détournée par les émotions.',
    Taurus: 'Mars est en exil en Taureau — l\'action est lente mais obstinée.',
  },
  jupiter: {
    Sagittarius: 'Jupiter gouverne le Sagittaire — expansion et quête de sens maximales.',
    Pisces: 'Jupiter gouverne aussi les Poissons — la foi et l\'intuition sont amplifiées.',
    Cancer: 'Jupiter est exalté en Cancer — la générosité se nourrit de l\'émotion.',
    Gemini: 'Jupiter est en exil en Gémeaux — l\'expansion se disperse en trop de directions.',
    Capricorn: 'Jupiter est en chute en Capricorne — l\'optimisme est freiné par le réalisme.',
  },
  saturn: {
    Capricorn: 'Saturne gouverne le Capricorne — discipline et structure au sommet.',
    Aquarius: 'Saturne gouverne aussi le Verseau — la rigueur sert l\'innovation.',
    Libra: 'Saturne est exalté en Balance — la justice et l\'équilibre sont structurés.',
    Cancer: 'Saturne est en exil en Cancer — les émotions et la rigidité se heurtent.',
    Aries: 'Saturne est en chute en Bélier — la patience de Saturne supporte mal l\'impulsivité.',
  },
};
// Tooltips courts pour le badge compact (hover)
const DIG_TOOLTIP: Record<string, string> = {
  dom: 'Chez elle (Domicile) — puissante et naturelle dans ce signe. Point fort de ton thème.',
  exa: 'Amplifiée (Exaltation) — elle brille avec une intensité rare ici. Un atout.',
  fall: 'Zone sensible (Chute) — elle doit travailler plus dur ici. Terrain de croissance.',
  exi: 'À apprivoiser (Exil) — hors de sa zone de confort. Apprentissage formateur.',
};

// === Big Three descriptions contextuelles ===
const B3_DESC: Record<string, Record<string, string>> = {
  mc: {
    Aries:'Vocation pionnière — tu réussis en prenant des initiatives audacieuses.',
    Taurus:'Vocation bâtisseur — tu excelles dans ce qui dure, le concret, la création de valeur.',
    Gemini:'Vocation communicateur — tu brilles par la parole, l\'écriture, la transmission.',
    Cancer:'Vocation nourricière — tu réussis en prenant soin des autres.',
    Leo:'Vocation créatrice — tu brilles sur scène, dans les arts, dans le leadership.',
    Virgo:'Vocation analytique — tu excelles dans le service, la précision, la santé.',
    Libra:'Vocation harmonisatrice — tu brilles dans la diplomatie, la beauté, la justice.',
    Scorpio:'Vocation transformatrice — tu excelles dans l\'investigation et les crises.',
    Sagittarius:'Vocation visionnaire — tu brilles dans l\'enseignement, le voyage, la philosophie.',
    Capricorn:'Vocation architecte — tu réussis par la discipline et l\'ambition structurée.',
    Aquarius:'Vocation innovatrice — tu brilles dans l\'avant-garde et le collectif.',
    Pisces:'Vocation artistique — tu excelles dans la créativité, la spiritualité, le soin.',
  },
  sun: {
    Aries:'Tu es un leader né, porté par l\'action et l\'initiative.',
    Taurus:'Tu es bâtisseur, porté par la stabilité et la persévérance.',
    Gemini:'Tu es un connecteur d\'idées, agile et curieux.',
    Cancer:'Tu es guidé par l\'intuition et l\'intelligence émotionnelle.',
    Leo:'Tu es un meneur charismatique qui inspire la loyauté.',
    Virgo:'Tu es un analyste précis qui vises l\'excellence.',
    Libra:'Tu es un diplomate né, créateur d\'équilibre et d\'alliances.',
    Scorpio:'Tu es un stratège intense qui transformes les obstacles en leviers.',
    Sagittarius:'Tu es un visionnaire qui vois grand et penses global.',
    Capricorn:'Tu es un architecte patient qui construis dans la durée.',
    Aquarius:'Tu es un innovateur qui penses hors des sentiers battus.',
    Pisces:'Tu es guidé par une intuition profonde et une vision holistique.',
  },
  moon: {
    Aries:'Sous pression, tu réagis vite et passes à l\'action.',
    Taurus:'Tu as besoin de sécurité et de stabilité pour performer.',
    Gemini:'Tu gères le stress par l\'analyse et la communication.',
    Cancer:'Ton intuition émotionnelle est ton super-pouvoir.',
    Leo:'Sous pression, tu montes en puissance et prends les commandes.',
    Virgo:'Tu canalises le stress dans l\'action concrète et l\'organisation.',
    Libra:'Le conflit te déstabilise — tu cherches l\'harmonie.',
    Scorpio:'Tes émotions sont intenses mais maîtrisées — résilience remarquable.',
    Sagittarius:'Tu rebondis avec optimisme en prenant du recul.',
    Capricorn:'Tu compartimentes et avances — force silencieuse.',
    Aquarius:'Tu analyses tes émotions avec détachement productif.',
    Pisces:'Tu absorbes les ambiances — créativité et intuition profondes.',
  },
  asc: {
    Aries:'Tu dégages une énergie directe, dynamique et pionnière.',
    Taurus:'Tu projètes une image de calme, de solidité et de fiabilité.',
    Gemini:'Tu dégages vivacité intellectuelle et aisance sociale.',
    Cancer:'Tu projètes chaleur et bienveillance protectrice.',
    Leo:'Tu dégages charisme et présence magnétique.',
    Virgo:'Tu projètes sérieux, compétence et attention au détail.',
    Libra:'Tu dégages élégance, diplomatie et sens de l\'harmonie.',
    Scorpio:'Tu projètes intensité et mystère — on ne t\'oublie pas.',
    Sagittarius:'Tu dégages enthousiasme, ouverture et confiance.',
    Capricorn:'Tu projètes autorité, ambition et professionnalisme.',
    Aquarius:'Tu dégages originalité et indépendance d\'esprit.',
    Pisces:'Tu projètes sensibilité, empathie et profondeur.',
  },
};

// R25: Labels français pour le système de maisons
const HOUSE_SYSTEM_FR: Record<string, string> = { placidus: 'Placidus', wholesign: 'Signes Entiers', equal: 'Égales' };
type LocalHouseSystem = 'placidus' | 'wholesign' | 'equal';

export default function AstroTab({ data, bd, bt, bp }: { data: SoulData; bd: string; bt: string; bp?: string }) {
  const { astro } = data;
  const [expandedPl, setExpandedPl] = useState<Set<string>>(new Set(['sun', 'moon', 'mercury']));
  const [portrait, setPortrait] = useState<PortraitData | null>(null);
  const [portraitStatus, setPortraitStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [loadingText, setLoadingText] = useState('Analyse cosmique...');
  const [houseSystem, setHouseSystem] = useState<LocalHouseSystem>('placidus');
  const [showAllPlanets, setShowAllPlanets] = useState(false);
  const [tempSegment, setTempSegment] = useState<'elements' | 'modes' | 'synthese'>('synthese');
  const [showFullWheel, setShowFullWheel] = useState(false);

  // R25: Recalcul local des maisons si on passe en Whole Sign
  // Les positions planétaires ne changent PAS — seule l'attribution des maisons change
  const displayPl = useMemo(() => {
    if (!astro) return [];
    if (houseSystem === 'placidus' || houseSystem === 'equal') return astro.pl;
    // Whole Sign : maison = index du signe relatif à l'ASC + 1
    const ascSignIdx = SIGNS.indexOf(astro.b3.asc);
    if (ascSignIdx < 0) return astro.pl;
    return astro.pl.map(p => {
      const plSignIdx = SIGNS.indexOf(p.s);
      const house = ((plSignIdx - ascSignIdx + 12) % 12) + 1;
      return { ...p, h: house };
    });
  }, [astro, houseSystem]);

  // R25: Recalcul des stelliums par maison selon le système actif
  // Si noTime, on exclut les stelliums par maison (maisons non fiables sans heure)
  const displayStelliums = useMemo(() => {
    if (!astro?.stelliums) return [];
    const signStelliums = astro.stelliums.filter(s => s.type === 'sign');
    // Pas de maisons si heure inconnue
    if (astro.noTime) return signStelliums;
    if (houseSystem === 'placidus' || houseSystem === 'equal') return astro.stelliums;
    // En Whole Sign, recalculer les stelliums par maison avec les nouvelles attributions
    // Recalculer les stelliums par maison
    const byH: Record<number, string[]> = {};
    displayPl.forEach(p => {
      const corePlanets = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','northNode'];
      if (corePlanets.includes(p.k)) {
        (byH[p.h] = byH[p.h] || []).push(p.k);
      }
    });
    const houseStelliums: typeof astro.stelliums = [];
    Object.entries(byH).forEach(([house, planets]) => {
      if (planets.length >= 3) houseStelliums.push({ type: 'house', name: `Maison ${house}`, planets });
    });
    return [...signStelliums, ...houseStelliums];
  }, [astro, houseSystem, displayPl]);

  // R25: Détail des différences toggle pour feedback visuel
  const toggleDiffs = useMemo(() => {
    if (!astro || houseSystem === 'placidus') return [];
    return displayPl
      .map((p, i) => ({ k: p.k, from: astro.pl[i]?.h, to: p.h }))
      .filter(d => d.from !== d.to);
  }, [astro, displayPl, houseSystem]);
  const toggleDiffCount = toggleDiffs.length;

  // Phase 3d — calculs purs extraits dans useAstroComputed
  const { profection, solarReturn, progressions, upcomingPhases, lunarReturn,
          topTransit, displayScore, dashMood } = useAstroComputed(data, bd, bp);

  // Charger le cache localStorage au montage
  useEffect(() => {
    if (!astro) return;
    try {
      const key = getPortraitCacheKey(astro);
      const cached = sto.getRaw(key);
      if (cached) {
        setPortrait(JSON.parse(cached));
        setPortraitStatus('done');
      }
    } catch { /* fail silently */ }
  }, [astro?.b3?.sun, astro?.b3?.moon, astro?.b3?.asc]);

  const generatePortrait = async () => {
    if (!astro || portraitStatus === 'loading') return;
    setPortraitStatus('loading');
    const LOADING_TEXTS = ['Analyse des stelliums...', 'Lecture du Grand Trigone...', 'Calcul des tensions natales...', 'Synthèse du portrait...'];
    let li = 0;
    const interval = setInterval(() => { setLoadingText(LOADING_TEXTS[++li % LOADING_TEXTS.length]); }, 900);
    try {
      const context = buildNatalContext(astro);
      const res = await fetch('/.netlify/functions/claude-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: PORTRAIT_SYSTEM_PROMPT,
          context: `Génère le portrait astral pour ce thème natal :\n\n${context}`,
        }),
      });
      const d = await res.json();
      const raw = d.content?.[0]?.text || '';
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed: PortraitData = JSON.parse(clean);
      setPortrait(parsed);
      setPortraitStatus('done');
      try { sto.set(getPortraitCacheKey(astro), parsed); } catch { /* quota exceeded — portrait affiché quand même */ }
    } catch {
      setPortraitStatus('error');
    } finally {
      clearInterval(interval);
    }
  };


  if (!astro) return (
    <Sec icon="🌙" title="Thème Astral">
      <Cd>
        <div style={{ textAlign: 'center', color: P.textDim, padding: 20 }}>
          <div style={{ fontSize: 14 }}>Renseigne une ville de naissance valide pour le thème astral.</div>
          <div style={{ marginTop: 8, fontSize: 11, color: P.textDim }}>Villes FR : Paris, Lyon, Marseille, Mâcon, Toulouse, Carcassonne...</div>
        </div>
      </Cd>
    </Sec>
  );

  const togglePl = (k: string) => {
    setExpandedPl(prev => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  };

  // === ZODIAC WHEEL ===
  const WHL = 320, C = WHL / 2, R1 = 140, R2 = 115, R3 = 80;
  // V3.0 — Planètes pour la roue (10 classiques + nœuds, pas chiron/lilith pour la lisibilité)
  const WHEEL_KEYS = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','northNode','southNode'];
  const wheelPl = displayPl.filter(p => WHEEL_KEYS.includes(p.k));
  const plLons = wheelPl.map(pp => SIGNS.indexOf(pp.s) * 30 + pp.d);
  function polar(deg: number, r: number): [number, number] {
    const a = (deg - 90) * Math.PI / 180;
    return [C + r * Math.cos(a), C + r * Math.sin(a)];
  }

  // topTransit, displayScore, dashMood — fournis par useAstroComputed (Phase 3d)

  // === Aspects pour l'overlay plein écran ===
  const MAJOR_TYPES = ['conjunction', 'opposition', 'trine', 'square', 'sextile'];
  const allAspectsMajor = (astro.as || []).filter((a: { t: string }) => MAJOR_TYPES.includes(a.t));

  return (
    <div>

      {/* ═══════ OVERLAY ROUE PLEIN ÉCRAN ═══════ */}
      {showFullWheel && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.92)', zIndex: 9999,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: 16,
            animation: 'fadeInWheel 0.3s ease',
          }}
          onClick={() => setShowFullWheel(false)}
        >
          <style>{`@keyframes fadeInWheel { from { opacity: 0; } to { opacity: 1; } }`}</style>

          {/* Bouton fermer */}
          <div style={{ position: 'absolute', top: 16, right: 20, fontSize: 28, color: P.textDim, cursor: 'pointer' }} {...a11yClick(() => setShowFullWheel(false))} aria-label="Fermer la carte du ciel">✕</div>

          {/* Titre */}
          <div style={{ fontSize: 14, fontWeight: 700, color: P.gold, marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' }}>Ta carte du ciel</div>

          {/* Grande roue SVG */}
          <svg viewBox={`0 0 ${WHL} ${WHL}`} width="100%" style={{ maxWidth: 340 }} onClick={(e) => e.stopPropagation()}>
            {SIGNS.map((sign, i) => {
              const a1 = i * 30 - 90, a2 = a1 + 30;
              const r1a = (a1 * Math.PI) / 180, r2a = (a2 * Math.PI) / 180;
              const x1o = C + R1 * Math.cos(r1a), y1o = C + R1 * Math.sin(r1a);
              const x2o = C + R1 * Math.cos(r2a), y2o = C + R1 * Math.sin(r2a);
              const x1i = C + R2 * Math.cos(r1a), y1i = C + R2 * Math.sin(r1a);
              const x2i = C + R2 * Math.cos(r2a), y2i = C + R2 * Math.sin(r2a);
              const ec = ELEM_COL[SIGN_ELEM[sign]] || '#888';
              const [sx, sy] = polar(i * 30 + 15, (R1 + R2) / 2);
              return (
                <g key={sign}>
                  <path
                    d={`M${x1i},${y1i} L${x1o},${y1o} A${R1},${R1} 0 0,1 ${x2o},${y2o} L${x2i},${y2i} A${R2},${R2} 0 0,0 ${x1i},${y1i}`}
                    fill={ec + '15'} stroke={ec + '40'} strokeWidth={0.5}
                  />
                  <text x={sx} y={sy} textAnchor="middle" dominantBaseline="central" fontSize={11} fill={ec}>
                    {SIGN_SYM[sign]}
                  </text>
                </g>
              );
            })}
            <circle cx={C} cy={C} r={R2} fill="none" stroke={P.textDim + '30'} strokeWidth={0.5} />
            <circle cx={C} cy={C} r={R3} fill="none" stroke={P.textDim + '20'} strokeWidth={0.3} />
            {/* TOUS les aspects majeurs avec traits */}
            {allAspectsMajor.map((a: { p1: string; p2: string; t: string; o: number }, ai: number) => {
              const i1 = wheelPl.findIndex(p => p.k === a.p1);
              const i2 = wheelPl.findIndex(p => p.k === a.p2);
              if (i1 < 0 || i2 < 0) return null;
              const [x1, y1] = polar(plLons[i1], R3 - 4);
              const [x2, y2] = polar(plLons[i2], R3 - 4);
              const col = ASPECT_COL[a.t] || P.textDim;
              const dash = a.t === 'sextile' ? '3,3' : a.t === 'quincunx' ? '5,2' : 'none';
              return <line key={`fasp-${ai}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={1.2} opacity={0.6} strokeDasharray={dash} />;
            })}
            {/* Planètes */}
            {wheelPl.map((pp, i) => {
              const lon = plLons[i];
              const [px, py] = polar(lon, R3 - 4);
              const [tx, ty] = polar(lon, R3 + 14);
              const ec = ELEM_COL[SIGN_ELEM[pp.s]] || P.textDim;
              return (
                <g key={pp.k}>
                  <circle cx={px} cy={py} r={4} fill={ec} opacity={0.9} />
                  <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central" fontSize={7} fontWeight={700} fill={ec}>
                    {PLANET_FR[pp.k] || PL_SHORT[pp.k]}
                  </text>
                </g>
              );
            })}
            {(() => {
              const ascLon = SIGNS.indexOf(astro.b3.asc) * 30 + astro.ad;
              const [ax, ay] = polar(ascLon, R1 + 10);
              return <text x={ax} y={ay} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={700} fill={P.gold}>Asc ↑</text>;
            })()}
          </svg>

          {/* Légende des aspects */}
          <div style={{ marginTop: 16, maxWidth: 340, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 11, fontWeight: 700, color: P.textMid, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Légende des aspects</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {[
                { t: 'conjunction', sym: '☌', label: 'Fusion', tech: 'conjonction', col: '#FFD700', desc: 'Deux énergies fusionnent et s\'amplifient mutuellement' },
                { t: 'opposition', sym: '☍', label: 'Face-à-face', tech: 'opposition', col: '#60a5fa', desc: 'Tension entre deux pôles qui cherchent l\'équilibre' },
                { t: 'trine', sym: '△', label: 'Harmonie', tech: 'trigone', col: '#4ade80', desc: 'Talent naturel, énergie qui coule sans effort' },
                { t: 'square', sym: '□', label: 'Friction créative', tech: 'carré', col: '#f97316', desc: 'Tension motrice qui pousse à évoluer' },
                { t: 'sextile', sym: '⚹', label: 'Opportunité', tech: 'sextile', col: '#60a5fa', desc: 'Porte ouverte, potentiel à saisir activement' },
              ].map(leg => {
                const count = allAspectsMajor.filter((a: { t: string }) => a.t === leg.t).length;
                if (count === 0) return null;
                return (
                  <div key={leg.t} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px', background: leg.col + '0A', borderRadius: 6, borderLeft: `2px solid ${leg.col}` }}>
                    <span style={{ fontSize: 16, color: leg.col, lineHeight: 1 }}>{leg.sym}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: P.text }}>{leg.label} <span style={{ fontSize: 10, color: P.textDim }}>({leg.tech}) × {count}</span></div>
                      <div style={{ fontSize: 10, color: P.textMid, lineHeight: 1.4 }}>{leg.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Liste détaillée des aspects — langage humain */}
          <div style={{ marginTop: 12, maxWidth: 340, width: '100%', maxHeight: 200, overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 11, fontWeight: 700, color: P.textMid, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Ton thème en {allAspectsMajor.length} liens</div>
            <div style={{ fontSize: 9, color: P.textDim, marginBottom: 6, opacity: 0.6 }}>Plus le chiffre en degrés est petit, plus le lien est puissant</div>
            <div style={{ display: 'grid', gap: 5 }}>
              {allAspectsMajor.map((a: { p1: string; p2: string; t: string; o: number }, i: number) => {
                const col = ASPECT_COL[a.t] || P.textDim;
                const sym = ASPECT_SYM[a.t] || '•';
                const h1 = PL_HUMAN[a.p1] || PLANET_FR[a.p1];
                const h2 = PL_HUMAN[a.p2] || PLANET_FR[a.p2];
                const verb = ASPECT_HUMAN[a.t] || ASPECT_FR[a.t] || a.t;
                // Phrase humaine : "Ta pensée nourrit naturellement ton énergie"
                const humanPhrase = `${h1.charAt(0).toUpperCase() + h1.slice(1)} ${verb} ${h2}`;
                // Sous-titre technique discret : Mercure △ Mars
                const techSub = `${PLANET_FR[a.p1]} ${sym} ${PLANET_FR[a.p2]}`;
                return (
                  <div key={i} style={{ padding: '6px 8px', background: col + '08', borderRadius: 6, borderLeft: `2px solid ${col}` }}>
                    <div style={{ fontSize: 11, color: P.text, lineHeight: 1.4 }}>{humanPhrase}</div>
                    <div style={{ fontSize: 9, color: P.textDim, marginTop: 2 }}>{techSub} · {a.o.toFixed(1)}°</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 10, color: P.textDim, opacity: 0.5 }}>Toucher l'arrière-plan pour fermer</div>
        </div>
      )}

      {/* ═══════ R27: MINI-BARRE BIG THREE ═══════ */}
      {astro.b3 && (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 12, padding: '8px 0 4px',
          borderBottom: `1px solid ${P.cardBdr}`, marginBottom: 8,
        }}>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <span style={{ fontSize: 11, color: P.textMid }}>☀️ {SIGN_FR[astro.b3.sun]}</span>
            <span style={{ fontSize: 8, color: P.textDim, opacity: 0.6 }}>identité</span>
          </span>
          <span style={{ fontSize: 11, color: P.textDim }}>|</span>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <span style={{ fontSize: 11, color: P.textMid }}>🌙 {SIGN_FR[astro.b3.moon]}</span>
            <span style={{ fontSize: 8, color: P.textDim, opacity: 0.6 }}>émotions</span>
          </span>
          {!astro.noTime && <>
            <span style={{ fontSize: 11, color: P.textDim }}>|</span>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
              <span style={{ fontSize: 11, color: P.textMid }}>⬆️ {SIGN_FR[astro.b3.asc]}</span>
              <span style={{ fontSize: 8, color: P.textDim, opacity: 0.6 }}>image</span>
            </span>
          </>}
        </div>
      )}

      {/* ═══════ R27: DASHBOARD "CE QUI COMPTE AUJOURD'HUI" ═══════ */}
      <div style={{
        padding: '14px 16px', borderRadius: 14, marginBottom: 8,
        background: dashMood.bg, border: `1px solid ${dashMood.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 22 }}>{dashMood.icon}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: P.text }}>{dashMood.label}</span>
          {data.conv?.score !== undefined && (
            <span style={{ fontSize: 12, color: P.gold, marginLeft: 'auto', fontWeight: 600 }}>{displayScore}/100</span>
          )}
        </div>
        <div style={{ fontSize: 13, color: P.textMid, lineHeight: 1.6 }}>
          {/* Ligne 1 : Transit du jour */}
          {topTransit ? (
            <div style={{ marginBottom: 4 }}>
              <strong style={{ color: P.gold }}>{PLANET_FR[topTransit.tp]}</strong> {TRANSIT_DESC[topTransit.t] || 'active'} ton <strong style={{ color: P.text }}>{PLANET_FR[topTransit.np]}</strong>{PL_HUMAN[topTransit.np] ? ` (${PL_HUMAN[topTransit.np]})` : ''}.
              {topTransit.x && <span style={{ color: P.gold, fontWeight: 600 }}> Pic d'intensité aujourd'hui.</span>}
              {TRANSIT_ADVICE[topTransit.t] && <div style={{ fontSize: 11, color: P.gold, marginTop: 2, opacity: 0.85 }}>{TRANSIT_ADVICE[topTransit.t]}</div>}
            </div>
          ) : (
            <div style={{ marginBottom: 4 }}>Une journée sans transit majeur — bon moment pour consolider et préparer.</div>
          )}
          {/* Ligne 2 : Cycle annuel */}
          {profection && (
            <div style={{ marginBottom: 4, fontSize: 12, color: P.textDim }}>
              Ton année tourne autour de « {profection.domain} » — {profection.timeLord} ({PL_HUMAN[profection.timeLord.toLowerCase()] || 'ton guide annuel'}) t'accompagne.
            </div>
          )}
          {/* Ligne 3 : Conseil */}
          <div style={{ fontSize: 12, color: P.textDim, fontStyle: 'italic' }}>
            {displayScore >= 80
              ? 'Le bon geste : avance sur ce qui compte, les énergies te soutiennent.'
              : displayScore >= 60
              ? 'Le bon geste : reste ouvert aux signaux du jour sans forcer.'
              : 'Le bon geste : ralentis, clarifie, reporte ce qui peut attendre.'}
          </div>
        </div>
      </div>

      {/* ╔═══════════════════════════════════════════╗ */}
      {/* ║  GROUPE 1 — AUJOURD'HUI                   ║ */}
      {/* ╚═══════════════════════════════════════════╝ */}
      <SectionGroup icon="🌟" title="Aujourd'hui" defaultOpen={true} count={astro.tr?.length || 0}>

      {/* ===== TRANSITS — CE QUI T'ACTIVE AUJOURD'HUI ===== */}
      {astro.tr.length > 0 && (() => {
        const trSlice = astro.tr.slice(0, 10);
        const nPos = trSlice.filter(t => t.t === 'trine' || t.t === 'sextile' || t.t === 'conjunction').length;
        const nTense = trSlice.filter(t => t.t === 'square' || t.t === 'opposition' || t.t === 'quincunx' || t.t === 'sesquisquare').length;
        const hasExact = trSlice.some(t => t.x);
        const scoreHigh = displayScore >= 75;
        // Bâtir le texte de synthèse en cohérence avec le score global
        let synthText: string;
        if (nTense > nPos && scoreHigh) {
          synthText = `Côté ciel : ${nTense} tensions et ${nPos} soutiens — le ciel est remuant. Mais ton score global (${displayScore}/100) reste élevé grâce aux autres indicateurs (cycles lunaires, astrologie chinoise, profil). Les frictions d'aujourd'hui ne sont pas un obstacle — elles t'activent.`;
        } else if (nTense > nPos) {
          synthText = `Côté ciel : ${nTense} tensions contre ${nPos} soutiens — journée qui demande de l'adaptation.${hasExact ? ' Un transit exact accentue l\'intensité.' : ''}`;
        } else if (nPos > nTense) {
          synthText = `Côté ciel : ${nPos} influx porteurs contre ${nTense} tensions — le ciel te soutient.${hasExact ? ' Un transit exact rend cette journée particulièrement active.' : ''}`;
        } else {
          synthText = `Côté ciel : autant de soutiens que de tensions (${nPos}/${nTense}) — journée contrastée.${hasExact ? ' Un transit exact rend le tout plus vif.' : ''}`;
        }
        const synthCol = (nTense > nPos && scoreHigh) ? P.gold : nPos > nTense ? '#4ade80' : nTense > nPos ? '#f97316' : P.gold;
        const synthIcon = (nTense > nPos && scoreHigh) ? '⚡' : nPos > nTense ? '🟢' : nTense > nPos ? '🟠' : '⚖️';
        return (
        <Sec icon="🔭" title="Ce qui t'active aujourd'hui">
          <Cd>
            <div style={{ fontSize: 12, color: P.textDim, marginBottom: 6, lineHeight: 1.5 }}>
              Les planètes du ciel touchent certaines zones de ton thème — c'est un des éléments qui compose ta journée, mais pas le seul.
            </div>
            <div style={{ padding: '8px 12px', marginBottom: 10, borderRadius: 8, background: synthCol + '10', border: `1px solid ${synthCol}25`, fontSize: 12, color: P.textMid, lineHeight: 1.5 }}>
              <strong style={{ color: synthCol }}>{synthIcon} </strong>
              {synthText}
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {astro.tr.slice(0, 10).map((t, i) => {
                const vibe = ASPECT_VIBE[t.t];
                const tdesc = TRANSIT_DESC[t.t] || '';
                return (
                  <div key={i} style={{ padding: '10px 12px', background: t.x ? `${P.gold}0C` : P.bg, borderRadius: 8, border: t.x ? `1px solid ${P.gold}30` : `1px solid ${P.textDim}15` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span title={ASPECT_EXPLAIN[t.t] || ''} style={{ fontSize: 10, color: vibe?.col || P.textDim, fontWeight: 600, background: (vibe?.col || P.textDim) + '15', padding: '1px 5px', borderRadius: 3, cursor: 'help' }}>{vibe?.label || t.t}</span>
                      {t.x ? <span style={{ fontSize: 9, color: P.gold, fontWeight: 700, background: P.gold + '18', padding: '1px 5px', borderRadius: 3 }}>EXACT — pic d'intensité</span> : null}
                      <span style={{ fontSize: 10, color: P.textDim, marginLeft: 'auto' }}>{t.o.toFixed(1)}°</span>
                    </div>
                    <div style={{ fontSize: 13, color: P.textMid, lineHeight: 1.5 }}>
                      <strong style={{ color: P.gold }}>{PLANET_FR[t.tp]}</strong> {tdesc} ton <strong style={{ color: P.text }}>{PLANET_FR[t.np]}</strong>{PL_HUMAN[t.np] ? ` (${PL_HUMAN[t.np]})` : ''}.
                    </div>
                    {TRANSIT_ADVICE[t.t] && (
                      <div style={{ fontSize: 11, color: P.gold, marginTop: 4, lineHeight: 1.4, opacity: 0.85 }}>
                        {TRANSIT_ADVICE[t.t]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Cd>
        </Sec>
        );
      })()}

      {/* ===== PHASES LUNAIRES — LES PROCHAINS TOURNANTS ÉMOTIONNELS ===== */}
      {upcomingPhases.length > 0 && (
        <Sec icon="🌙" title="Les prochains tournants émotionnels">
          <Cd>
            <div style={{ fontSize: 12, color: P.textDim, marginBottom: 10, lineHeight: 1.5 }}>
              La Lune rythme tes fins et tes recommencements. Chaque Nouvelle Lune pose une intention, chaque Pleine Lune révèle un aboutissement.
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {upcomingPhases.map((lp, i) => (
                <div key={i} style={{ padding: '12px 14px', background: P.bg, borderRadius: 10, border: `1px solid ${lp.type === 'new_moon' ? '#6366f120' : '#f59e0b20'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>{lp.type === 'new_moon' ? '🌑' : '🌕'}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: P.text }}>
                        {lp.type === 'new_moon' ? 'Nouvelle Lune' : 'Pleine Lune'} en {lp.signFr}
                      </div>
                      <div style={{ fontSize: 11, color: P.textDim }}>
                        {lp.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} — dans {lp.daysUntil} jour{lp.daysUntil > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: P.textMid, marginTop: 6, lineHeight: 1.5 }}>
                    {lp.type === 'new_moon'
                      ? (NEW_MOON_SIGN[lp.sign] || '')
                      : (FULL_MOON_SIGN[lp.sign] || '')}
                  </div>
                  {lp.natalHouse && (
                    <div style={{ fontSize: 11, color: P.gold, marginTop: 6, lineHeight: 1.4 }}>
                      → Pour toi spécifiquement, ça touche le domaine « {HOUSE_THEME_FR[lp.natalHouse] || 'identité'} ».
                      {lp.type === 'new_moon'
                        ? ` Pose une intention claire dans ce domaine.`
                        : ` Observe ce qui arrive à maturité dans ce domaine.`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Cd>
        </Sec>
      )}

      </SectionGroup>

      {/* ╔═══════════════════════════════════════════╗ */}
      {/* ║  GROUPE 2 — TES CYCLES                     ║ */}
      {/* ╚═══════════════════════════════════════════╝ */}
      <SectionGroup icon="📅" title="Tes cycles" defaultOpen={true}>

      {/* ===== PROFECTION — LE THÈME DE TON ANNÉE ===== */}
      {profection && (
        <Sec icon="🔄" title="Le thème de ton année">
          <Cd>
            <div style={{ fontSize: 12, color: P.textDim, marginBottom: 10, lineHeight: 1.5 }}>
              Chaque anniversaire ouvre un nouveau chapitre avec un thème dominant. À <strong style={{ color: P.text }}>{profection.age} ans</strong>, la vie t'invite à te concentrer sur le domaine « <strong style={{ color: P.gold }}>{profection.domain}</strong> ».
              {astro.noTime && <span style={{ fontSize: 10, color: P.textDim, opacity: 0.7 }}><br/>Calculé depuis ton signe solaire (heure inconnue).</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ padding: '10px 12px', background: P.bg, borderRadius: 8, border: `1px solid ${P.gold}30` }}>
                <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', marginBottom: 4 }}>Énergie de l'année</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: P.gold }}>
                  {SIGN_SYM[profection.activeSign] || ''} {SIGN_FR[profection.activeSign] || profection.activeSign}
                </div>
                <div style={{ fontSize: 12, color: P.textMid, marginTop: 6, lineHeight: 1.5, fontWeight: 500 }}>
                  {PROF_SIGN_FLAVOR[profection.activeSign] || ''}
                </div>
              </div>
              <div style={{ padding: '10px 12px', background: P.bg, borderRadius: 8, border: `1px solid ${P.textDim}15` }}>
                <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', marginBottom: 4 }}>Planète guide</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: P.text }}>
                  {PLANET_SYM[profection.timeLord.toLowerCase()] || ''} {profection.timeLord}
                </div>
                <div style={{ fontSize: 12, color: P.textMid, marginTop: 6, lineHeight: 1.5 }}>
                  {PROF_PLANET_FLAVOR[profection.timeLord.toLowerCase()] || ''}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 8, padding: '10px 12px', background: `${P.gold}08`, borderRadius: 8, fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>
              <strong style={{ color: P.gold }}>Concrètement :</strong> cette année tourne autour de « {profection.domain} ». L'énergie {SIGN_FR[profection.activeSign] || profection.activeSign} colore ta façon d'aborder ce domaine, et les moments où {profection.timeLord} est activée par un transit sont les moments-clés de ton année.
            </div>
            <div style={{ marginTop: 6, padding: '8px 12px', background: P.bg, borderRadius: 8, fontSize: 11, color: P.gold, lineHeight: 1.4 }}>
              → Porte ton attention sur tout ce qui touche à « {profection.domain} » — c'est là que les choses bougent le plus pour toi.
            </div>
          </Cd>
        </Sec>
      )}

      {/* ===== RÉVOLUTION SOLAIRE — TA MÉTÉO ANNUELLE ===== */}
      {solarReturn && solarReturn.hasActiveSR && (
        <Sec icon="☀" title="Ta météo annuelle">
          <Cd>
            <div style={{ fontSize: 12, color: P.textDim, marginBottom: 10, lineHeight: 1.5 }}>
              Chaque année autour de ton anniversaire, le Soleil revient exactement là où il était à ta naissance. La configuration du ciel à cet instant pose l'ambiance de tes 12 mois à venir — c'est ta « météo annuelle ».
              {solarReturn.srDate && (
                <> Prochain anniversaire solaire : <strong style={{ color: P.gold }}>{solarReturn.srDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.</>
              )}
            </div>
            {solarReturn.srAsc && (
              <div style={{ padding: '12px 14px', background: `${P.gold}0C`, borderRadius: 10, border: `1px solid ${P.gold}30`, marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', marginBottom: 6 }}>Le thème de ton année solaire</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 28, lineHeight: 1 }}>{SIGN_SYM[solarReturn.srAsc.sign] || ''}</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: P.gold }}>
                      Énergie {SIGN_FR[solarReturn.srAsc.sign] || solarReturn.srAsc.sign}
                    </div>
                    <div style={{ fontSize: 13, color: P.text, marginTop: 2 }}>
                      Domaine principal : <strong style={{ color: P.gold }}>{solarReturn.srAsc.theme}</strong>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 8, padding: '8px 10px', background: P.bg, borderRadius: 8, fontSize: 12, color: P.textMid, lineHeight: 1.5 }}>
                  {RS_SIGN_INTERP[solarReturn.srAsc.sign] || ''}
                </div>
                <div style={{ marginTop: 6, padding: '8px 10px', background: P.gold + '08', borderRadius: 8, fontSize: 12, color: P.textMid, lineHeight: 1.5 }}>
                  Le domaine le plus activé : « <strong style={{ color: P.gold }}>{solarReturn.srAsc.theme}</strong> ». C'est là que les choses bougent le plus pour toi cette année.
                </div>
              </div>
            )}
            {solarReturn.breakdown.length > 0 && (
              <div style={{ display: 'grid', gap: 4 }}>
                {solarReturn.breakdown.map((b, i) => (
                  <div key={i} style={{ padding: '6px 10px', background: P.bg, borderRadius: 6, fontSize: 11, color: P.textMid }}>
                    {b}
                  </div>
                ))}
              </div>
            )}
            {solarReturn.totalScore !== 0 && (
              <div style={{ marginTop: 10, padding: '10px 14px', background: (solarReturn.totalScore > 0 ? '#4ade80' : '#f97316') + '10', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: solarReturn.totalScore > 0 ? '#4ade80' : '#f97316' }}>
                  Tendance de l'année : {solarReturn.totalScore > 0 ? 'Porteuse' : 'En reconstruction'}
                </div>
                <div style={{ fontSize: 10, color: P.textDim, marginTop: 3 }}>
                  {solarReturn.totalScore > 0
                    ? 'L\'énergie de cette année te soutient — bon moment pour avancer sur tes projets importants.'
                    : 'Année de restructuration — prends le temps de poser les bases pour ce qui vient.'}
                </div>
              </div>
            )}
          </Cd>
        </Sec>
      )}

      {/* ===== RETOUR LUNAIRE — LA COULEUR DE TON MOIS ===== */}
      {lunarReturn && lunarReturn.lrDate && (
        <Sec icon="☽" title="La couleur de ton mois">
          <Cd>
            <div style={{ fontSize: 12, color: P.textDim, marginBottom: 10, lineHeight: 1.5 }}>
              Tous les ~27 jours, la Lune repasse exactement là où elle était à ta naissance. Ce passage dure environ 2 jours, mais c'est un peu comme un « mini-anniversaire émotionnel » : la configuration du ciel à ce moment-là donne le ton de tes 4 prochaines semaines (jusqu'au prochain passage).
            </div>
            <div style={{ padding: '12px 14px', background: P.bg, borderRadius: 10, border: `1px solid ${P.gold}20` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>☽</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: P.text }}>
                    Ton cycle émotionnel en cours
                  </div>
                  <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.4 }}>
                    Dernier passage : {lunarReturn.lrDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    {lunarReturn.daysUntilNext > 0 && ` · Prochain dans ${lunarReturn.daysUntilNext} jour${lunarReturn.daysUntilNext > 1 ? 's' : ''}`}
                  </div>
                </div>
              </div>
              {lunarReturn.lrAsc && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6, marginBottom: 6 }}>
                    Coloration du mois : <strong style={{ color: P.gold }}>{SIGN_SYM[lunarReturn.lrAsc.sign]} {lunarReturn.lrAsc.signFr}</strong>
                  </div>
                  <div style={{ fontSize: 11, color: P.textMid, padding: '6px 10px', background: P.bg, borderRadius: 6, lineHeight: 1.5, marginBottom: 6 }}>
                    {RS_SIGN_INTERP[lunarReturn.lrAsc.sign]?.replace("ton année", "ce mois") || `L'énergie ${lunarReturn.lrAsc.signFr} teinte ton mois.`}
                  </div>
                  <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>
                    Le domaine le plus sensible : <strong style={{ color: P.gold }}>{lunarReturn.lrAsc.theme}</strong>
                  </div>
                  <div style={{ fontSize: 12, color: P.textMid, marginTop: 6, fontStyle: 'italic', lineHeight: 1.5 }}>
                    Entre le {lunarReturn.lrDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} et le prochain passage, tu es plus sensible à tout ce qui touche à « {lunarReturn.lrAsc.theme} ».
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, color: P.gold, lineHeight: 1.4 }}>
                    → Observe tes réactions autour de « {lunarReturn.lrAsc.theme} » — c'est le fil rouge de ce mois.
                  </div>
                </div>
              )}
            </div>
          </Cd>
        </Sec>
      )}

      {/* ===== PROGRESSIONS — CE QUI CHANGE LENTEMENT EN TOI ===== */}
      {progressions && (
        <Sec icon="🔮" title="Ce qui change lentement en toi">
          <Cd>
            <div style={{ fontSize: 12, color: P.textDim, marginBottom: 10, lineHeight: 1.5 }}>
              Tu évolues avec le temps. Ton thème de naissance « avance » lentement : chaque planète traverse de nouveaux signes au fil des années, ce qui modifie tes besoins et tes envies en profondeur.
            </div>
            <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
              {[
                { label: '☀ Ta volonté', desc: 'Ce qui te motive en ce moment', sign: progressions.progressed.sunSign, interp: PROG_SUN_INTERP },
                { label: '☽ Tes émotions', desc: 'Ce que tu ressens en profondeur', sign: progressions.progressed.moonSign, interp: PROG_MOON_INTERP },
                { label: '♂ Ton énergie', desc: 'Comment tu agis et te bats', sign: progressions.progressed.marsSign, interp: PROG_MARS_INTERP },
              ].map((p, i) => (
                <div key={i} style={{ padding: '10px 12px', background: P.bg, borderRadius: 10, borderLeft: `3px solid ${P.gold}40` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: P.text }}>{p.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: P.gold }}>
                      {SIGN_SYM[p.sign]} {SIGN_FR[p.sign] || p.sign}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: P.textMid, lineHeight: 1.5 }}>
                    {p.interp[p.sign] || p.desc}
                  </div>
                </div>
              ))}
            </div>
            {progressions.aspects.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: P.textDim, marginBottom: 4, fontWeight: 600 }}>Ce qui mûrit en toi en ce moment :</div>
                <div style={{ fontSize: 10, color: P.textDim, marginBottom: 8, lineHeight: 1.4, fontStyle: 'italic' }}>
                  Ces connexions évoluent sur des mois ou des années — elles montrent les transformations profondes en cours.
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {progressions.aspects.slice(0, 5).map((a, i) => {
                    const progName = PLANET_FR[a.progPlanet.toLowerCase()] || a.progPlanet;
                    const natalName = PLANET_FR[a.natalPlanet] || a.natalPlanet;
                    const aspectLabel = ASPECT_FR[a.aspect] || a.aspect;
                    const icon = a.progPlanet === 'Sun' ? '☀' : a.progPlanet === 'Moon' ? '☽' : '♂';
                    const mood = a.points > 0 ? 'porteur' : 'exigeant';
                    const moodCol = a.points > 0 ? '#4ade80' : '#f97316';
                    return (
                      <div key={i} style={{ padding: '8px 10px', background: P.bg, borderRadius: 8, borderLeft: `3px solid ${moodCol}40` }}>
                        <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.5 }}>
                          {icon} Ton <strong style={{ color: P.text }}>{progName}</strong> progressé (qui évolue avec le temps) est <span style={{ color: P.textMid }}>{aspectLabel}</span> ton <strong style={{ color: P.text }}>{natalName}</strong> de naissance.
                        </div>
                        <div style={{ fontSize: 10, color: moodCol, marginTop: 3 }}>
                          {a.points > 0
                            ? '→ Un courant porteur — laisse cette évolution faire son travail.'
                            : '→ Un passage exigeant — sois patient·e avec toi-même, ça transforme en profondeur.'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {progressions.solarArcAspects.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: P.textDim, marginBottom: 4, fontWeight: 600 }}>Ce qui se transforme en profondeur (1-2 ans) :</div>
                <div style={{ fontSize: 10, color: P.textDim, marginBottom: 8, lineHeight: 1.4, fontStyle: 'italic' }}>
                  Ces connexions (arcs solaires) évoluent très lentement — elles activent de nouveaux thèmes sur des mois ou des années, pas au jour le jour.
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {progressions.solarArcAspects.slice(0, 3).map((a, i) => {
                    const saName = PLANET_FR[a.saPlanet] || a.saPlanet;
                    const natalName = PLANET_FR[a.natalPlanet] || a.natalPlanet;
                    const aspectLabel = ASPECT_FR[a.aspect] || a.aspect;
                    const moodCol = a.points > 0 ? '#4ade80' : '#f97316';
                    return (
                      <div key={i} style={{ padding: '8px 10px', background: P.bg, borderRadius: 8, borderLeft: `3px solid ${moodCol}40` }}>
                        <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.5 }}>
                          ◎ <strong style={{ color: P.text }}>{saName}</strong> <span style={{ color: P.textDim }}>{aspectLabel}</span> ton <strong style={{ color: P.text }}>{natalName}</strong> natal.
                        </div>
                        <div style={{ fontSize: 10, color: moodCol, marginTop: 3 }}>
                          {a.points > 0
                            ? '→ Une ouverture se crée — un domaine de ta vie s\'élargit.'
                            : '→ Une restructuration en cours — quelque chose doit changer pour que tu avances.'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {progressions.totalScore !== 0 && (
              <div style={{ marginTop: 10, padding: '10px 14px', background: (progressions.totalScore > 0 ? '#4ade80' : '#f97316') + '10', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: progressions.totalScore > 0 ? '#4ade80' : '#f97316' }}>
                  Climat intérieur : {progressions.totalScore > 0 ? 'Porteur' : 'En transformation'}
                </div>
                <div style={{ fontSize: 10, color: P.textDim, marginTop: 4, lineHeight: 1.4 }}>
                  {progressions.totalScore > 0
                    ? 'Tes évolutions intérieures te soutiennent en ce moment — bon moment pour avancer sur tes projets de fond.'
                    : 'Période de restructuration intérieure — prends le temps de digérer les changements avant de forcer le mouvement.'}
                </div>
              </div>
            )}
          </Cd>
        </Sec>
      )}

      </SectionGroup>

      {/* ╔═══════════════════════════════════════════╗ */}
      {/* ║  GROUPE 3 — TON EMPREINTE COSMIQUE         ║ */}
      {/* ╚═══════════════════════════════════════════╝ */}
      <SectionGroup icon="🧬" title="Ton empreinte cosmique" defaultOpen={false}>

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION 1 — TON PORTRAIT CÉLESTE                   */}
      {/* Mini-roue + Big Three + Portrait IA                 */}
      {/* Verdict Ronde #28bis : fusionner ces 3 éléments     */}
      {/* ═══════════════════════════════════════════════════ */}
      <Sec icon="🌙" title="Ton portrait céleste">
        <Cd>
          {astro.noTime && <div style={{ marginBottom: 14, padding: '10px 14px', background: `${P.gold}12`, borderRadius: 8, border: `1px solid ${P.gold}30`, fontSize: 11, color: P.gold, textAlign: 'center', lineHeight: 1.5 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>⏱ Heure de naissance inconnue</div>
            <div style={{ color: P.textMid, fontSize: 10 }}>Calcul effectué à midi par convention astrologique. Les positions du Soleil et des planètes lentes restent fiables. <b style={{ color: P.gold }}>L'Ascendant et les maisons ne sont pas calculés</b> — ils dépendent de l'heure exacte.</div>
          </div>}

          {/* Mini-roue avec aspects majeurs — tap pour vue complète */}
          {!astro.noTime && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, cursor: 'pointer' }} {...a11yClick(() => setShowFullWheel(true))} aria-label="Ouvrir la carte du ciel complète">
              <svg viewBox={`0 0 ${WHL} ${WHL}`} width="100%" style={{ maxWidth: 220 }}>
                {SIGNS.map((sign, i) => {
                  const a1 = i * 30 - 90, a2 = a1 + 30;
                  const r1a = (a1 * Math.PI) / 180, r2a = (a2 * Math.PI) / 180;
                  const x1o = C + R1 * Math.cos(r1a), y1o = C + R1 * Math.sin(r1a);
                  const x2o = C + R1 * Math.cos(r2a), y2o = C + R1 * Math.sin(r2a);
                  const x1i = C + R2 * Math.cos(r1a), y1i = C + R2 * Math.sin(r1a);
                  const x2i = C + R2 * Math.cos(r2a), y2i = C + R2 * Math.sin(r2a);
                  const ec = ELEM_COL[SIGN_ELEM[sign]] || '#888';
                  const [sx, sy] = polar(i * 30 + 15, (R1 + R2) / 2);
                  return (
                    <g key={sign}>
                      <path
                        d={`M${x1i},${y1i} L${x1o},${y1o} A${R1},${R1} 0 0,1 ${x2o},${y2o} L${x2i},${y2i} A${R2},${R2} 0 0,0 ${x1i},${y1i}`}
                        fill={ec + '15'} stroke={ec + '40'} strokeWidth={0.5}
                      />
                      <text x={sx} y={sy} textAnchor="middle" dominantBaseline="central" fontSize={11} fill={ec}>
                        {SIGN_SYM[sign]}
                      </text>
                    </g>
                  );
                })}
                <circle cx={C} cy={C} r={R2} fill="none" stroke={P.textDim + '30'} strokeWidth={0.5} />
                <circle cx={C} cy={C} r={R3} fill="none" stroke={P.textDim + '20'} strokeWidth={0.3} />
                {/* Traits d'aspects majeurs (trigone/carré/opposition) */}
                {astro.as.filter((a: { t: string }) => ['trine', 'square', 'opposition'].includes(a.t)).map((a: { p1: string; p2: string; t: string; o: number }, ai: number) => {
                  const i1 = wheelPl.findIndex(p => p.k === a.p1);
                  const i2 = wheelPl.findIndex(p => p.k === a.p2);
                  if (i1 < 0 || i2 < 0) return null;
                  const [x1, y1] = polar(plLons[i1], R3 - 4);
                  const [x2, y2] = polar(plLons[i2], R3 - 4);
                  const col = a.t === 'trine' ? '#4ade80' : a.t === 'square' ? '#f97316' : '#60a5fa';
                  return <line key={`asp-${ai}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={0.8} opacity={0.5} />;
                })}
                {wheelPl.map((pp, i) => {
                  const lon = plLons[i];
                  const [px, py] = polar(lon, R3 - 4);
                  const [tx, ty] = polar(lon, R3 + 14);
                  const ec = ELEM_COL[SIGN_ELEM[pp.s]] || P.textDim;
                  return (
                    <g key={pp.k}>
                      <circle cx={px} cy={py} r={3.5} fill={ec} opacity={0.85} />
                      <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight={700} fill={ec}>
                        {PL_SHORT[pp.k]}
                      </text>
                    </g>
                  );
                })}
                {(() => {
                  const ascLon = SIGNS.indexOf(astro.b3.asc) * 30 + astro.ad;
                  const [ax, ay] = polar(ascLon, R1 + 10);
                  return <text x={ax} y={ay} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight={700} fill={P.gold}>Asc ↑</text>;
                })()}
              </svg>
              <div style={{ fontSize: 9, color: P.textDim, textAlign: 'center', marginTop: 4, opacity: 0.6 }}>Toucher pour explorer les aspects</div>
            </div>
          )}

          {/* Big Three cards */}
          <div style={{ display: 'grid', gap: 10 }}>
            {(astro.noTime
              ? [{ k: 'sun', s: astro.b3.sun, lb: '☉ Soleil — Ton identité', sub: 'Qui tu es fondamentalement' },
                 { k: 'moon', s: astro.b3.moon, lb: '☽ Lune — Tes émotions', sub: 'Tes réflexes sous pression' }]
              : [{ k: 'sun', s: astro.b3.sun, lb: '☉ Soleil — Ton identité', sub: 'Qui tu es fondamentalement' },
                 { k: 'moon', s: astro.b3.moon, lb: '☽ Lune — Tes émotions', sub: 'Tes réflexes sous pression' },
                 { k: 'asc', s: astro.b3.asc, lb: '↑ Ascendant — Ton image', sub: 'Comment les autres te voient' }]
            ).map(({ k, s, lb, sub }) => {
              const ec = ELEM_COL[SIGN_ELEM[s]] || P.textDim;
              const desc = B3_DESC[k]?.[s] || '';
              return (
                <div key={k} style={{ padding: '12px 14px', background: ec + '0A', borderRadius: 10, borderLeft: `3px solid ${ec}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 28, color: ec }}>{SIGN_SYM[s]}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: P.text }}>{lb}</div>
                      <div style={{ fontSize: 11, color: P.textDim }}>{sub}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: ec, marginBottom: 4 }}>{SIGN_FR[s]}</div>
                  {desc && <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.5 }}>{desc}</div>}
                </div>
              );
            })}
          </div>
          {/* Portrait IA intégré au portrait céleste */}
          <div style={{ marginTop: 16, borderTop: `1px solid ${P.textDim}15`, paddingTop: 12 }}>
            {portraitStatus === 'idle' && (
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={generatePortrait}
                  style={{
                    width: '100%', padding: '10px 0', borderRadius: 8,
                    background: 'linear-gradient(135deg, #a78bfa18, #7c3aed18)',
                    border: '1px solid #a78bfa40', color: '#a78bfa',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  ✨ Décoder ma signature astrale (IA)
                </button>
                <div style={{ fontSize: 10, color: P.textDim, marginTop: 5, lineHeight: 1.4 }}>
                  Génère un portrait personnalisé de ta combinaison Soleil · Lune · Ascendant en langage clair
                </div>
              </div>
            )}
            {portraitStatus === 'loading' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', padding: '8px 0' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                  <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                </svg>
                <span style={{ fontSize: 12, color: '#a78bfa' }}>{loadingText}</span>
              </div>
            )}
            {portraitStatus === 'error' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 6 }}>Portrait temporairement indisponible.</div>
                <button onClick={generatePortrait} aria-label="Réessayer de générer le portrait" style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid #ef444440', background: 'transparent', color: '#ef4444', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Réessayer</button>
              </div>
            )}
            {portraitStatus === 'done' && portrait && (
              <div style={{ animation: 'fadeInPortrait 0.5s ease' }}>
                <style>{`@keyframes fadeInPortrait { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                {portrait.sections.map((s, i) => (
                  <div key={i} style={{ marginBottom: i < portrait.sections.length - 1 ? 14 : 0 }}>
                    <div style={{ fontSize: 10, color: i === 0 ? P.gold : '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{s.titre}</div>
                    <div style={{ fontSize: 12, color: '#d1d5db', lineHeight: 1.6 }}>{s.contenu}</div>
                    {i < portrait.sections.length - 1 && <div style={{ height: 1, background: '#1f1f2e', marginTop: 14 }} />}
                  </div>
                ))}
                <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
                  <button onClick={() => { const text = portrait.sections.map(s => `${s.titre}\n${s.contenu}`).join('\n\n'); navigator.clipboard?.writeText(text).catch(() => {}); }} aria-label="Copier le portrait" style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: '1px solid #a78bfa30', background: 'transparent', color: '#a78bfa', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>Copier</button>
                  <button onClick={() => { setPortrait(null); setPortraitStatus('idle'); if (astro) sto.remove(getPortraitCacheKey(astro)); }} aria-label="Regénérer le portrait" style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${P.cardBdr}`, background: 'transparent', color: P.textDim, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>Regénérer</button>
                </div>
              </div>
            )}
          </div>
        </Cd>
      </Sec>

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION 2 — TES PLANÈTES                           */}
      {/* 3 cartes visibles + bouton "Voir les 11 autres"    */}
      {/* Verdict Ronde #28bis : liste verticale limitée      */}
      {/* ═══════════════════════════════════════════════════ */}
      <Sec icon="🪐" title="Tes planètes">
        <Cd>
          <div style={{ fontSize: 12, color: P.textDim, marginBottom: 10, lineHeight: 1.5 }}>
            Chaque planète représente une part de toi. Voici les 3 plus personnelles — clique pour voir les autres.
          </div>
          {/* Toggle système de maisons — avec explication */}
          {bt && <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: P.textDim }}>Découpage des domaines de vie :</span>
              {(['placidus', 'wholesign'] as LocalHouseSystem[]).map(hs => (
                <button key={hs} onClick={() => setHouseSystem(hs)} aria-label={`Système de maisons: ${HOUSE_SYSTEM_FR[hs]}`} style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 5, cursor: 'pointer', fontWeight: 600,
                  background: houseSystem === hs ? P.gold + '25' : 'transparent',
                  color: houseSystem === hs ? P.gold : P.textDim,
                  border: `1px solid ${houseSystem === hs ? P.gold + '60' : P.textDim + '30'}`,
                  transition: 'all 0.2s ease',
                }}>{HOUSE_SYSTEM_FR[hs]}</button>
              ))}
            </div>
            <div style={{ fontSize: 10, color: P.textDim, lineHeight: 1.4, opacity: 0.7 }}>
              {houseSystem === 'placidus'
                ? 'Placidus — découpage personnalisé selon ton heure et lieu de naissance. Le plus courant en astrologie moderne.'
                : 'Signes Entiers — chaque signe = un domaine de vie complet. Plus simple, utilisé en astrologie traditionnelle.'}
            </div>
          </div>}
          {/* Feedback visuel : quelles planètes changent de domaine de vie */}
          {houseSystem !== 'placidus' && toggleDiffCount > 0 && (
            <div style={{ marginBottom: 10, padding: '8px 10px', background: P.gold + '0A', borderRadius: 8, border: `1px solid ${P.gold}20` }}>
              <div style={{ fontSize: 11, color: P.gold, fontWeight: 600, marginBottom: 6 }}>
                En Signes Entiers, {toggleDiffCount} énergie{toggleDiffCount > 1 ? 's' : ''} s'exprime{toggleDiffCount > 1 ? 'nt' : ''} dans un autre domaine de vie :
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                {toggleDiffs.map(d => {
                  const human = PL_HUMAN[d.k] || PLANET_FR[d.k];
                  const fromTheme = HOUSE_THEME_FR[d.from] || `maison ${d.from}`;
                  const toTheme = HOUSE_THEME_FR[d.to] || `maison ${d.to}`;
                  return (
                    <div key={d.k} style={{ fontSize: 11, color: P.textMid, background: P.gold + '08', padding: '4px 8px', borderRadius: 5, lineHeight: 1.4 }}>
                      <span style={{ color: P.text, fontWeight: 600 }}>{human.charAt(0).toUpperCase() + human.slice(1)}</span>
                      {' '}passe du domaine <span style={{ color: P.gold }}>« {fromTheme} »</span> → <span style={{ color: P.gold }}>« {toTheme} »</span>
                      <span style={{ fontSize: 9, color: P.textDim }}> ({PLANET_FR[d.k]})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {houseSystem !== 'placidus' && toggleDiffCount === 0 && (
            <div style={{ marginBottom: 10, padding: '6px 10px', background: P.textDim + '08', borderRadius: 8, fontSize: 10, color: P.textDim }}>
              Pour ton thème, les deux systèmes placent chaque planète dans le même domaine de vie — aucune différence.
            </div>
          )}
          <div style={{ display: 'grid', gap: 8 }}>
            {(() => {
              // Exclure Sun/Moon déjà affichés dans "Ton Portrait Céleste"
              const otherPl = displayPl.filter(p => p.k !== 'sun' && p.k !== 'moon');
              return (showAllPlanets ? otherPl : otherPl.slice(0, 3)).map(pl => {
              const SPECIAL_COL: Record<string, string> = {
                northNode: '#9B59B6', southNode: '#7D3C98', chiron: '#F0B429', lilith: '#E74C3C',
              };
              const c = SPECIAL_COL[pl.k] || ELEM_COL[SIGN_ELEM[pl.s]] || P.textDim;
              const desc = getPlanetSignDesc(pl.k, pl.s);
              const role = PL_ROLE[pl.k] || '';
              const isExp = expandedPl.has(pl.k);
              return (
                <div key={pl.k} style={{ background: c + '08', borderRadius: 10, border: `1px solid ${c}20`, overflow: 'hidden' }}>
                  <div {...a11yClick(() => togglePl(pl.k))} aria-label={`Détails de ${PLANET_FR[pl.k] || pl.k}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: c + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, color: c, flexShrink: 0 }}>
                      {PLANET_SYM[pl.k]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: P.text }}>{PLANET_FR[pl.k]}</span>
                        <span style={{ fontSize: 12, color: c, fontWeight: 600 }}>{SIGN_SYM[pl.s]} {SIGN_FR[pl.s]}</span>
                        {pl.retro && <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 700, background: '#ef444418', padding: '1px 4px', borderRadius: 3 }} title="Rétrograde — cette énergie travaille en profondeur">℞ Rétro</span>}
                        {pl.dig && <span title={DIG_TOOLTIP[pl.dig]} style={{ fontSize: 9, color: DIG_COL[pl.dig], background: DIG_COL[pl.dig] + '18', padding: '1px 4px', borderRadius: 3, cursor: 'help' }}>{DIG_SYM[pl.dig]} {DIG_FR[pl.dig]}</span>}
                      </div>
                      <div style={{ fontSize: 10, color: P.textDim, marginTop: 1 }}>{role}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: P.textDim }} title={`Position : ${pl.d.toFixed(1)}° dans le signe`}>{pl.d.toFixed(0)}°</span>
                      {!astro.noTime && <span style={{ fontSize: 9, color: P.gold + 'AA' }}>{HOUSE_THEME_FR[pl.h] || `Maison ${pl.h}`}</span>}
                    </div>
                    <span style={{ fontSize: 10, color: P.textDim }}>{isExp ? '▲' : '▼'}</span>
                  </div>
                  {isExp && desc && (
                    <div style={{ padding: '0 12px 10px 12px' }}>
                      <div style={{ padding: '8px 10px', background: c + '08', borderRadius: 6, borderLeft: `3px solid ${c}` }}>
                        <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>{desc}</div>
                      </div>
                      {pl.retro && (
                        <div style={{ marginTop: 4, padding: '4px 8px', background: '#ef444410', borderRadius: 5, fontSize: 10, color: '#ef4444', lineHeight: 1.4 }}>
                          ℞ Phase d'intégration — cette part de toi travaille en profondeur, elle mûrit intérieurement.
                        </div>
                      )}
                      {pl.dig && (
                        <div style={{ marginTop: 4, padding: '4px 8px', background: DIG_COL[pl.dig] + '10', borderRadius: 5, fontSize: 10, color: DIG_COL[pl.dig], lineHeight: 1.4 }}>
                          {DIG_HINT[pl.dig]}
                          {DIG_REASON[pl.k]?.[pl.s] && (
                            <div style={{ marginTop: 3, fontSize: 10, color: P.textMid, fontStyle: 'italic' }}>Pourquoi ? {DIG_REASON[pl.k][pl.s]}</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            });
            })()}
          </div>
          {!showAllPlanets && displayPl.length > 5 && (
            <button onClick={() => setShowAllPlanets(true)} aria-label={`Voir les ${displayPl.length - 2 - 3} autres planètes`} style={{
              width: '100%', marginTop: 8, padding: '10px 0', borderRadius: 8,
              background: P.gold + '10', border: `1px solid ${P.gold}30`, color: P.gold,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Voir les {displayPl.length - 2 - 3} autres planètes
            </button>
          )}
          {showAllPlanets && (
            <button onClick={() => setShowAllPlanets(false)} aria-label="Réduire la liste des planètes" style={{
              width: '100%', marginTop: 8, padding: '8px 0', borderRadius: 8,
              background: 'transparent', border: `1px solid ${P.textDim}30`, color: P.textDim,
              fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Réduire
            </button>
          )}
        </Cd>
      </Sec>

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION 3 — TON TEMPÉRAMENT                        */}
      {/* Segmented Control : Éléments | Modes | Synthèse    */}
      {/* Verdict Ronde #28bis : segmented control autorisé   */}
      {/* ═══════════════════════════════════════════════════ */}
      {astro.el && astro.mo && (
        <Sec icon="🧬" title="Ton tempérament">
          <Cd>
            {/* Segmented Control — style pilule iOS */}
            <div style={{
              display: 'flex', gap: 0, marginBottom: 12, borderRadius: 8, overflow: 'hidden',
              border: `1px solid ${P.gold}30`, background: P.bg,
            }}>
              {([
                { key: 'synthese' as const, label: 'Synthèse' },
                { key: 'elements' as const, label: 'Éléments' },
                { key: 'modes' as const, label: 'Modes' },
              ]).map(seg => (
                <button key={seg.key} onClick={() => setTempSegment(seg.key)} aria-label={`Vue ${seg.label}`} style={{
                  flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: tempSegment === seg.key ? P.gold + '20' : 'transparent',
                  color: tempSegment === seg.key ? P.gold : P.textDim,
                  border: 'none', borderRight: seg.key !== 'modes' ? `1px solid ${P.gold}20` : 'none',
                  fontFamily: 'inherit', transition: 'all 0.2s',
                }}>{seg.label}</button>
              ))}
            </div>

            {/* Vue Synthèse — narrative enrichie */}
            {tempSegment === 'synthese' && (() => {
              const ELEM_NAME_FR: Record<string, string> = { fire: 'Feu', earth: 'Terre', air: 'Air', water: 'Eau' };
              const ELEM_HUMAN: Record<string, string> = { fire: 'l\'action et l\'enthousiasme', earth: 'le concret et la stabilité', air: 'les idées et les échanges', water: 'l\'intuition et les émotions' };
              const MODE_HUMAN: Record<string, string> = { cardinal: 'lancer les choses', fixed: 'tenir le cap', mutable: 's\'adapter et évoluer' };
              const COMBO: Record<string, string> = {
                'fire-cardinal': 'Tu es un initiateur de feu — tu fonces, tu lances, tu inspires. Quand tu crois en quelque chose, tu y vas sans hésiter.',
                'fire-fixed': 'Tu es un créateur tenace — passionné et déterminé, tu ne lâches pas. Ta flamme brûle longtemps une fois allumée.',
                'fire-mutable': 'Tu es un explorateur enthousiaste — tu t\'enflammes vite et tu t\'adaptes. Tu rebondis naturellement d\'une aventure à l\'autre.',
                'earth-cardinal': 'Tu es un bâtisseur ambitieux — tu structures et tu lances du concret. Tu transformes les idées en réalité.',
                'earth-fixed': 'Tu es une fondation inébranlable — stable, patient, tu construis pour durer. On peut compter sur toi.',
                'earth-mutable': 'Tu es un praticien adaptable — tu optimises et tu trouves toujours la solution. Tu es pragmatique et flexible.',
                'air-cardinal': 'Tu es un stratège social — tu crées des liens et tu lances des idées. Tu excelles à fédérer autour de projets.',
                'air-fixed': 'Tu es un penseur original — convictions profondes et innovation obstinée. Tes idées ont de la profondeur.',
                'air-mutable': 'Tu es un esprit vif — communicateur né, tu jongles entre idées et gens. Tu t\'adaptes à n\'importe quel interlocuteur.',
                'water-cardinal': 'Tu es un leader émotionnel — tu inities en ressentant, tu protèges. Tu sens les choses avant les autres.',
                'water-fixed': 'Tu es un intense qui va au fond — émotions profondes, tu ne lâches rien. Ta loyauté est indéfectible.',
                'water-mutable': 'Tu es un intuitif fluide — empathique, tu te coules dans chaque situation. Tu absorbes l\'ambiance et tu t\'ajustes.',
              };
              const COMBO_FORCE: Record<string, string> = {
                'fire-cardinal': 'Capacité à entraîner les autres et à passer à l\'action immédiatement.',
                'fire-fixed': 'Passion qui dure — tu ne t\'éteins pas au premier obstacle.',
                'fire-mutable': 'Enthousiasme contagieux et capacité à pivoter sans perdre d\'élan.',
                'earth-cardinal': 'Tu transformes chaque idée en plan d\'action concret.',
                'earth-fixed': 'Fiabilité absolue — les gens savent qu\'avec toi, c\'est solide.',
                'earth-mutable': 'Tu trouves toujours une solution pratique, même dans le chaos.',
                'air-cardinal': 'Tu connectes les bonnes personnes aux bonnes idées.',
                'air-fixed': 'Tes idées ont du fond et tu les défends avec conviction.',
                'air-mutable': 'Tu communiques avec fluidité et tu t\'adaptes à tout interlocuteur.',
                'water-cardinal': 'Tu sens les besoins des autres avant même qu\'ils les expriment.',
                'water-fixed': 'Ta profondeur émotionnelle crée des liens indestructibles.',
                'water-mutable': 'Tu lis les ambiances et tu t\'ajustes instinctivement.',
              };
              const COMBO_DEFI: Record<string, string> = {
                'fire-cardinal': 'Patience — tu peux foncer trop vite sans mesurer les conséquences.',
                'fire-fixed': 'Lâcher prise — tu peux t\'accrocher à des causes perdues par fierté.',
                'fire-mutable': 'Focus — tu peux t\'éparpiller en voulant tout explorer à la fois.',
                'earth-cardinal': 'Flexibilité — tout planifier peut t\'empêcher de saisir l\'imprévu.',
                'earth-fixed': 'Ouverture au changement — la routine peut devenir une prison dorée.',
                'earth-mutable': 'Ambition — à trop optimiser le présent, tu peux oublier de viser plus haut.',
                'air-cardinal': 'Profondeur — lancer beaucoup d\'idées sans toujours les approfondir.',
                'air-fixed': 'Écoute — tes convictions fortes peuvent te fermer à d\'autres perspectives.',
                'air-mutable': 'Ancrage — tu peux surfer sur les idées sans jamais te poser.',
                'water-cardinal': 'Détachement — tu peux trop absorber les émotions des autres.',
                'water-fixed': 'Pardon — une blessure peut rester longtemps en toi.',
                'water-mutable': 'Limites — tu peux te perdre en voulant t\'adapter à tout le monde.',
              };
              const mxEl = Math.max(...Object.values(astro.el));
              const topElem = Object.entries(astro.el).find(([, v]) => v === mxEl)?.[0] || '';
              const mxMo = Math.max(...Object.values(astro.mo));
              const topMode = Object.entries(astro.mo).find(([, v]) => v === mxMo)?.[0] || '';
              const comboKey = `${topElem}-${topMode}`;
              return (
                <div>
                  {/* Profil narratif principal */}
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: `${P.gold}08`, border: `1px solid ${P.gold}20`, marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>
                      {COMBO[comboKey] || `Un mélange unique de ${ELEM_HUMAN[topElem]} et de ${MODE_HUMAN[topMode]}.`}
                    </div>
                  </div>
                  {/* Les deux piliers : Élément + Mode */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <div style={{ flex: 1, padding: '10px 10px', borderRadius: 8, background: (ELEM_COL[topElem] || P.gold) + '10', border: `1px solid ${ELEM_COL[topElem] || P.gold}25` }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: ELEM_COL[topElem] || P.gold, marginBottom: 2 }}>{ELEM_FR[topElem]}</div>
                      <div style={{ fontSize: 10, color: P.textDim, marginBottom: 4 }}>Ton carburant</div>
                      <div style={{ fontSize: 10, color: P.textMid, lineHeight: 1.4 }}>Tu fonctionnes par {ELEM_HUMAN[topElem] || 'cet élément'}.</div>
                    </div>
                    <div style={{ flex: 1, padding: '10px 10px', borderRadius: 8, background: (MODE_COL[topMode] || P.gold) + '10', border: `1px solid ${MODE_COL[topMode] || P.gold}25` }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: MODE_COL[topMode] || P.gold, marginBottom: 2 }}>{MODE_FR[topMode]}</div>
                      <div style={{ fontSize: 10, color: P.textDim, marginBottom: 4 }}>Ton mode d'action <span style={{ opacity: 0.6 }}>({MODE_TECH[topMode]})</span></div>
                      <div style={{ fontSize: 10, color: P.textMid, lineHeight: 1.4 }}>Ta tendance naturelle : {MODE_HUMAN[topMode] || ''}.</div>
                    </div>
                  </div>
                  {/* Force + Défi */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: '#4ade8008', borderLeft: '2px solid #4ade8040' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#4ade80', marginBottom: 2 }}>✦ Ta force</div>
                      <div style={{ fontSize: 10, color: P.textMid, lineHeight: 1.4 }}>{COMBO_FORCE[comboKey] || ''}</div>
                    </div>
                    <div style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: '#f9731608', borderLeft: '2px solid #f9731640' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#f97316', marginBottom: 2 }}>⚡ Ton défi</div>
                      <div style={{ fontSize: 10, color: P.textMid, lineHeight: 1.4 }}>{COMBO_DEFI[comboKey] || ''}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: P.textDim, marginTop: 8, fontStyle: 'italic', textAlign: 'center', lineHeight: 1.4 }}>
                    Ce profil est fixe depuis ta naissance — c'est la signature profonde de ta personnalité.
                  </div>
                </div>
              );
            })()}

            {/* Vue Éléments */}
            {tempSegment === 'elements' && (() => {
              const mx = Math.max(...Object.values(astro.el));
              const topElem = Object.entries(astro.el).find(([, v]) => v === mx)?.[0] || '';
              const ELEM_INTERP: Record<string, string> = {
                fire: 'Tu fonctionnes à l\'énergie, l\'enthousiasme et l\'action.',
                earth: 'Tu as besoin de concret, de stabilité et de résultats tangibles.',
                air: 'Tu fonctionnes par les idées, les échanges et la réflexion.',
                water: 'Tu fonctionnes à l\'intuition, l\'empathie et l\'émotion.',
              };
              return (
                <div>
                  <div style={{ fontSize: 12, color: P.textMid, marginBottom: 8, padding: '6px 10px', background: P.bg, borderRadius: 6, lineHeight: 1.5 }}>
                    Ton carburant principal : {ELEM_FR[topElem]} — {ELEM_INTERP[topElem] || ''}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {Object.entries(astro.el).map(([k, v]) => {
                      const isTop = v === mx;
                      return (
                        <div key={k} style={{ padding: '8px 10px', background: isTop ? ELEM_COL[k] + '12' : P.bg, borderRadius: 8, border: isTop ? `1px solid ${ELEM_COL[k]}30` : '1px solid transparent' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: ELEM_COL[k], fontWeight: 700 }}>{ELEM_FR[k]}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: isTop ? ELEM_COL[k] : P.textMid, marginLeft: 'auto' }}>{v.toFixed(0)}</span>
                          </div>
                          <div style={{ height: 6, background: P.bg, borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: (v / mx * 100) + '%', height: '100%', background: ELEM_COL[k] + (isTop ? 'AA' : '55'), borderRadius: 3 }} />
                          </div>
                          {isTop && <div style={{ fontSize: 9, color: ELEM_COL[k], marginTop: 2, fontWeight: 600 }}>✦ Dominant</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Vue Modes */}
            {tempSegment === 'modes' && (() => {
              const mx = Math.max(...Object.values(astro.mo));
              const topMode = Object.entries(astro.mo).find(([, v]) => v === mx)?.[0] || '';
              const MODE_INTRO: Record<string, string> = {
                cardinal: 'Ton mode d\'action naturel : tu lances, tu inities, tu prends les devants.',
                fixed: 'Ton mode d\'action naturel : tu persévères, tu tiens bon, tu ne lâches pas.',
                mutable: 'Ton mode d\'action naturel : tu t\'adaptes, tu évolues, tu rebondis face aux situations.',
              };
              return (
                <div>
                  <div style={{ fontSize: 12, color: P.textMid, marginBottom: 8, padding: '6px 10px', background: P.bg, borderRadius: 6, lineHeight: 1.5 }}>
                    {MODE_INTRO[topMode] || `Ton mode dominant : ${MODE_FR[topMode]}`}
                  </div>
                  <div className="grid-responsive-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {Object.entries(astro.mo).map(([k, v]) => {
                      const isTop = v === mx;
                      return (
                        <div key={k} style={{ textAlign: 'center', padding: '10px 6px', background: isTop ? MODE_COL[k] + '15' : P.bg, borderRadius: 8, border: isTop ? `1px solid ${MODE_COL[k]}30` : '1px solid transparent' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: isTop ? MODE_COL[k] : P.textDim }}>{MODE_FR[k]}</div>
                          <div style={{ fontSize: 8, color: P.textDim, opacity: 0.5 }}>({MODE_TECH[k]})</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: isTop ? MODE_COL[k] : P.textMid, margin: '4px 0' }}>{v.toFixed(0)}</div>
                          <div style={{ fontSize: 9, color: P.textDim, lineHeight: 1.3 }}>{MODE_DESC[k]}</div>
                          {isTop && <div style={{ fontSize: 9, color: MODE_COL[k], marginTop: 2, fontWeight: 600 }}>✦ Dominant</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </Cd>
        </Sec>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION 4 — TES DYNAMIQUES                         */}
      {/* Aspects + GT/T-Carré (wording accessible) +         */}
      {/* Dominante (sans score) + Stelliums                  */}
      {/* ═══════════════════════════════════════════════════ */}
      <Sec icon="🌟" title="Tes dynamiques internes">
        <Cd>

          {/* --- Dominante planétaire (sans score, narrative) --- */}
          {/* Verdict #3 : visible mais sans score numérique */}
          {!astro.noTime && astro.dominant && astro.dominant.length > 0 && (() => {
            const dom = astro.dominant[0];
            const PLANET_COL: Record<string, string> = {
              sun:'#FFD700', moon:'#C0C0FF', mercury:'#A0D8EF', venus:'#FFB6C1',
              mars:'#FF6B6B', jupiter:'#FFA07A', saturn:'#CD853F',
              uranus:'#00CED1', neptune:'#6A5ACD', pluto:'#8B0000',
            };
            const col = PLANET_COL[dom.planet] || P.gold;
            return (
              <div style={{ padding: '12px 14px', marginBottom: 12, borderRadius: 10, background: col + '0A', border: `1px solid ${col}30` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: col + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: col, flexShrink: 0 }}>
                    {PLANET_SYM[dom.planet]}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', letterSpacing: 0.5 }}>Ton énergie dominante</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: P.text }}>{PLANET_FR[dom.planet]}</div>
                  </div>
                </div>
                {DOMINANT_PLANET_INTERP[dom.planet] && (
                  <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>
                    {DOMINANT_PLANET_INTERP[dom.planet]}
                  </div>
                )}
              </div>
            );
          })()}

          {/* --- Aspects nataux + GT + T-Carré fusionnés --- */}
          {/* Verdict #2 : GT/T-Carré intégrés, jargon remplacé */}
          {astro.as.length > 0 && (() => {
            const slice12 = astro.as.slice(0, 12);
            const natalPos = slice12.filter(a => a.t === 'trine' || a.t === 'sextile').length;
            const natalTense = slice12.filter(a => a.t === 'square' || a.t === 'opposition' || a.t === 'quincunx' || a.t === 'sesquisquare').length;
            const natalFusion = slice12.filter(a => a.t === 'conjunction').length;
            return (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: P.textMid, marginBottom: 8, lineHeight: 1.5 }}>
                  Tu as {natalPos} soutien{natalPos > 1 ? 's' : ''}, {natalTense} friction{natalTense > 1 ? 's' : ''}{natalFusion > 0 ? ` et ${natalFusion} fusion${natalFusion > 1 ? 's' : ''}` : ''}.
                  {natalPos > natalTense ? ' Ton câblage intérieur est plutôt fluide.' : natalTense > natalPos ? ' Beaucoup de tensions internes — un moteur puissant.' : ' Mélange équilibré de facilité et de défis.'}
                </div>

                {/* Grand Trigone intégré (wording accessible) */}
                {astro.grandTrines && astro.grandTrines.length > 0 && astro.grandTrines.map((gt, i) => {
                  const col = ELEM_COL[gt.element] || P.gold;
                  const GT_INTERP: Record<string, string> = {
                    fire: 'action, leadership et enthousiasme',
                    earth: 'concret, stabilité et construction',
                    air: 'idées, communication et réflexion',
                    water: 'intuition, empathie et émotion',
                  };
                  return (
                    <div key={`gt-${i}`} style={{ padding: '10px 12px', marginBottom: 6, borderRadius: 8, background: col + '08', borderLeft: `3px solid ${col}40` }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: col, marginBottom: 4 }}>
                        🟢 Ton courant de fluidité
                      </div>
                      <div style={{ fontSize: 11, color: P.textMid, lineHeight: 1.5 }}>
                        {gt.planets.map(pk => PLANET_FR[pk]).join(', ')} coulent ensemble naturellement — un talent inné dans le domaine {GT_INTERP[gt.element] || 'de cet élément'}.
                      </div>
                    </div>
                  );
                })}

                {/* T-Carré intégré (wording accessible) */}
                {astro.tSquares && astro.tSquares.length > 0 && astro.tSquares.map((ts, i) => (
                  <div key={`ts-${i}`} style={{ padding: '10px 12px', marginBottom: 6, borderRadius: 8, background: '#ef444408', borderLeft: '3px solid #ef444440' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', marginBottom: 4 }}>
                      🟠 Ta tension motrice
                    </div>
                    <div style={{ fontSize: 11, color: P.textMid, lineHeight: 1.5 }}>
                      {PLANET_FR[ts.opposition[0]]} et {PLANET_FR[ts.opposition[1]]} tirent dans des directions opposées — {PLANET_FR[ts.apex]} concentre toute cette tension et te pousse à agir.
                    </div>
                  </div>
                ))}

                {/* Liste des aspects — langage humain */}
                <div style={{ display: 'grid', gap: 4, marginTop: 4 }}>
                  {astro.as.slice(0, 8).map((a, i) => {
                    const vibe = ASPECT_VIBE[a.t];
                    const h1 = PL_HUMAN[a.p1] || PLANET_FR[a.p1];
                    const h2 = PL_HUMAN[a.p2] || PLANET_FR[a.p2];
                    const verb = ASPECT_HUMAN[a.t] || ASPECT_FR[a.t] || a.t;
                    return (
                      <div key={i} style={{ padding: '6px 10px', background: vibe.col + '06', borderRadius: 6, borderLeft: `2px solid ${vibe.col}40` }}>
                        <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.4 }}>
                          {h1.charAt(0).toUpperCase() + h1.slice(1)} {verb} {h2}
                        </div>
                        <div style={{ fontSize: 9, color: P.textDim, marginTop: 1 }}>
                          {PLANET_FR[a.p1]} {ASPECT_SYM[a.t] || '•'} {PLANET_FR[a.p2]} <span style={{ color: vibe.col }}>{vibe.label.split(' ')[0]}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* --- Stelliums (compact + expliqué) --- */}
          {displayStelliums && displayStelliums.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: P.textMid, marginBottom: 2 }}>Concentrations d'énergie</div>
              <div style={{ fontSize: 10, color: P.textDim, marginBottom: 6, lineHeight: 1.4 }}>
                Quand 3 planètes ou plus se retrouvent au même endroit, ça crée un point de force — un domaine où tu investis beaucoup d'énergie.
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                {displayStelliums.map((st, i) => {
                  const firstPl = st.planets[0];
                  const firstSign = astro.pl.find(p => p.k === firstPl)?.s || 'Aries';
                  const col = ELEM_COL[SIGN_ELEM[firstSign]] || P.gold;
                  return (
                    <div key={i} style={{ padding: '8px 10px', background: col + '08', borderRadius: 6, borderLeft: `2px solid ${col}40` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: col }}>
                          {st.type === 'sign' ? `${SIGN_SYM[st.name]} ${SIGN_FR[st.name]}` : `${st.name}${st.type === 'house' ? ` — ${HOUSE_THEME_FR[parseInt(st.name.replace('Maison ', ''))] || ''}` : ''}`}
                        </span>
                        <span style={{ fontSize: 9, color: col, marginLeft: 'auto' }}>{st.planets.length} énergies concentrées</span>
                      </div>
                      <div style={{ fontSize: 10, color: P.textDim }}>
                        {st.planets.map(pk => PL_HUMAN[pk] ? `${PL_HUMAN[pk]} (${PLANET_FR[pk]})` : PLANET_FR[pk]).join(', ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </Cd>
      </Sec>

      </SectionGroup>

      {/* ╔═══════════════════════════════════════════╗ */}
      {/* ║  GROUPE 4 — POUR ALLER PLUS LOIN           ║ */}
      {/* ╚═══════════════════════════════════════════╝ */}
      <SectionGroup icon="🧪" title="Pour aller plus loin" defaultOpen={false}>

      {/* R25: Lots Arabes — Tes points d'élan et d'orientation */}
      {!astro.noTime && astro.pof !== undefined && (
        <Sec icon="⊕" title="Tes points d'élan et d'orientation">
          <Cd>
            <div style={{ fontSize: 12, color: P.textDim, marginBottom: 10, lineHeight: 1.5 }}>
              Ces deux repères montrent où la vie te nourrit le plus (Fortune), et où ton esprit retrouve son cap quand tu t'égares (Esprit).
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {/* Part de Fortune */}
              {(() => {
                const pofSign = SIGNS[Math.floor(((astro.pof % 360) + 360) % 360 / 30)];
                const pofDeg = +((astro.pof % 30)).toFixed(1);
                // Ronde #3 F1 : placement exact via cusps en degrés (plus de proxy par signe)
                const pofHouse = (() => {
                  if (astro.houseSystem === 'wholesign') {
                    const ascIdx = SIGNS.indexOf(astro.b3.asc);
                    const pIdx = SIGNS.indexOf(pofSign);
                    return ((pIdx - ascIdx + 12) % 12) + 1;
                  }
                  // Placidus/Equal: placement exact via longitudes des cusps
                  if (astro.hsCusps?.length === 12) {
                    return getPlanetHousePlacidus(((astro.pof % 360) + 360) % 360, astro.hsCusps);
                  }
                  return 1;
                })();
                return (
                  <div style={{ padding: '10px 12px', background: P.bg, borderRadius: 8, border: `1px solid #FFD70030` }}>
                    <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', marginBottom: 4 }}>⊕ Part de Fortune</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#FFD700' }}>
                      {SIGN_SYM[pofSign]} {SIGN_FR[pofSign]} {pofDeg}°
                    </div>
                    <div style={{ fontSize: 11, color: P.textMid, marginTop: 4 }}>
                      Domaine : <strong style={{ color: P.gold }}>{HOUSE_DOMAIN[pofHouse] || ''}</strong>
                    </div>
                    <div style={{ fontSize: 10, color: P.textDim, marginTop: 4, lineHeight: 1.4 }}>
                      C'est dans le domaine « {HOUSE_DOMAIN[pofHouse] || ''} » que la chance se manifeste le plus naturellement pour toi.
                    </div>
                  </div>
                );
              })()}
              {/* Part d'Esprit */}
              {astro.pos !== undefined && (() => {
                const posSign = SIGNS[Math.floor(((astro.pos % 360) + 360) % 360 / 30)];
                const posDeg = +((astro.pos % 30)).toFixed(1);
                // Ronde #3 F1 : placement exact via cusps en degrés
                const posHouse = (() => {
                  if (astro.houseSystem === 'wholesign') {
                    const ascIdx = SIGNS.indexOf(astro.b3.asc);
                    const pIdx = SIGNS.indexOf(posSign);
                    return ((pIdx - ascIdx + 12) % 12) + 1;
                  }
                  if (astro.hsCusps?.length === 12) {
                    return getPlanetHousePlacidus(((astro.pos % 360) + 360) % 360, astro.hsCusps);
                  }
                  return 1;
                })();
                return (
                  <div style={{ padding: '10px 12px', background: P.bg, borderRadius: 8, border: `1px solid #C0AAFF30` }}>
                    <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', marginBottom: 4 }}>⊗ Part d'Esprit</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#C0AAFF' }}>
                      {SIGN_SYM[posSign]} {SIGN_FR[posSign]} {posDeg}°
                    </div>
                    <div style={{ fontSize: 11, color: P.textMid, marginTop: 4 }}>
                      Domaine : <strong style={{ color: '#C0AAFF' }}>{HOUSE_DOMAIN[posHouse] || ''}</strong>
                    </div>
                    <div style={{ fontSize: 10, color: P.textDim, marginTop: 4, lineHeight: 1.4 }}>
                      C'est dans le domaine « {HOUSE_DOMAIN[posHouse] || ''} » que ta volonté consciente et ta quête de sens s'expriment le mieux.
                    </div>
                  </div>
                );
              })()}
            </div>
            <div style={{ marginTop: 8, padding: '8px 12px', background: `${P.gold}08`, borderRadius: 8, fontSize: 11, color: P.textDim, lineHeight: 1.5 }}>
              <strong style={{ color: P.textMid }}>Fortune</strong> — ce qui vient à toi naturellement, là où la chance se manifeste sans effort.
              <strong style={{ color: P.textMid }}> Esprit</strong> — ce que tu construis consciemment, là où ta volonté fait la différence.
              <br/><span style={{ fontSize: 10, color: P.textDim, opacity: 0.7 }}>Ces points sont calculés à partir de la position de ton Soleil, ta Lune et ton Ascendant (méthode traditionnelle).</span>
            </div>
          </Cd>
        </Sec>
      )}

      {/* ===== R25: CARTE PARTAGEABLE ===== */}
      <Sec icon="📤" title="Partager ton Thème">
        <Cd>
          <div style={{ fontSize: 12, color: P.textDim, marginBottom: 10, lineHeight: 1.5 }}>
            Génère une carte visuelle de ton thème natal à partager sur les réseaux sociaux ou envoyer à tes proches.
          </div>
          <button
            onClick={() => {
              if (!astro) return;
              // Générer la carte via Canvas
              const W = 1080, H = 1080; // format carré Instagram
              const canvas = document.createElement('canvas');
              canvas.width = W; canvas.height = H;
              const ctx = canvas.getContext('2d');
              if (!ctx) return;

              // --- Fond dégradé sombre ---
              const grad = ctx.createLinearGradient(0, 0, 0, H);
              grad.addColorStop(0, '#0a0e1a');
              grad.addColorStop(0.5, '#111827');
              grad.addColorStop(1, '#0a0e1a');
              ctx.fillStyle = grad;
              ctx.fillRect(0, 0, W, H);

              // --- Cercle décoratif central ---
              ctx.beginPath();
              ctx.arc(W / 2, H / 2 + 30, 280, 0, Math.PI * 2);
              ctx.strokeStyle = 'rgba(212,175,55,0.15)';
              ctx.lineWidth = 1.5;
              ctx.stroke();

              // --- Étoiles décoratives ---
              for (let i = 0; i < 60; i++) {
                const x = Math.random() * W, y = Math.random() * H;
                const r = Math.random() * 1.5 + 0.3;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.4 + 0.1})`;
                ctx.fill();
              }

              // --- Titre ---
              ctx.textAlign = 'center';
              ctx.fillStyle = '#d4af37';
              ctx.font = '600 18px system-ui, sans-serif';
              ctx.fillText('K A I R O N A U T E', W / 2, 55);
              ctx.fillStyle = 'rgba(212,175,55,0.5)';
              ctx.font = '13px system-ui, sans-serif';
              ctx.fillText('Mon Thème Natal', W / 2, 80);

              // --- Big Three ---
              const b3Data = astro.noTime
                ? [
                    { icon: '☉', label: 'Soleil', value: SIGN_FR[astro.b3.sun], sym: SIGN_SYM[astro.b3.sun] },
                    { icon: '☽', label: 'Lune', value: SIGN_FR[astro.b3.moon], sym: SIGN_SYM[astro.b3.moon] },
                  ]
                : [
                    { icon: '☉', label: 'Soleil', value: SIGN_FR[astro.b3.sun], sym: SIGN_SYM[astro.b3.sun] },
                    { icon: '☽', label: 'Lune', value: SIGN_FR[astro.b3.moon], sym: SIGN_SYM[astro.b3.moon] },
                    { icon: '↑', label: 'Ascendant', value: SIGN_FR[astro.b3.asc], sym: SIGN_SYM[astro.b3.asc] },
                  ];

              const startY = 130;
              b3Data.forEach((item, i) => {
                const y = startY + i * 85;
                // Cadre
                const rx = 180, rw = W - 360;
                ctx.fillStyle = 'rgba(255,255,255,0.04)';
                ctx.beginPath();
                ctx.roundRect(rx, y, rw, 65, 12);
                ctx.fill();
                ctx.strokeStyle = 'rgba(212,175,55,0.2)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.roundRect(rx, y, rw, 65, 12);
                ctx.stroke();
                // Icône
                ctx.font = '28px system-ui, sans-serif';
                ctx.fillStyle = '#d4af37';
                ctx.textAlign = 'left';
                ctx.fillText(item.icon, rx + 18, y + 42);
                // Label
                ctx.font = '600 14px system-ui, sans-serif';
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.fillText(item.label, rx + 60, y + 28);
                // Valeur
                ctx.font = '700 22px system-ui, sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(`${item.sym} ${item.value}`, rx + 60, y + 52);
              });

              // --- Planètes en cercle ---
              const cx = W / 2, cy = H / 2 + 30, cr = 230;
              const mainPl = displayPl.filter(p => ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'].includes(p.k));
              mainPl.forEach(p => {
                const signIdx = SIGNS.indexOf(p.s);
                const angle = ((signIdx * 30 + p.d) - 90) * Math.PI / 180;
                const px = cx + cr * Math.cos(angle);
                const py = cy + cr * Math.sin(angle);
                // Point
                const elemCol = ELEM_COL[SIGN_ELEM[p.s]] || '#d4af37';
                ctx.beginPath();
                ctx.arc(px, py, 16, 0, Math.PI * 2);
                ctx.fillStyle = elemCol + '30';
                ctx.fill();
                ctx.strokeStyle = elemCol;
                ctx.lineWidth = 1.5;
                ctx.stroke();
                // Symbole
                ctx.font = '14px system-ui, sans-serif';
                ctx.fillStyle = elemCol;
                ctx.textAlign = 'center';
                ctx.fillText(PLANET_SYM[p.k] || p.k[0].toUpperCase(), px, py + 5);
              });

              // --- 12 signes autour du cercle ---
              for (let i = 0; i < 12; i++) {
                const angle = (i * 30 + 15 - 90) * Math.PI / 180;
                const sx = cx + (cr + 40) * Math.cos(angle);
                const sy = cy + (cr + 40) * Math.sin(angle);
                ctx.font = '18px system-ui, sans-serif';
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                ctx.textAlign = 'center';
                ctx.fillText(SIGN_SYM[SIGNS[i]], sx, sy + 6);
              }

              // --- Dominante ---
              if (astro.dominant?.[0]) {
                ctx.font = '600 14px system-ui, sans-serif';
                ctx.fillStyle = 'rgba(212,175,55,0.6)';
                ctx.textAlign = 'center';
                ctx.fillText('Dominante planétaire', W / 2, H - 120);
                ctx.font = '700 20px system-ui, sans-serif';
                ctx.fillStyle = '#d4af37';
                ctx.fillText(`${PLANET_SYM[astro.dominant[0].planet]} ${PLANET_FR[astro.dominant[0].planet]}`, W / 2, H - 92);
              }

              // --- Branding ---
              ctx.font = '12px system-ui, sans-serif';
              ctx.fillStyle = 'rgba(255,255,255,0.25)';
              ctx.textAlign = 'center';
              ctx.fillText('kaironaute.app — Ton GPS cosmique', W / 2, H - 30);

              // --- Télécharger ---
              canvas.toBlob(blob => {
                if (!blob) return;
                // Essayer le partage natif (mobile)
                if (navigator.share && navigator.canShare?.({ files: [new File([blob], 'mon-theme-kaironaute.png', { type: 'image/png' })] })) {
                  navigator.share({
                    title: 'Mon Thème Natal — Kaironaute',
                    text: astro.noTime
                      ? `☉ ${SIGN_FR[astro.b3.sun]} · ☽ ${SIGN_FR[astro.b3.moon]}`
                      : `☉ ${SIGN_FR[astro.b3.sun]} · ☽ ${SIGN_FR[astro.b3.moon]} · ↑ ${SIGN_FR[astro.b3.asc]}`,
                    files: [new File([blob], 'mon-theme-kaironaute.png', { type: 'image/png' })],
                  }).catch(() => {});
                } else {
                  // Fallback : téléchargement direct
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'mon-theme-kaironaute.png';
                  a.click();
                  URL.revokeObjectURL(url);
                }
              }, 'image/png');
            }}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 10, cursor: 'pointer',
              fontWeight: 700, fontSize: 14, border: '1px solid rgba(212,175,55,0.3)',
              background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.05))',
              color: '#d4af37', transition: 'all 0.2s',
            }}
          >
            📤 Générer ma carte à partager
          </button>
          <div style={{ fontSize: 10, color: P.textDim, marginTop: 6, textAlign: 'center' }}>
            Image 1080×1080 — parfait pour Instagram, WhatsApp, TikTok
          </div>
        </Cd>
      </Sec>

      </SectionGroup>

    </div>
  );
}
