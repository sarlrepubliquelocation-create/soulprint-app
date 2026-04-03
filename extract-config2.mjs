import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read files
const compatFile = fs.readFileSync(path.join(__dirname, 'src/engines/compatibility.ts'), 'utf8');
const ichingFile = fs.readFileSync(path.join(__dirname, 'src/engines/iching.ts'), 'utf8');
const oracleFile = fs.readFileSync(path.join(__dirname, 'src/engines/oracle.ts'), 'utf8');

// Extract from iching.ts
console.log('=== From iching.ts ===');
const hexMatches = ichingFile.match(/HEX_NAMES.*?{[\s\S]*?^}/m);
if (hexMatches) {
  const lines = hexMatches[0].split('\n').slice(0, 20).join('\n');
  console.log(lines);
}

const ichingTemplates = ichingFile.match(/ICHING_TEMPLATES.*?{[\s\S]*?^}/m);
if (ichingTemplates) {
  const lines = ichingTemplates[0].split('\n').slice(0, 20).join('\n');
  console.log('\n=== ICHING_TEMPLATES ===');
  console.log(lines);
}

// Extract from compatibility
console.log('\n=== From compatibility.ts ===');
const roiWenMatches = compatFile.match(/ROI_WEN.*?[\[\{][\s\S]*?[\]\}]/);
if (roiWenMatches) {
  const lines = roiWenMatches[0].split('\n').slice(0, 20).join('\n');
  console.log(lines);
}

// Look for calcBond definition
console.log('\n=== calcBond signature ===');
const bondSig = oracleFile.match(/export\s+function\s+calcBond[\s\S]*?\{[\s\S]*?\n\}/m);
if (!bondSig) {
  const bondSig2 = compatFile.match(/export\s+function\s+calcBond[\s\S]{0,500}/);
  if (bondSig2) console.log(bondSig2[0]);
  else console.log('Not found');
}

// Find Yi King in compatibility
const yiKingSection = compatFile.match(/.*Yi King.*[\s\S]{0,1000}/i);
if (yiKingSection) {
  console.log('\n=== Yi King section ===');
  console.log(yiKingSection[0].slice(0, 500));
}

// List all exports from compatibility
console.log('\n=== All exports from compatibility.ts ===');
const exports = compatFile.match(/^export\s+(?:function|const|type|interface)\s+\w+/gm) || [];
console.log(exports.join('\n'));
