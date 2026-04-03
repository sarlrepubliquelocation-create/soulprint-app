import { calcLifePath } from '../src/engines/numerology';

const jerome = calcLifePath('1977-09-23');
console.log('Jérôme (23/09/1977) → CdV =', jerome.v, jerome.m ? '(Maître Nombre)' : '');

const masters: Record<number, string[]> = {11: [], 22: [], 33: []};
for (let y = 1950; y <= 2005; y++) {
  for (let m = 1; m <= 12; m++) {
    for (let d = 1; d <= 28; d++) {
      const bd = y + '-' + String(m).padStart(2,'0') + '-' + String(d).padStart(2,'0');
      const lp = calcLifePath(bd);
      if (lp.v === 11 && masters[11].length < 3) masters[11].push(bd);
      if (lp.v === 22 && masters[22].length < 3) masters[22].push(bd);
      if (lp.v === 33 && masters[33].length < 3) masters[33].push(bd);
    }
  }
}
console.log('\nDates CdV 11:', masters[11]);
console.log('Dates CdV 22:', masters[22]);
console.log('Dates CdV 33:', masters[33]);
