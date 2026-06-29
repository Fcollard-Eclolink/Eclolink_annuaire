export function currentMonthPrefix(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function currentMonthLabel(): string {
  const now   = new Date()
  const label = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
