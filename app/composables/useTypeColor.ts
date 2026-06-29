// Teinte HSL déterministe pour qu'un type d'intervention garde la même couleur
// entre les renders. ×137 (≈ nombre d'or angulaire) espace les teintes voisines.
export function typePillHue(label: string): number {
  let hash = 5381
  for (let i = 0; i < label.length; i++) {
    hash = ((hash << 5) + hash + label.charCodeAt(i)) | 0
  }
  return Math.abs(hash * 137) % 360
}
