/** Parse le champ CSV des types d'intervention en tableau d'ids. */
export function parseTypes(csv: string | null): string[] {
  if (!csv?.trim()) return []
  return csv.split(',').map(v => v.trim()).filter(Boolean)
}

/** Formate une durée en minutes ("1 h 30 min") ; `zeroLabel` pour null/0 (défaut "—"). */
export function formatDuration(minutes: number | null | undefined, zeroLabel = '—'): string {
  if (minutes == null || minutes <= 0) return zeroLabel
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

/** Classe CSS de la barre de quota selon le pourcentage consommé. */
export function quotaClass(pct: number): string {
  if (pct >= 100) return 'quota-bar-over'
  if (pct >= 80)  return 'quota-bar-warn'
  return ''
}
