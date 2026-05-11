// Interfaces génériques pour les selects d'icônes
export interface SelectOption {
  value: string
  label: string
  slug : string | null
}

export interface TechOption {
  id   : string
  label: string
  slug ?: string | null
  svg  ?: string | null
}
