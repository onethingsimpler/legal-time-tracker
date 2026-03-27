const PALETTE = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#14B8A6',
  '#A855F7', '#F43F5E',
]

export function clientColor(clientId) {
  if (!clientId) return '#94a3b8'
  return PALETTE[(clientId - 1) % PALETTE.length]
}
