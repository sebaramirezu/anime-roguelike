const combatAmount = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1, useGrouping: false })

export function formatCombatAmount(amount: number): string {
  return combatAmount.format(amount)
}
