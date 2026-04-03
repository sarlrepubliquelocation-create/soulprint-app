import { useState, useMemo } from 'react';
import { calcBond, calcBondDaily, type BondResult, type BondMode, type FamilleSubType, type ContextBadge } from '../engines/compatibility';
import { calcOracle, SUJETS, ORACLE_DOMAINS, type OracleType, type OracleSujet, type OracleDomain, type OracleResult } from '../engines/oracle';
import { calcLifePath } from '../engines/numerology';
import { type SoulData } from '../App';
import { Cd, P } from './ui';

// Oracle type options
const ORACLE_TYPE_OPTIONS: { id: OracleType; icon: string; label: string; placeholder: string }[] = [
  { id: 'nom',     icon: '✏️', label: 'Nom / Marque',   placeholder: 'Jusqu\'à 5 noms séparés par des virgules' },
  { id: 'date',    icon: '📅', label: 'Date',            placeholder: 'JJ/MM/AAAA' },
  { id: 'adresse', icon: '🏠', label: 'Adresse',         placeholder: 'Ex: 14 rue Victor Hugo' },
  { id: 'numero',  icon: '🔢', label: 'Numéro',          placeholder: 'Ex: 0612345678, SIRET...' },
  { id: 'sujet',   icon: '🎯', label: 'Sujet',           placeholder: 'Choisis un sujet ci-dessous' },
  { id: 'bebe',    icon: '👶', label: 'Prénom bébé',     placeholder: 'Jusqu\'à 5 prénoms séparés par des virgules' },
];
const ORACLE_SUJET_LIST: { id: OracleSujet; icon: string; label: string }[] = [
  { id: 'projet',         icon: '🚀', label: 'Lancer projet / Contrat' },
  { id: 'sentiments',     icon: '💕', label: 'Déclarer sentiments' },
  { id: 'partenariat',    icon: '🤝', label: 'Partenariat / Associé' },
  { id: 'investissement', icon: '💰', label: 'Investissement / Finance' },
  { id: 'voyage',         icon: '✈️', label: 'Voyage / Déménagement' },
  { id: 'presentation',   icon: '🎤', label: 'Présentation / Parole' },
  { id: 'changement',     icon: '🔄', label: 'Changement de vie' },
];

export default function BondTab({ data, bd }: { data: SoulData; bd: string }) {
  const [bdB, setBdB] = useState('');
  const [nameA, setNameA] = useState('');
  const [nameB, setNameB] = useState('');
  const [mode, setMode] = useState<BondMode>('amour');
  const [familleSubType, setFamilleSubType] = useState<FamilleSubType>('frere_soeur');
  const [familleCategory, setFamilleCategory] = useState<'fratrie'|'parent'|'grands_parents'|'coloc'|'ami'>('fratrie');

  const FAMILLE_CATS = [
    { id: 'fratrie',        icon: '🤝', label: 'Fratrie',        defaultSub: 'frere_soeur' as FamilleSubType },
    { id: 'parent',         icon: '👨‍👧', label: 'Parent / Enfant', defaultSub: 'pere_fils' as FamilleSubType },
    { id: 'grands_parents', icon: '👴', label: 'Grands-parents',  defaultSub: 'gp_petit_fils' as FamilleSubType },
    { id: 'coloc',          icon: '🏠', label: 'Coloc',           defaultSub: 'coloc' as FamilleSubType },
    { id: 'ami',            icon: '💛', label: 'Ami',             defaultSub: 'ami' as FamilleSubType },
  ] as const;

  const FAMILLE_SUBS: Record<string, { id: FamilleSubType; label: string }[]> = {
    fratrie:        [{ id: 'frere_frere', label: 'Frère — Frère' }, { id: 'soeur_soeur', label: 'Sœur — Sœur' }, { id: 'frere_soeur', label: 'Frère — Sœur' }],
    parent:         [{ id: 'pere_fils', label: 'Père — Fils' }, { id: 'pere_fille', label: 'Père — Fille' }, { id: 'mere_fils', label: 'Mère — Fils' }, { id: 'mere_fille', label: 'Mère — Fille' }],
    grands_parents: [{ id: 'gp_petit_fils', label: 'GP — Petit-fils' }, { id: 'gp_petite_fille', label: 'GP — Petite-fille' }, { id: 'gm_petit_fils', label: 'GM — Petit-fils' }, { id: 'gm_petite_fille', label: 'GM — Petite-fille' }],
    coloc:          [],
    ami:            [],
  };
  const [result, setResult] = useState<BondResult | null>(null);
  const [error, setError] = useState('');

  // ── Oracle state (ex-OracleTab Part B) ──
  const [oracleType, setOracleType] = useState<OracleType>('nom');
  const [oracleInput, setOracleInput] = useState('');
  const [oracleSujet, setOracleSujet] = useState<OracleSujet>('projet');
  const [oracleDomain, setOracleDomain] = useState<OracleDomain>('generaliste');
  const [oracleResult, setOracleResult] = useState<OracleResult | null>(null);
  const [oracleCompareResults, setOracleCompareResults] = useState<{ name: string; result: OracleResult }[]>([]);
  const [oracleError, setOracleError] = useState('');
  const [showParent2, setShowParent2] = useState(false);
  const [parent2Bd, setParent2Bd] = useState('');
  const [appart, setAppart] = useState('');
  const parent2Cdv = useMemo(() => {
    if (!parent2Bd || parent2Bd.length < 8) return undefined;
    try { return calcLifePath(parent2Bd).v; } catch { return undefined; }
  }, [parent2Bd]);

  const doOracleCalc = () => {
    if (oracleType !== 'sujet' && !oracleInput.trim()) { setOracleError('Entre une valeur à tester'); return; }
    setOracleError('');
    setOracleCompareResults([]);
    try {
      const dailyScore = data.conv.score;
      const userCdv = data.num.lp.v;
      let domainScoreFromConvergence = 50;
      if (oracleType === 'sujet' && data.conv.contextualScores) {
        const sujetInfo = SUJETS[oracleSujet];
        const ctxDomain = data.conv.contextualScores.domains.find(d => d.domain === sujetInfo.dominantDomain);
        if (ctxDomain) domainScoreFromConvergence = ctxDomain.score;
      }
      const bdParts = bd.split('-');
      const canCompare = (oracleType === 'bebe' || oracleType === 'nom') && oracleInput.includes(',');
      const items = canCompare ? oracleInput.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5) : [oracleInput.trim()];
      const allResults: { name: string; result: OracleResult }[] = [];
      for (const item of items) {
        const r = calcOracle({
          type: oracleType, input: oracleType === 'sujet' ? oracleSujet : item,
          sujet: oracleType === 'sujet' ? oracleSujet : (oracleType === 'nom' ? 'projet' : undefined),
          domain: (oracleType === 'nom' || oracleType === 'numero') ? oracleDomain : undefined,
          dailyScore, userCdv, domainScoreFromConvergence,
          targetDate: oracleType === 'date' ? item : undefined,
          userBirthDay: parseInt(bdParts[2] || '1'),
          userBirthMonth: parseInt(bdParts[1] || '1'),
          parent2Cdv: (oracleType === 'bebe' && showParent2 && parent2Cdv) ? parent2Cdv : undefined,
          appart: oracleType === 'adresse' && appart.trim() ? appart.trim() : undefined,
        });
        allResults.push({ name: item, result: r });
      }
      if (allResults.length > 1) {
        allResults.sort((a, b) => b.result.oracleScore - a.result.oracleScore);
        setOracleCompareResults(allResults);
        setOracleResult(allResults[0].result);
      } else {
        setOracleCompareResults([]);
      }
      setOracleResult(allResults[0].result);
    } catch (e: unknown) { setOracleError(e instanceof Error ? e.message : 'Erreur'); }
  };

  const doCalc = () => {
    if (!bdB) { setError('Entre une date de naissance'); return; }
    setError('');
    try {
      const r = calcBond(bd, nameA, bdB, nameB, mode, mode === 'famille' ? familleSubType : undefined);
      setResult(r);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur de calcul'); }
  };

  // SYSTEM_DESC supprimé — les detail enrichis dans compatibility.ts suffisent (Ronde 10)

  // Phrase narrative selon sous-type famille (12 sous-types)
  // Narratives R2 — fusion GPT+Gemini (poétiques, accessibles, 3 phrases max)
  const FAMILLE_NARRATIVE: Record<FamilleSubType, { intro: string; titre: string; poids: string }> = {
    frere_frere:      { titre: `Deux frères, même feu`,       intro: `entre deux frères`,                  poids: `Deux épées forgées dans le même feu. Le BaZi révèle comment tes énergies Yang se stimulent ou s'affrontent, la Numérologie éclaire tes leçons d'ego sur la même ligne de départ, et le Yi King murmure la joute silencieuse de tes destinées. Entre rivalité et loyauté, chacun cherche sa propre lumière.` },
    soeur_soeur:      { titre: `Deux sœurs en miroir`,        intro: `entre deux sœurs`,                   poids: `Deux miroirs face à face, sensibles au moindre reflet. Le BaZi dévoile la texture de tes tempéraments, la Numérologie éclaire les alliances secrètes et les comparaisons intimes, et le Yi King trace le dialogue subtil entre tes chemins. Entre confidences et rivalités feutrées, ton lien façonne l'estime de soi.` },
    frere_soeur:      { titre: `Deux rives, un lien`,         intro: `entre frère et sœur`,                poids: `Deux rives d'un même fleuve. Le BaZi met en lumière tes polarités naturelles, la Numérologie révèle l'apprentissage de l'altérité, et le Yi King montre comment tes différences deviennent complémentarité. Entre taquineries et protection instinctive, tu apprends à apprivoiser l'autre.` },
    pere_fils:        { titre: `Le flambeau père-fils`,       intro: `entre père et fils`,                 poids: `Le flambeau que l'on transmet, parfois trop près du coeur. Le BaZi révèle l'empreinte du modèle paternel, la Numérologie montre ce qui doit être transmis ou dépassé, et le Yi King éclaire l'équilibre entre autorité et émancipation. Entre admiration et besoin d'affirmation, le fils cherche sa propre verticalité.` },
    pere_fille:       { titre: `La montagne et la source`,    intro: `entre père et fille`,                poids: `La montagne et la source qui y prend naissance. Le BaZi révèle la danse du Yang protecteur face à la sensibilité filiale, la Numérologie éclaire l'empreinte masculine fondatrice, et le Yi King dessine la construction silencieuse de la confiance. Entre protection et liberté, ce lien sculpte l'estime intime.` },
    mere_fils:        { titre: `Le port et le large`,         intro: `entre mère et fils`,                 poids: `Un port d'attache qui doit accepter le large. Le BaZi met en lumière l'attachement émotionnel, la Numérologie révèle les attentes implicites, et le Yi King dessine le passage délicat de la fusion à l'autonomie. Entre tendresse et séparation, chacun apprend à respirer seul.` },
    mere_fille:       { titre: `Deux saisons, un jardin`,     intro: `entre mère et fille`,                poids: `Deux saisons d'un même jardin. Le BaZi révèle la transmission féminine, la Numérologie éclaire les répétitions ou réparations possibles, et le Yi King suggère comment transformer l'héritage en choix conscient. Entre complicité et comparaison, la fille construit sa singularité.` },
    gp_petit_fils:    { titre: `Mémoire et avenir`,           intro: `entre grand-père et petit-fils`,     poids: `La mémoire ancienne posée sur une épaule d'enfant. Le BaZi relie la sagesse de l'ancêtre à la vitalité naissante en enjambant une génération, la Numérologie révèle les valeurs transmises, et le Yi King éclaire le relais du temps. Ici, l'amour est souvent plus doux que l'autorité.` },
    gp_petite_fille:  { titre: `Héritage et éveil`,           intro: `entre grand-père et petite-fille`,   poids: `Un regard qui reconnaît ce qui fut et ce qui renaît. Le BaZi révèle la continuité des lignées, la Numérologie éclaire les résonances affectives, et le Yi King dessine un dialogue bienveillant entre expérience et innocence. Ce lien devient souvent refuge et transmission silencieuse.` },
    gm_petit_fils:    { titre: `Douceur et force`,            intro: `entre grand-mère et petit-fils`,     poids: `La racine invisible qui nourrit la plus haute branche. Le BaZi révèle la stabilité protectrice, la Numérologie éclaire les loyautés silencieuses, et le Yi King montre l'apprentissage par l'exemple et la douceur. Ce lien nourrit sans contraindre.` },
    gm_petite_fille:  { titre: `Le fil des femmes`,           intro: `entre grand-mère et petite-fille`,   poids: `Le fil d'or ininterrompu des tisseuses. Le BaZi révèle la transmission féminine intime, la Numérologie éclaire les sensibilités partagées, et le Yi King célèbre la Durée — le passage sacré des secrets du clan d'une gardienne à l'autre. Deux Yin qui se reconnaissent au-delà des mots.` },
    coloc:            { titre: `Sous le même toit`,           intro: `entre colocataires`,                 poids: `Deux trajectoires qui se croisent sous le même toit. Le BaZi révèle la compatibilité de tes rythmes quotidiens, la Numérologie éclaire les valeurs pratiques et la gestion de l'espace, et le Yi King montre l'équilibre entre territoire personnel et vie commune. L'harmonie se joue dans les détails.` },
    ami:              { titre: `L'alliance choisie`,           intro: `entre amis proches`,                  poids: `Ce lien n'est pas un hasard — c'est un choix renouvelé. Le BaZi révèle la résonance naturelle entre tes énergies, la Numérologie éclaire les valeurs profondes qui te rapprochent, et le Yi King montre la dynamique de cette alliance libre. L'amitié véritable se nourrit de vérité et de liberté.` },
  };

  const narrativeFamille = mode === 'famille' ? FAMILLE_NARRATIVE[familleSubType] : null;

  return (
    <>
    <Cd>
      <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 16 }}>
        ✨ Affinité — Compatibilité
      </div>

      {/* ═══ FORMULAIRE ═══ */}
      <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: P.textMid, fontStyle: 'italic' }}>
          Ta date : <span style={{ color: P.text, fontWeight: 700 }}>{bd.split('-').reverse().join('/')}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input placeholder="Ton prénom (optionnel)" value={nameA} onChange={e => setNameA(e.target.value)}
            style={{ padding: '8px 10px', borderRadius: 6, border: `1px solid ${P.cardBdr}`, background: P.surface, color: P.text, fontSize: 13, fontFamily: 'inherit' }} />
          <input placeholder={mode === 'famille' ? 'Prénom frère/sœur/enfant...' : mode === 'amour' ? 'Prénom partenaire (optionnel)' : 'Prénom collègue (optionnel)'} value={nameB} onChange={e => setNameB(e.target.value)}
            style={{ padding: '8px 10px', borderRadius: 6, border: `1px solid ${P.cardBdr}`, background: P.surface, color: P.text, fontSize: 13, fontFamily: 'inherit' }} />
        </div>
        <input type="date" value={bdB} onChange={e => setBdB(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 6, border: `1px solid ${P.cardBdr}`, background: P.surface, color: P.text, fontSize: 13, fontFamily: 'inherit', width: '100%' }} />

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 6 }}>
          {([
            { id: 'amour',   icon: '❤️', label: 'Amour',   color: '#f472b6' },
            { id: 'pro',     icon: '💼', label: 'Pro',      color: '#4ade80' },
            { id: 'famille', icon: '👨‍👩‍👧', label: 'Famille', color: '#60a5fa' },
          ] as { id: BondMode; icon: string; label: string; color: string }[]).map(m => (
            <button key={m.id} onClick={() => { setMode(m.id); setResult(null); }} aria-label={`Mode ${m.label}`} style={{
              flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
              background: mode === m.id ? `${m.color}18` : P.surface,
              border: `1.5px solid ${mode === m.id ? `${m.color}40` : P.cardBdr}`,
              color: mode === m.id ? m.color : P.textDim,
              fontSize: 13, fontWeight: mode === m.id ? 700 : 400,
            }}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* Sous-type famille — niveau 1 : catégorie */}
        {mode === 'famille' && (
          <div style={{ display: 'grid', gap: 6 }}>
            <div className="grid-responsive-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 5 }}>
              {FAMILLE_CATS.map(cat => (
                <button key={cat.id} onClick={() => { setFamilleCategory(cat.id); setFamilleSubType(cat.defaultSub); setResult(null); }} aria-label={`Catégorie ${cat.label}`} style={{
                  padding: '7px 4px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                  background: familleCategory === cat.id ? '#60a5fa18' : P.surface,
                  border: `1px solid ${familleCategory === cat.id ? '#60a5fa60' : P.cardBdr}`,
                  color: familleCategory === cat.id ? '#60a5fa' : P.textDim,
                  fontSize: 11, fontWeight: familleCategory === cat.id ? 700 : 400,
                }}>
                  <div>{cat.icon}</div>
                  <div style={{ marginTop: 2 }}>{cat.label}</div>
                </button>
              ))}
            </div>
            {/* Niveau 2 : relation précise */}
            {FAMILLE_SUBS[familleCategory].length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(FAMILLE_SUBS[familleCategory].length, 2)}, 1fr)`, gap: 5 }}>
                {FAMILLE_SUBS[familleCategory].map(sub => (
                  <button key={sub.id} onClick={() => { setFamilleSubType(sub.id); setResult(null); }} aria-label={`Relation: ${sub.label}`} style={{
                    padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                    background: familleSubType === sub.id ? '#60a5fa12' : '#ffffff04',
                    border: `1px solid ${familleSubType === sub.id ? '#60a5fa35' : P.cardBdr}`,
                    color: familleSubType === sub.id ? '#93c5fd' : P.textDim,
                    fontSize: 11, fontWeight: familleSubType === sub.id ? 700 : 400,
                  }}>
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button onClick={doCalc} aria-label="Calculer la compatibilité" style={{
          padding: '10px 0', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
          background: 'linear-gradient(135deg, #E0B0FF18, #9333ea1a)', border: '1.5px solid #E0B0FF40',
          color: '#E0B0FF', fontSize: 14, fontWeight: 700, letterSpacing: 1,
        }}>
          Calculer la compatibilité
        </button>
        {error && <div style={{ fontSize: 12, color: '#ef4444' }}>{error}</div>}
      </div>

      {/* ═══ RÉSULTAT ═══ */}
      {result && (
        <div style={{ display: 'grid', gap: 16 }}>

          {/* Score circulaire + label */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}>
              <svg width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="60" fill="none" stroke={P.cardBdr} strokeWidth="8" />
                <circle cx="70" cy="70" r="60" fill="none" stroke={result.label.color} strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 60} strokeDashoffset={2 * Math.PI * 60 * (1 - result.scoreGlobal / 100)}
                  strokeLinecap="round" transform="rotate(-90 70 70)"
                  style={{ filter: `drop-shadow(0 0 12px ${result.label.color}55)`, transition: 'stroke-dashoffset 1s ease' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: result.label.color }}>{result.scoreGlobal}</span>
                <span style={{ fontSize: 12, color: result.label.color + 'aa' }}>%</span>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <span style={{ fontSize: 22 }}>{result.label.icon}</span>
              <div style={{ fontSize: 17, fontWeight: 700, color: result.label.color, marginTop: 4 }}>{result.label.name}</div>
              <div style={{ fontSize: 12, color: P.textMid, marginTop: 4, fontStyle: 'italic' }}>
                {(mode === 'famille' && result.familleDesc) ? result.familleDesc : result.label.desc}
              </div>
            </div>
            {result.sameBirthdate && (
              <div style={{ marginTop: 8, padding: '4px 10px', background: '#f59e0b10', border: '1px solid #f59e0b25', borderRadius: 6, display: 'inline-block' }}>
                <span style={{ fontSize: 11, color: '#f59e0b' }}>⚠️ Même date — cap 78</span>
              </div>
            )}
          </div>

          {/* Ronde 13 (3/3) — Badges "Golden Tickets" : signaux positifs visibles */}
          {result.badges && result.badges.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {result.badges.map((badge, i) => (
                <span key={i} style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                  background: `${result.label.color}12`, border: `1px solid ${result.label.color}30`,
                  color: result.label.color, whiteSpace: 'nowrap',
                }}>{badge}</span>
              ))}
            </div>
          )}

          {/* Ronde 17 (3/3) — Badge contextuel Score×Type (famille uniquement) */}
          {result.contextBadge && (
            <div style={{
              padding: '14px 16px', borderRadius: 10,
              background: 'linear-gradient(135deg, #ffffff06, #ffffff02)',
              border: `1px solid ${result.label.color}25`,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{result.contextBadge.icon}</div>
              <div style={{
                fontSize: 14, fontWeight: 700, color: result.label.color,
                letterSpacing: 0.3, marginBottom: 8,
              }}>
                {result.contextBadge.title}
              </div>
              <div style={{
                fontSize: 12, color: P.textMid, lineHeight: 1.7, fontStyle: 'italic',
                maxWidth: 320, margin: '0 auto',
              }}>
                {result.contextBadge.narrative}
              </div>
            </div>
          )}

          {/* Ronde 13 (3/3) — Résumé narratif unifié */}
          {result.summary && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ffffff05', border: `1px solid ${P.cardBdr}`, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7, fontStyle: 'italic' }}>
                {result.summary}
              </div>
            </div>
          )}

          {/* Breakdown systèmes — Peach Blossom masqué en mode famille (poids 0%) */}
          <div style={{ display: 'grid', gap: 8 }}>
            {result.breakdown.filter(b => !(mode === 'famille' && b.system === 'Peach Blossom')).map((b, i) => (
              <div key={i} style={{ padding: '10px 12px', borderRadius: 8, background: P.surface, border: `1px solid ${P.cardBdr}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: P.text }}>
                    {b.icon} {b.system === 'Peach Blossom' ? 'Fleur de Pêcher' : b.system}
                    {b.system === 'BaZi' && <span style={{ fontSize: 10, fontWeight: 400, color: P.textDim, marginLeft: 4 }}>(Quatre Piliers)</span>}
                    {b.system === 'Yi King' && <span style={{ fontSize: 10, fontWeight: 400, color: P.textDim, marginLeft: 4 }}>(Livre des Mutations)</span>}
                    {b.system === 'Peach Blossom' && <span style={{ fontSize: 10, fontWeight: 400, color: P.textDim, marginLeft: 4 }}>(Attraction magnétique)</span>}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: P.textDim }}>{b.weight}</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: b.score >= 65 ? '#4ade80' : b.score >= 40 ? P.textMid : '#ef4444' }}>
                      {b.score}<span style={{ fontSize: 10, opacity: 0.6 }}>%</span>
                    </span>
                  </div>
                </div>
                <div style={{ height: 5, background: '#27272a', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3, width: `${b.score}%`,
                    background: b.score >= 65 ? '#4ade80' : b.score >= 40 ? '#60a5fa' : '#ef4444',
                    transition: 'width 0.6s ease',
                  }} />
                </div>
                {b.technicals.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {b.technicals.slice(0, 3).map((t, ti) => (
                      <span key={ti} style={{
                        fontSize: 9, color: P.textDim, background: '#ffffff08',
                        padding: '2px 7px', borderRadius: 4, border: `1px solid ${P.cardBdr}`,
                        whiteSpace: 'nowrap', letterSpacing: 0.3,
                      }}>{t}</span>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 11, color: P.textMid, marginTop: 6, lineHeight: 1.5 }}>{b.detail}</div>
              </div>
            ))}
          </div>

          {/* Méthodologie + narrative famille */}
          {mode === 'famille' && narrativeFamille && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#60a5fa08', border: '1px solid #60a5fa15' }}>
              <div style={{ fontSize: 10, color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                📊 Comment ce score est calculé
              </div>
              <div style={{ fontSize: 10, color: P.textDim, lineHeight: 1.6, marginBottom: 8, padding: '4px 0', borderBottom: `1px solid #60a5fa10` }}>
                BaZi (40%) — Numérologie (30%) — Yi King (30%). La Fleur de Pêcher n'intervient pas dans les liens familiaux. Le score final passe par une courbe gaussienne pour une distribution réaliste.
              </div>
              <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.7 }}>
                {narrativeFamille.poids}
              </div>
            </div>
          )}
          {mode !== 'famille' && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#ffffff05', border: `1px solid ${P.cardBdr}` }}>
              <div style={{ fontSize: 10, color: P.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                📊 Comment ce score est calculé
              </div>
              <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.7 }}>
                {mode === 'amour'
                  ? 'BaZi (45%) — Numérologie (25%) — Yi King (20%) — Fleur de Pêcher (10%). Le score final passe par une courbe gaussienne (médiane 65) pour refléter une distribution réaliste des compatibilités.'
                  : 'BaZi (35%) — Numérologie (30%) — Yi King (25%) — Fleur de Pêcher (10%). Le BaZi prime en mode Pro pour la compatibilité de caractère et la dynamique de travail. Le score final passe par une courbe gaussienne (médiane 65) pour une distribution réaliste.'}
              </div>
            </div>
          )}

          {/* Alertes non-dupliquées — exclure celles déjà visibles dans les technicals du breakdown */}
          {(() => {
            const shownTechs = new Set(result.breakdown.flatMap(b => b.technicals));
            const uniqueAlerts = result.alerts.filter(a => !shownTechs.has(a));
            return uniqueAlerts.length > 0 ? (
              <div style={{ display: 'grid', gap: 4 }}>
                {uniqueAlerts.slice(0, 5).map((a, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#f59e0b', padding: '6px 10px', background: '#f59e0b08', borderRadius: 6, border: '1px solid #f59e0b15' }}>
                    {a}
                  </div>
                ))}
              </div>
            ) : null;
          })()}

          {/* Conseil */}
          <div style={{ padding: '12px 14px', borderRadius: 10, background: `${result.label.color}08`, border: `1px solid ${result.label.color}20` }}>
            {(nameA || nameB) && (
              <div style={{ fontSize: 11, color: result.label.color, fontWeight: 700, marginBottom: 6 }}>
                {mode === 'famille' && narrativeFamille
                  ? `${nameA || 'Toi'} & ${nameB || "l'autre"} · ${narrativeFamille.titre}`
                  : mode === 'amour'
                    ? `${nameA || 'Toi'} ❤️ ${nameB || 'Partenaire'}`
                    : `${nameA || 'Toi'} 💼 ${nameB || 'Collègue'}`}
              </div>
            )}
            <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>{result.conseil}</div>
          </div>
        </div>
      )}
    </Cd>

      {/* ═══ YI KING DES CHOIX (ex-OracleTab Part B) ═══ */}
      <div style={{ marginTop: 24 }}>
        <Cd>
          <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 16 }}>
            🔮 Yi King des Choix
          </div>

          {/* Type selector */}
          <div className="oracle-type-grid grid-responsive-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
            {ORACLE_TYPE_OPTIONS.map(t => (
              <button key={t.id} onClick={() => { setOracleType(t.id); setOracleResult(null); setOracleCompareResults([]); }} aria-label={`Type: ${t.label}`} style={{
                padding: '8px 4px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                background: oracleType === t.id ? `${P.gold}18` : P.surface,
                border: `1.5px solid ${oracleType === t.id ? P.gold + '50' : P.cardBdr}`,
                color: oracleType === t.id ? P.gold : P.textDim,
                fontSize: 11, fontWeight: oracleType === t.id ? 700 : 400,
              }}>
                <div style={{ fontSize: 16 }}>{t.icon}</div>
                <div style={{ marginTop: 2 }}>{t.label}</div>
              </button>
            ))}
          </div>

          {/* Input field */}
          {oracleType !== 'sujet' && (
            <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
              <input
                placeholder={ORACLE_TYPE_OPTIONS.find(t => t.id === oracleType)?.placeholder || ''}
                value={oracleInput}
                onChange={e => setOracleInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doOracleCalc()}
                style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${P.cardBdr}`, background: P.surface, color: P.text, fontSize: 13, fontFamily: 'inherit', width: '100%' }}
              />
              {oracleType === 'adresse' && (
                <input placeholder="N° appart / étage (optionnel)" value={appart} onChange={e => setAppart(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: 6, border: `1px solid ${P.cardBdr}`, background: P.surface, color: P.text, fontSize: 12, fontFamily: 'inherit' }} />
              )}
              {oracleType === 'bebe' && (
                <div style={{ display: 'grid', gap: 6 }}>
                  <button onClick={() => setShowParent2(!showParent2)} aria-label={showParent2 ? 'Masquer le 2e parent' : 'Ajouter le 2e parent'} style={{
                    background: 'none', border: `1px solid ${P.cardBdr}`, borderRadius: 6, padding: '6px 10px',
                    color: P.textDim, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}>
                    {showParent2 ? '✕ Masquer 2e parent' : '➕ Ajouter date 2e parent (optionnel)'}
                  </button>
                  {showParent2 && (
                    <input type="date" value={parent2Bd} onChange={e => setParent2Bd(e.target.value)}
                      style={{ padding: '8px 10px', borderRadius: 6, border: `1px solid ${P.cardBdr}`, background: P.surface, color: P.text, fontSize: 12, fontFamily: 'inherit' }} />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sujet selector */}
          {oracleType === 'sujet' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
              {ORACLE_SUJET_LIST.map(s => (
                <button key={s.id} onClick={() => setOracleSujet(s.id)} aria-label={`Sujet: ${s.label}`} style={{
                  padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  background: oracleSujet === s.id ? `${P.gold}15` : P.surface,
                  border: `1px solid ${oracleSujet === s.id ? P.gold + '40' : P.cardBdr}`,
                  color: oracleSujet === s.id ? P.gold : P.textDim, fontSize: 12,
                  fontWeight: oracleSujet === s.id ? 700 : 400,
                }}>
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Domain selector (nom / numero only) */}
          {(oracleType === 'nom' || oracleType === 'numero') && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
              {ORACLE_DOMAINS.map(d => (
                <button key={d.id} onClick={() => setOracleDomain(d.id)} aria-label={`Domaine: ${d.label}`} style={{
                  padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                  background: oracleDomain === d.id ? `${P.gold}15` : '#ffffff04',
                  border: `1px solid ${oracleDomain === d.id ? P.gold + '40' : P.cardBdr}`,
                  color: oracleDomain === d.id ? P.gold : P.textDim, fontSize: 11,
                  fontWeight: oracleDomain === d.id ? 600 : 400,
                }}>
                  {d.label}
                </button>
              ))}
            </div>
          )}

          {/* Calc button */}
          <button onClick={doOracleCalc} aria-label="Tester avec le Yi King" style={{
            width: '100%', padding: '10px 0', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
            background: `linear-gradient(135deg, ${P.gold}18, ${P.gold}1a)`, border: `1.5px solid ${P.gold}40`,
            color: P.gold, fontSize: 14, fontWeight: 700, letterSpacing: 1, marginBottom: 12,
          }}>
            🔮 Tester
          </button>
          {oracleError && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 8 }}>{oracleError}</div>}

          {/* Oracle Result */}
          {oracleResult && (
            <div style={{ display: 'grid', gap: 12, padding: '14px 0 0' }}>
              {/* Score principal */}
              <div style={{
                padding: '16px', borderRadius: 10, textAlign: 'center',
                background: `${oracleResult.verdict.color}10`,
                border: `1.5px solid ${oracleResult.verdict.color}30`,
              }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: oracleResult.verdict.color }}>
                  {oracleResult.oracleScore}<span style={{ fontSize: 14, opacity: 0.5 }}>%</span>
                </div>
                <div style={{ fontSize: 16 }}>{oracleResult.verdict.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: oracleResult.verdict.color, marginTop: 4 }}>{oracleResult.verdict.label}</div>
                <div style={{ fontSize: 11, color: P.textMid, marginTop: 4 }}>{oracleResult.verdict.texte}</div>
              </div>

              {/* Comparateur (si virgules) */}
              {oracleCompareResults.length > 1 && (
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Comparaison</div>
                  {oracleCompareResults.map((cr, idx) => (
                    <div key={idx} style={{
                      padding: '10px 12px', borderRadius: 8,
                      background: idx === 0 ? `${cr.result.verdict.color}10` : P.surface,
                      border: `1px solid ${idx === 0 ? cr.result.verdict.color + '30' : P.cardBdr}`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: idx === 0 ? 700 : 500, color: idx === 0 ? cr.result.verdict.color : P.text }}>
                          {idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : '🥉 '}{cr.name}
                        </div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: cr.result.verdict.color }}>
                        {cr.result.oracleScore}%
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Score composition */}
              {oracleCompareResults.length <= 1 && (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: P.surface, border: `1px solid ${P.cardBdr}` }}>
                  <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 10 }}>
                    Composition du score
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: P.textDim }}>Score intrinsèque</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: oracleResult.verdict.color }}>{oracleResult.domainScore}%</div>
                      <div style={{ fontSize: 10, color: P.textDim }}>100% intrinsèque — indépendant du moment</div>
                    </div>
                  </div>
                  {oracleResult.intrinsicVerdict && (
                    <div style={{ padding: '6px 12px', borderRadius: 8, background: `${oracleResult.intrinsicVerdict.color}08`, border: `1px solid ${oracleResult.intrinsicVerdict.color}20`, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14 }}>{oracleResult.intrinsicVerdict.icon}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: oracleResult.intrinsicVerdict.color }}>{oracleResult.intrinsicVerdict.label}</div>
                        <div style={{ fontSize: 10, color: P.textDim }}>Score intrinsèque {oracleResult.domainScore}%</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Breakdown */}
              {oracleResult.breakdown.length > 0 && oracleCompareResults.length <= 1 && (
                <div style={{ display: 'grid', gap: 6 }}>
                  {oracleResult.breakdown.map((b, i) => (
                    <div key={i} style={{ padding: '8px 12px', borderRadius: 8, background: P.surface, border: `1px solid ${P.cardBdr}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: b.pts === 0 ? 0.4 : 1 }}>
                      <div>
                        <div style={{ fontSize: 12, color: b.pts === 0 ? P.textDim : P.text, fontWeight: 600 }}>{b.label}</div>
                        <div style={{ fontSize: 11, color: P.textDim }}>{b.value}</div>
                      </div>
                      {b.pts !== 0 && oracleResult.type !== 'bebe' && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: b.pts > 0 ? '#4ade80' : '#ef4444' }}>
                          {b.pts > 0 ? '+' : ''}{b.pts}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Signals & Alerts */}
              {oracleResult.signals.length > 0 && oracleCompareResults.length <= 1 && (
                <div style={{ display: 'grid', gap: 4 }}>
                  {oracleResult.signals.slice(0, 4).map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#4ade80', padding: '5px 10px', background: '#4ade8008', borderRadius: 6, border: '1px solid #4ade8012' }}>
                      ✦ {s}
                    </div>
                  ))}
                </div>
              )}
              {oracleResult.alerts.filter(a => !a.includes('Mercure')).length > 0 && oracleCompareResults.length <= 1 && (
                <div style={{ display: 'grid', gap: 4 }}>
                  {oracleResult.alerts.filter(a => !a.includes('Mercure')).slice(0, 4).map((a, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#f59e0b', padding: '5px 10px', background: '#f59e0b08', borderRadius: 6, border: '1px solid #f59e0b12' }}>
                      ⚠ {a}
                    </div>
                  ))}
                </div>
              )}

              {/* Best dates (sujet only) */}
              {oracleResult.bestDates && oracleResult.bestDates.length > 0 && oracleResult.type === 'sujet' && (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: P.surface, border: `1px solid ${P.cardBdr}` }}>
                  <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 8 }}>
                    Meilleures fenêtres pour agir
                  </div>
                  <div style={{ fontSize: 10, color: P.textDim, marginBottom: 10 }}>
                    Les 3 meilleurs jours dans les 60 prochains
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {oracleResult.bestDates.map((bdt, i) => {
                      const verdictColor = bdt.estimatedScore >= 75 ? '#4ade80' : bdt.estimatedScore >= 48 ? '#f59e0b' : '#a78bfa';
                      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
                      return (
                        <div key={i} style={{ padding: '10px 12px', borderRadius: 8, background: `${verdictColor}06`, border: `1px solid ${verdictColor}18` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 16 }}>{medal}</span>
                              <div>
                                <div style={{ fontSize: 13, color: P.text, fontWeight: 600 }}>{bdt.label}</div>
                                <div style={{ fontSize: 10, color: P.textDim }}>{bdt.date}</div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 16, fontWeight: 700, color: verdictColor }}>{bdt.estimatedScore}%</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </Cd>
      </div>
    </>
  );
}
