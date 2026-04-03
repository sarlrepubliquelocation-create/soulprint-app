"use strict";

// tests/simulation-phase3-oracle-yiking.ts
var import_oracle = require("../src/engines/oracle");
var import_compatibility = require("../src/engines/compatibility");
var DOMAINS = ["generaliste", "commerce", "creatif", "humain", "spirituel", "tech"];
var SUJETS = ["projet", "sentiments", "partenariat", "investissement", "voyage", "presentation", "changement"];
var SUJET_DOMAIN_HINTS = {
  projet: ["commerce", "creatif", "tech"],
  sentiments: ["humain", "spirituel"],
  partenariat: ["humain", "commerce"],
  investissement: ["commerce", "tech"],
  voyage: ["spirituel", "generaliste"],
  presentation: ["creatif", "humain"],
  changement: ["spirituel", "generaliste"]
};
var TEST_NAMES_SINGLE = ["KAIRONAUTE", "ZENITH", "SOLARIS", "MARIE", "JEROME"];
var TEST_NAMES_MULTI = [
  "MARIE, JEROME",
  "KAIRONAUTE, ZENITH, SOLARIS",
  "PIERRE, PAUL, JACQUES"
];
var TEST_DATES = [
  "1990-01-15",
  "1985-06-23",
  "2000-12-31",
  "1998-03-21",
  "1992-09-15",
  "1988-11-04"
];
var TEST_ADDRESSES = [
  "12 rue de la Paix",
  "1 avenue des Champs-\xC9lys\xE9es",
  "7 place de la R\xE9publique"
];
var TEST_BABY_NAMES_MULTI = [
  "L\xC9ON, JADE",
  "GABRIEL, EMMA, RAPHA\xCBL"
];
var HEX_NAMES = {
  1: "Cr\xE9ateur",
  2: "R\xE9ceptif",
  3: "Difficult\xE9 initiale",
  4: "Folie juv\xE9nile",
  5: "Attente",
  6: "Conflit",
  7: "Arm\xE9e",
  8: "Union",
  9: "Petit Apprivoisement",
  10: "Marche",
  11: "Paix",
  12: "Stagnation",
  13: "Communaut\xE9",
  14: "Grand Avoir",
  15: "Humilit\xE9",
  16: "Enthousiasme",
  17: "Suite",
  18: "Correction",
  19: "Approche",
  20: "Contemplation",
  21: "Mordre au travers",
  22: "Gr\xE2ce",
  23: "\xC9clatement",
  24: "Retour",
  25: "Innocence",
  26: "Grand Apprivoisement",
  27: "Nourriture",
  28: "Grand Exc\xE8s",
  29: "Insondable",
  30: "Feu",
  31: "Influence",
  32: "Dur\xE9e",
  33: "Retraite",
  34: "Grande Force",
  35: "Progr\xE8s",
  36: "Obscurcissement",
  37: "Famille",
  38: "Opposition",
  39: "Obstacle",
  40: "Lib\xE9ration",
  41: "Diminution",
  42: "Augmentation",
  43: "Perc\xE9e",
  44: "Rencontre",
  45: "Rassemblement",
  46: "Pouss\xE9e vers le haut",
  47: "Accablement",
  48: "Puits",
  49: "R\xE9volution",
  50: "Chaudron",
  51: "\xC9branlement",
  52: "Immobilisation",
  53: "D\xE9veloppement",
  54: "\xC9pous\xE9e",
  55: "Abondance",
  56: "Voyageur",
  57: "Le Doux",
  58: "S\xE9r\xE9nit\xE9",
  59: "Dissolution",
  60: "Limitation",
  61: "V\xE9rit\xE9 int\xE9rieure",
  62: "Petite Travers\xE9e",
  63: "Apr\xE8s Accomplissement",
  64: "Avant Accomplissement"
};
var ROI_WEN_PAIRS = /* @__PURE__ */ new Set([
  "1-2",
  "3-4",
  "5-6",
  "7-8",
  "9-10",
  "11-12",
  "13-14",
  "15-16",
  "17-18",
  "19-20",
  "21-22",
  "23-24",
  "25-26",
  "27-28",
  "29-30",
  "31-32",
  "33-34",
  "35-36",
  "37-38",
  "39-40",
  "41-42",
  "43-44",
  "45-46",
  "47-48",
  "49-50",
  "51-52",
  "53-54",
  "55-56",
  "57-58",
  "59-60",
  "61-62",
  "63-64"
]);
var ORTHO_PATTERNS = [
  { pattern: /\bvous\b(?! (deux|même))/i, msg: 'Vouvoiement "vous"' },
  { pattern: /\bvotre\b/i, msg: 'Vouvoiement "votre"' },
  { pattern: /Peach Blossom/i, msg: '"Peach Blossom" non francis\xE9' },
  { pattern: /\bCdV\b/, msg: '"CdV" non d\xE9velopp\xE9' }
];
var errors = [];
var totalTests = 0;
var passedTests = 0;
console.log("\n\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557");
console.log("\u2551 PART A: ORACLE DOMAIN \u2194 SUJET COHERENCE                   \u2551");
console.log("\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D\n");
console.log("A.1: Testing sujets with domain coherence...");
var sujetTests = 0;
for (const sujet of SUJETS) {
  for (const dailyScore of [30, 60, 90]) {
    for (const convergenceScore of [40, 70]) {
      try {
        const result = (0, import_oracle.calcOracle)({
          type: "sujet",
          input: sujet,
          sujet,
          dailyScore,
          domainScoreFromConvergence: convergenceScore,
          userCdv: 7,
          userBirthDay: 23,
          userBirthMonth: 9
        });
        sujetTests++;
        totalTests++;
        const expectedDomains = SUJET_DOMAIN_HINTS[sujet];
        const dominantDomain = result.domain;
        const domainCoherent = expectedDomains.length === 0 || expectedDomains.includes(dominantDomain);
        if (!domainCoherent) {
          errors.push({
            part: "A",
            category: "SUJET_DOMAIN",
            message: `Sujet "${sujet}" \u2192 domain "${dominantDomain}" not in hints ${expectedDomains}`,
            details: { sujet, dominantDomain, expectedDomains }
          });
        } else {
          passedTests++;
        }
        const narrative = result.verdict?.texte || "";
        if (narrative.length < 20) {
          errors.push({
            part: "A",
            category: "SUJET_NARRATIVE",
            message: `Sujet "${sujet}" has empty narrative`
          });
        } else {
          passedTests++;
        }
      } catch (e) {
        errors.push({
          part: "A",
          category: "SUJET_CRASH",
          message: `Sujet "${sujet}" crashed: ${e.message}`
        });
      }
    }
  }
}
console.log(`  \u2713 ${sujetTests} sujet tests executed
`);
console.log("A.2: Testing oracle types \xD7 domains with verdict coherence...");
var typeTests = 0;
for (const name of TEST_NAMES_SINGLE) {
  for (const domain of DOMAINS) {
    try {
      const result = (0, import_oracle.calcOracle)({
        type: "nom",
        input: name,
        domain,
        dailyScore: 65,
        userCdv: 7
      });
      typeTests++;
      totalTests++;
      const expectedVerdict = result.oracleScore >= 75 ? "feu_vert" : result.oracleScore >= 48 ? "prudence" : "pas_maintenant";
      if (result.verdict.verdict !== expectedVerdict) {
        errors.push({
          part: "A",
          category: "VERDICT_COHERENCE",
          message: `nom/${name}/${domain}: score ${result.oracleScore}% \u2192 expected "${expectedVerdict}", got "${result.verdict.verdict}"`
        });
      } else {
        passedTests++;
      }
      if (result.intrinsicVerdict?.icon) {
        const expectedIcon = result.domainScore >= 70 ? "\u2726" : result.domainScore >= 45 ? "\u25C6" : "\u25C7";
        const validIcons = ["\u2726", "\u25C6", "\u25C7", "\u2705", "\u26A0\uFE0F", "\u{1F53B}"];
        if (!validIcons.includes(result.intrinsicVerdict.icon)) {
          errors.push({
            part: "A",
            category: "INTRINSIC_ICON",
            message: `nom/${name}/${domain}: invalid icon "${result.intrinsicVerdict.icon}"`
          });
        } else {
          passedTests++;
        }
      }
      const allTexts = [
        result.verdict?.texte || "",
        result.mercuryNarrative || "",
        ...result.signals || [],
        ...result.alerts || []
      ];
      for (const text of allTexts) {
        for (const { pattern, msg } of ORTHO_PATTERNS) {
          if (pattern.test(text) && !/\b(entre vous|chez vous|rendez-vous)\b/.test(text)) {
            errors.push({
              part: "A",
              category: "ORTHO",
              message: `nom/${name}: ${msg} in "${text.slice(0, 80)}"`
            });
            break;
          }
        }
      }
    } catch (e) {
      errors.push({
        part: "A",
        category: "NOM_CRASH",
        message: `nom/${name}/${domain} crashed: ${e.message}`
      });
    }
  }
}
for (const date of TEST_DATES.slice(0, 3)) {
  try {
    const result = (0, import_oracle.calcOracle)({
      type: "date",
      input: date,
      targetDate: date,
      dailyScore: 65,
      userCdv: 9,
      userBirthDay: 15,
      userBirthMonth: 6
    });
    typeTests++;
    totalTests++;
    if (result.oracleScore >= 0 && result.oracleScore <= 100) {
      passedTests++;
    } else {
      errors.push({
        part: "A",
        category: "DATE_RANGE",
        message: `date/${date}: score out of range ${result.oracleScore}`
      });
    }
  } catch (e) {
    errors.push({
      part: "A",
      category: "DATE_CRASH",
      message: `date/${date} crashed: ${e.message}`
    });
  }
}
for (const addr of TEST_ADDRESSES.slice(0, 2)) {
  try {
    const result = (0, import_oracle.calcOracle)({
      type: "adresse",
      input: addr,
      dailyScore: 65,
      userCdv: 11,
      appart: "3"
    });
    typeTests++;
    totalTests++;
    if (result.oracleScore >= 0 && result.oracleScore <= 100) {
      passedTests++;
    }
  } catch (e) {
    errors.push({
      part: "A",
      category: "ADRESSE_CRASH",
      message: `adresse/${addr} crashed: ${e.message}`
    });
  }
}
console.log(`  \u2713 ${typeTests} type tests executed
`);
console.log("A.3: Testing Mercury retrograde coherence...");
var mercuryTests = 0;
for (const name of TEST_NAMES_SINGLE.slice(0, 2)) {
  try {
    const result = (0, import_oracle.calcOracle)({
      type: "nom",
      input: name,
      domain: "commerce",
      dailyScore: 65,
      userCdv: 7
    });
    mercuryTests++;
    totalTests++;
    if (result.mercuryCapped && result.mercuryMalus === 0) {
      errors.push({
        part: "A",
        category: "MERCURY",
        message: `nom/${name}: mercuryCapped=true but mercuryMalus=0`
      });
    } else {
      passedTests++;
    }
  } catch (e) {
    errors.push({
      part: "A",
      category: "MERCURY_CRASH",
      message: `Mercury test crashed: ${e.message}`
    });
  }
}
console.log(`  \u2713 ${mercuryTests} Mercury tests executed
`);
console.log("\n\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557");
console.log("\u2551 PART B: YI KING COMPATIBILITY DEEP VALIDATION             \u2551");
console.log("\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D\n");
console.log("B.1: Generating 100+ birth date pairs...");
function generateBirthDates(count) {
  const dates = [];
  for (let i = 0; i < count; i++) {
    const year = 1980 + Math.floor(i / 12);
    const month = i % 12 + 1;
    const day = i % 28 + 1;
    dates.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }
  return dates;
}
var birthDates = generateBirthDates(110);
var iChingTests = 0;
var roiWenFound = 0;
for (let i = 0; i < birthDates.length - 1; i += 2) {
  try {
    const bdA = birthDates[i];
    const bdB = birthDates[i + 1];
    const result = (0, import_compatibility.calcBond)(bdA, "PersonA", bdB, "PersonB", "amour");
    iChingTests++;
    totalTests++;
    if (result.technicals && result.technicals.ichingCompat) {
      const iching = result.technicals.ichingCompat;
      if (iching.hexA && iching.hexA > 0 && iching.hexA <= 64) {
        const hexNameA = HEX_NAMES[iching.hexA];
        if (!hexNameA) {
          errors.push({
            part: "B",
            category: "HEX_NAME",
            message: `Invalid hexA: ${iching.hexA} (not in HEX_NAMES)`
          });
        } else {
          passedTests++;
        }
      }
      if (iching.hexB && iching.hexB > 0 && iching.hexB <= 64) {
        const hexNameB = HEX_NAMES[iching.hexB];
        if (!hexNameB) {
          errors.push({
            part: "B",
            category: "HEX_NAME",
            message: `Invalid hexB: ${iching.hexB} (not in HEX_NAMES)`
          });
        } else {
          passedTests++;
        }
      }
      if (iching.hexA && iching.hexB) {
        const pairKey = `${iching.hexA}-${iching.hexB}`;
        const reversePairKey = `${iching.hexB}-${iching.hexA}`;
        if (ROI_WEN_PAIRS.has(pairKey) || ROI_WEN_PAIRS.has(reversePairKey)) {
          roiWenFound++;
          if (!result.contextBadges?.some((b) => b.label.includes("Roi Wen"))) {
            errors.push({
              part: "B",
              category: "ROI_WEN_MISSING",
              message: `Pair ${pairKey} is Roi Wen but badge not found`
            });
          } else {
            passedTests++;
          }
        }
      }
      if (iching.score !== void 0) {
        if (iching.score < 0 || iching.score > 100) {
          errors.push({
            part: "B",
            category: "ICHING_SCORE",
            message: `Invalid Yi King score: ${iching.score}`
          });
        } else {
          passedTests++;
        }
      }
      if (iching.elementalTension) {
        if (iching.trigramA && iching.trigramB) {
          passedTests++;
        }
      }
      if (iching.favorableFlow) {
        passedTests++;
      }
    }
  } catch (e) {
    errors.push({
      part: "B",
      category: "ICHING_CRASH",
      message: `Bond calc crashed for ${birthDates[i]} \u2194 ${birthDates[i + 1]}: ${e.message}`
    });
  }
}
console.log(`  \u2713 ${iChingTests} Yi King tests executed`);
console.log(`  \u2713 ${roiWenFound} Roi Wen pairs found
`);
console.log("\n\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557");
console.log("\u2551 PART C: ORACLE COMPARE MODE (MULTI-NAME)                   \u2551");
console.log("\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D\n");
console.log("C.1: Testing multi-name mode...");
var multiTests = 0;
for (const input of TEST_NAMES_MULTI) {
  try {
    const result = (0, import_oracle.calcOracle)({
      type: "nom",
      input,
      domain: "generaliste",
      dailyScore: 65,
      userCdv: 7
    });
    multiTests++;
    totalTests++;
    if (result && result.oracleScore !== void 0) {
      passedTests++;
    } else {
      errors.push({
        part: "C",
        category: "MULTI_NAME",
        message: `Multi-name "${input}" did not return valid result`
      });
    }
  } catch (e) {
    errors.push({
      part: "C",
      category: "MULTI_NAME_CRASH",
      message: `Multi-name "${input}" crashed: ${e.message}`
    });
  }
}
for (const input of TEST_BABY_NAMES_MULTI) {
  try {
    const result = (0, import_oracle.calcOracle)({
      type: "bebe",
      input,
      dailyScore: 65,
      userCdv: 7
    });
    multiTests++;
    totalTests++;
    if (result && result.oracleScore !== void 0) {
      passedTests++;
    } else {
      errors.push({
        part: "C",
        category: "MULTI_BEBE",
        message: `Multi-prenom "${input}" did not return valid result`
      });
    }
  } catch (e) {
    errors.push({
      part: "C",
      category: "MULTI_BEBE_CRASH",
      message: `Multi-prenom "${input}" crashed: ${e.message}`
    });
  }
}
console.log(`  \u2713 ${multiTests} multi-name tests executed
`);
console.log("\n\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557");
console.log("\u2551 FINAL REPORT                                               \u2551");
console.log("\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D\n");
console.log(`Total tests executed: ${totalTests}`);
console.log(`Tests passed: ${passedTests}`);
console.log(`Tests failed: ${errors.length}`);
console.log(`Pass rate: ${(passedTests / totalTests * 100).toFixed(1)}%
`);
if (errors.length > 0) {
  const byPart = { A: [], B: [], C: [] };
  for (const err of errors) {
    byPart[err.part].push(err);
  }
  for (const [part, errs] of Object.entries(byPart)) {
    if (errs.length === 0) continue;
    console.log(`
\u2550\u2550 PART ${part} ERRORS (${errs.length}) \u2550\u2550`);
    const byCategory = {};
    for (const err of errs) {
      if (!byCategory[err.category]) byCategory[err.category] = [];
      byCategory[err.category].push(err);
    }
    for (const [cat, catErrs] of Object.entries(byCategory)) {
      console.log(`
  [${cat}] (${catErrs.length})`);
      const unique = /* @__PURE__ */ new Map();
      for (const err of catErrs) {
        const key = err.message;
        unique.set(key, (unique.get(key) || 0) + 1);
      }
      for (const [msg, count] of unique.entries()) {
        console.log(`    \u2022 ${msg}${count > 1 ? ` (\xD7${count})` : ""}`);
      }
    }
  }
} else {
  console.log("\u2705 ALL TESTS PASSED \u2014 NO ERRORS DETECTED\n");
}
console.log("\n\u2550\u2550 TEST COVERAGE SUMMARY \u2550\u2550");
console.log(`Part A (Domain/Sujet): ${sujetTests + typeTests + mercuryTests} tests`);
console.log(`Part B (Yi King): ${iChingTests} tests (${roiWenFound} Roi Wen pairs found)`);
console.log(`Part C (Multi-name): ${multiTests} tests`);
console.log("\nSimulation completed.");
