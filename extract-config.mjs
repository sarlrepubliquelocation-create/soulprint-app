import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read compatibility.ts
const compatFile = fs.readFileSync(path.join(__dirname, 'src/engines/compatibility.ts'), 'utf8');

// Search for Yi King related constants
const iichingMatch = compatFile.match(/const\s+ICHING_TEMPLATES\s*=\s*{[\s\S]*?^}/m);
const roiWenMatch = compatFile.match(/const\s+ROI_WEN_PAIRS\s*=\s*\[[\s\S]*?\]/m);
const hexNamesMatch = compatFile.match(/const\s+HEX_NAMES\s*=\s*{[\s\S]*?^}/m);
const trigramMatch = compatFile.match(/TRIGRAM_ELEMENT/g);

console.log('=== ICHING_TEMPLATES ===');
if (iichingMatch) console.log(iichingMatch[0].slice(0, 500));
else console.log('NOT FOUND');

console.log('\n=== ROI_WEN_PAIRS ===');
if (roiWenMatch) console.log(roiWenMatch[0].slice(0, 500));
else console.log('NOT FOUND');

console.log('\n=== HEX_NAMES ===');
if (hexNamesMatch) console.log(hexNamesMatch[0].slice(0, 500));
else console.log('NOT FOUND');

console.log('\n=== TRIGRAM_ELEMENT ===');
if (trigramMatch) console.log('Found ' + trigramMatch.length + ' occurrences');
else console.log('NOT FOUND');

// Check for calcOracle and calcBond exports
const oracleExport = compatFile.includes('export function calcOracle');
const bondExport = compatFile.includes('export function calcBond');

console.log('\nexport calcOracle:', oracleExport);
console.log('export calcBond:', bondExport);

// Look for type definitions
const typeMatches = compatFile.match(/export\s+(?:type|interface)\s+\w+/g) || [];
console.log('\nExported types:', typeMatches.slice(0, 10).join(', '));
