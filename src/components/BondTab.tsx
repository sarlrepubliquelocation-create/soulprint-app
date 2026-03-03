import { useState } from 'react';
import { calcBond, calcBondDaily, type BondResult, type BondMode, type FamilleSubType } from '../engines/compatibility';
import { Cd, P } from './ui';

export default function BondTab({ bd }: { bd: string }) {
  const [bdB, setBdB] = useState('');
  const [nameA, setNameA] = useState('');
  const [nameB, setNameB] = useState('');
  const [mode, setMode] = useState<BondMode>('amour');
  const [familleSubType, setFamilleSubType] = useState<FamilleSubType>('frere_soeur');
  const [familleCategory, setFamilleCategory] = useState<'fratrie'|'parent'|'grands_parents'|'coloc'>('fratrie');

  const FAMILLE_CATS = [
    { id: 'fratrie',        icon: '🤝', label: 'Fratrie',        defaultSub: 'frere_soeur' as FamilleSubType },
    { id: 'parent',         icon: '👨‍👧', label: 'Parent / Enfant', defaultSub: 'pere_fils' as FamilleSubType },
    { id: 'grands_parents', icon: '👴', label: 'Grands-parents',  defaultSub: 'gp_petit_fils' as FamilleSubType },
    { id: 'coloc',          icon: '🏠', label: 'Coloc',           defaultSub: 'coloc' as FamilleSubType },
  ] as const;

  const FAMILLE_SUBS: Record<string, { id: FamilleSubType; label: string }[]> = {
    fratrie:        [{ id: 'frere_frere', label: 'Frère — Frère' }, { id: 'soeur_soeur', label: 'Sœur — Sœur' }, { id: 'frere_soeur', label: 'Frère — Sœur' }],
    parent:         [{ id: 'pere_fils', label: 'Père — Fils' }, { id: 'pere_fille', label: 'Père — Fille' }, { id: 'mere_fils', label: 'Mère — Fils' }, { id: 'mere_fille', label: 'Mère — Fille' }],
    grands_parents: [{ id: 'gp_petit_fils', label: 'GP — Petit-fils' }, { id: 'gp_petite_fille', label: 'GP — Petite-fille' }, { id: 'gm_petit_fils', label: 'GM — Petit-fils' }, { id: 'gm_petite_fille', label: 'GM — Petite-fille' }],
    coloc:          [],
  };
  const [result, setResult] = useState<BondResult | null>(null);
  const [error, setError] = useState('');

  const doCalc = () => {
    if (!bdB) { setError('Entrez une date de naissance'); return; }
    setError('');
    try {
      const r = calcBond(bd, nameA, bdB, nameB, mode, mode === 'famille' ? familleSubType : undefined);
      setResult(r);
    } catch (e: any) { setError(e.message || 'Erreur de calcul'); }
  };

  // Descriptions contextuelles des systèmes selon le mode
  const SYSTEM_DESC: Record<BondMode, Record<string, string>> = {
    amour: {
      'BaZi':          'Compatibilité des éléments natals, Piliers du Destin et attractions karmiques',
      'Numérologie':   'Résonance des Chemins de Vie, Expressions et Âmes — harmonie des vibrations',
      'Yi King':       'Dialogue des hexagrammes — dynamique symbolique du lien',
      'Peach Blossom': `Étoile d'attraction mutuelle — magnétisme romantique activé ou non`,
    },
    pro: {
      'BaZi':          'Compatibilité des éléments natals — synergies de travail et complémentarité',
      'Numérologie':   'Résonance des Chemins de Vie et Expressions — vision commune',
      'Yi King':       'Dialogue des hexagrammes — dynamique de collaboration',
      'Peach Blossom': 'Charisme et influence mutuelle dans la relation professionnelle',
    },
    famille: {
      'BaZi':          `Harmonie des Piliers familiaux, Triades et Relations d'éléments (38%)`,
      'Numérologie':   `Résonance des Chemins de Vie — leçons d'âme partagées (37%)`,
      'Yi King':       'Dialogue symbolique des hexagrammes natals (25%)',
      'Peach Blossom': 'Neutre en famille — non pris en compte (0%)',
    },
  };

  // Phrase narrative selon sous-type famille (12 sous-types)
  // Narratives R2 — fusion GPT+Gemini (poétiques, accessibles, 3 phrases max)
  const FAMILLE_NARRATIVE: Record<FamilleSubType, { intro: string; titre: string; poids: string }> = {
    frere_frere:      { titre: `Deux frères, même feu`,       intro: `entre deux frères`,                  poids: `Deux épées forgées dans le même feu. Le BaZi révèle comment vos énergies Yang se stimulent ou s'affrontent, la Numérologie éclaire vos leçons d'ego sur la même ligne de départ, et le Yi King murmure la joute silencieuse de vos destinées. Entre rivalité et loyauté, chacun cherche sa propre lumière.` },
    soeur_soeur:      { titre: `Deux sœurs en miroir`,        intro: `entre deux sœurs`,                   poids: `Deux miroirs face à face, sensibles au moindre reflet. Le BaZi dévoile la texture de vos tempéraments, la Numérologie éclaire les alliances secrètes et les comparaisons intimes, et le Yi King trace le dialogue subtil entre vos chemins. Entre confidences et rivalités feutrées, votre lien façonne l'estime de soi.` },
    frere_soeur:      { titre: `Deux rives, un lien`,         intro: `entre frère et sœur`,                poids: `Deux rives d'un même fleuve. Le BaZi met en lumière vos polarités naturelles, la Numérologie révèle l'apprentissage de l'altérité, et le Yi King montre comment vos différences deviennent complémentarité. Entre taquineries et protection instinctive, vous apprenez à apprivoiser l'autre.` },
    pere_fils:        { titre: `Le flambeau père-fils`,       intro: `entre père et fils`,                 poids: `Le flambeau que l'on transmet, parfois trop près du coeur. Le BaZi révèle l'empreinte du modèle paternel, la Numérologie montre ce qui doit être transmis ou dépassé, et le Yi King éclaire l'équilibre entre autorité et émancipation. Entre admiration et besoin d'affirmation, le fils cherche sa propre verticalité.` },
    pere_fille:       { titre: `La montagne et la source`,    intro: `entre père et fille`,                poids: `La montagne et la source qui y prend naissance. Le BaZi révèle la danse du Yang protecteur face à la sensibilité filiale, la Numérologie éclaire l'empreinte masculine fondatrice, et le Yi King dessine la construction silencieuse de la confiance. Entre protection et liberté, ce lien sculpte l'estime intime.` },
    mere_fils:        { titre: `Le port et le large`,         intro: `entre mère et fils`,                 poids: `Un port d'attache qui doit accepter le large. Le BaZi met en lumière l'attachement émotionnel, la Numérologie révèle les attentes implicites, et le Yi King dessine le passage délicat de la fusion à l'autonomie. Entre tendresse et séparation, chacun apprend à respirer seul.` },
    mere_fille:       { titre: `Deux saisons, un jardin`,     intro: `entre mère et fille`,                poids: `Deux saisons d'un même jardin. Le BaZi révèle la transmission féminine, la Numérologie éclaire les répétitions ou réparations possibles, et le Yi King suggère comment transformer l'héritage en choix conscient. Entre complicité et comparaison, la fille construit sa singularité.` },
    gp_petit_fils:    { titre: `Mémoire et avenir`,           intro: `entre grand-père et petit-fils`,     poids: `La mémoire ancienne posée sur une épaule d'enfant. Le BaZi relie la sagesse de l'ancêtre à la vitalité naissante en enjambant une génération, la Numérologie révèle les valeurs transmises, et le Yi King éclaire le relais du temps. Ici, l'amour est souvent plus doux que l'autorité.` },
    gp_petite_fille:  { titre: `Héritage et éveil`,           intro: `entre grand-père et petite-fille`,   poids: `Un regard qui reconnaît ce qui fut et ce qui renaît. Le BaZi révèle la continuité des lignées, la Numérologie éclaire les résonances affectives, et le Yi King dessine un dialogue bienveillant entre expérience et innocence. Ce lien devient souvent refuge et transmission silencieuse.` },
    gm_petit_fils:    { titre: `Douceur et force`,            intro: `entre grand-mère et petit-fils`,     poids: `La racine invisible qui nourrit la plus haute branche. Le BaZi révèle la stabilité protectrice, la Numérologie éclaire les loyautés silencieuses, et le Yi King montre l'apprentissage par l'exemple et la douceur. Ce lien nourrit sans contraindre.` },
    gm_petite_fille:  { titre: `Le fil des femmes`,           intro: `entre grand-mère et petite-fille`,   poids: `Le fil d'or ininterrompu des tisseuses. Le BaZi révèle la transmission féminine intime, la Numérologie éclaire les sensibilités partagées, et le Yi King célèbre la Durée — le passage sacré des secrets du clan d'une gardienne à l'autre. Deux Yin qui se reconnaissent au-delà des mots.` },
    coloc:            { titre: `Sous le même toit`,           intro: `entre colocataires`,                 poids: `Deux trajectoires qui se croisent sous le même toit. Le BaZi révèle la compatibilité de vos rythmes quotidiens, la Numérologie éclaire les valeurs pratiques et la gestion de l'espace, et le Yi King montre l'équilibre entre territoire personnel et vie commune. L'harmonie se joue dans les détails.` },
  };

  const narrativeFamille = mode === 'famille' ? FAMILLE_NARRATIVE[familleSubType] : null;

  return (
    <Cd>
      <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 16 }}>
        ✨ Affinité — Compatibilité
      </div>

      {/* ═══ FORMULAIRE ═══ */}
      <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: P.textMid, fontStyle: 'italic' }}>
          Votre date : <span style={{ color: P.text, fontWeight: 700 }}>{bd}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input placeholder="Votre prénom (optionnel)" value={nameA} onChange={e => setNameA(e.target.value)}
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
            <button key={m.id} onClick={() => { setMode(m.id); setResult(null); }} style={{
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 5 }}>
              {FAMILLE_CATS.map(cat => (
                <button key={cat.id} onClick={() => { setFamilleCategory(cat.id); setFamilleSubType(cat.defaultSub); setResult(null); }} style={{
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
                  <button key={sub.id} onClick={() => { setFamilleSubType(sub.id); setResult(null); }} style={{
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

        <button onClick={doCalc} style={{
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

          {/* Breakdown systèmes — Peach Blossom masqué en mode famille (poids 0%) */}
          <div style={{ display: 'grid', gap: 8 }}>
            {result.breakdown.filter(b => !(mode === 'famille' && b.system === 'Peach Blossom')).map((b, i) => (
              <div key={i} style={{ padding: '10px 12px', borderRadius: 8, background: P.surface, border: `1px solid ${P.cardBdr}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: P.text }}>{b.icon} {b.system}</span>
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
                <div style={{ fontSize: 11, color: P.textDim, marginTop: 4 }}>{b.detail}</div>
                {SYSTEM_DESC[mode]?.[b.system] && (
                  <div style={{ fontSize: 10, color: P.textDim, marginTop: 3, opacity: 0.6, fontStyle: 'italic' }}>
                    {SYSTEM_DESC[mode][b.system]}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Méthodologie + narrative famille */}
          {mode === 'famille' && narrativeFamille && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#60a5fa08', border: '1px solid #60a5fa15' }}>
              <div style={{ fontSize: 10, color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                📊 Comment ce score est calculé
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
                  ? 'BaZi (40%) — Numérologie (30%) — Yi King (20%) — Peach Blossom (10%). Le score final passe par une courbe gaussienne (médiane 65) pour refléter une distribution réaliste des compatibilités.'
                  : 'BaZi (30%) — Numérologie (35%) — Yi King (25%) — Peach Blossom (10%). La Numérologie prime en mode Pro pour la vision commune et la complémentarité intellectuelle.'}
              </div>
            </div>
          )}

          {/* Signals & Alerts */}
          {result.signals.length > 0 && (
            <div style={{ display: 'grid', gap: 4 }}>
              {result.signals.slice(0, 5).map((s, i) => (
                <div key={i} style={{ fontSize: 12, color: '#4ade80', padding: '6px 10px', background: '#4ade8008', borderRadius: 6, border: '1px solid #4ade8015' }}>
                  {s}
                </div>
              ))}
            </div>
          )}
          {result.alerts.length > 0 && (
            <div style={{ display: 'grid', gap: 4 }}>
              {result.alerts.slice(0, 5).map((a, i) => (
                <div key={i} style={{ fontSize: 12, color: '#f59e0b', padding: '6px 10px', background: '#f59e0b08', borderRadius: 6, border: '1px solid #f59e0b15' }}>
                  {a}
                </div>
              ))}
            </div>
          )}

          {/* Conseil */}
          <div style={{ padding: '12px 14px', borderRadius: 10, background: `${result.label.color}08`, border: `1px solid ${result.label.color}20` }}>
            {(nameA || nameB) && (
              <div style={{ fontSize: 11, color: result.label.color, fontWeight: 700, marginBottom: 6 }}>
                {mode === 'famille' && narrativeFamille
                  ? `${nameA || 'Vous'} & ${nameB || "l'autre"} · ${narrativeFamille.titre}`
                  : mode === 'amour'
                    ? `${nameA || 'Vous'} ❤️ ${nameB || 'Partenaire'}`
                    : `${nameA || 'Vous'} 💼 ${nameB || 'Collègue'}`}
              </div>
            )}
            <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>{result.conseil}</div>
          </div>
        </div>
      )}
    </Cd>
  );
}
