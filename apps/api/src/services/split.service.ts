export interface SplitResult {
  agency: number
  owner: number
}

/**
 * Calcula a divisão de uma transação de aluguel entre agência e proprietário.
 * agency = rentAmount * adminFeePct / 100
 * owner  = rentAmount - agency
 *
 * O cálculo é baseado no valor contratual (rentAmount do contrato),
 * independente do valor real pago na transação.
 */
export function calculate(
  _transaction: unknown,
  lease: {
    rentAmount: { toString(): string } | number
    adminFeePct: { toString(): string } | number
  },
): SplitResult {
  const rentAmount = Number(lease.rentAmount)
  const adminFeePct = Number(lease.adminFeePct)
  const agency = (rentAmount * adminFeePct) / 100
  const owner = rentAmount - agency
  return { agency, owner }
}
