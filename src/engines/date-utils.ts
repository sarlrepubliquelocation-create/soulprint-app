/**
 * date-utils.ts — Utilitaires de date partagés
 *
 * Créé pour corriger le bug d'âge systématique (currentYear - birthYear
 * sans vérifier si l'anniversaire est passé).
 */

/** Calcule l'âge exact en tenant compte du mois/jour d'anniversaire */
export function calcAge(today: Date, birthDate: Date): number {
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

/** Variante string pour les engines qui travaillent en format 'YYYY-MM-DD' */
export function calcAgeFromStrings(todayStr: string, bdStr: string): number {
  return calcAge(new Date(todayStr + 'T00:00:00'), new Date(bdStr + 'T00:00:00'));
}
