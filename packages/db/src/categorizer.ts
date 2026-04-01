/**
 * Auto-categorization logic for transactions
 *
 * Maps transaction descriptions to predefined categories based on keywords.
 * Used for initial categorization when transactions are synced from bank.
 *
 * Fora de escopo:
 * - Manual recategorization by user (Sprint 7)
 * - ML-based categorization (Sprint 8)
 */

interface CategoryMapping {
  keywords: string[]
  categoryType: 'income' | 'expense'
  categoryName: string
}

const DEFAULT_CATEGORY_MAPPINGS: CategoryMapping[] = [
  // Income categories
  {
    keywords: ['aluguel', 'rent', 'rental'],
    categoryType: 'income',
    categoryName: 'Aluguel Recebido',
  },
  {
    keywords: ['condomínio', 'condominio', 'cond'],
    categoryType: 'income',
    categoryName: 'Taxa de Condomínio',
  },
  {
    keywords: ['taxa', 'juros', 'multa', 'fee'],
    categoryType: 'income',
    categoryName: 'Taxas e Juros',
  },

  // Expense categories
  {
    keywords: ['iptu', 'imposto', 'tax', 'tributo'],
    categoryType: 'expense',
    categoryName: 'IPTU/Impostos',
  },
  {
    keywords: ['água', 'agua', 'water', 'hidro'],
    categoryType: 'expense',
    categoryName: 'Água',
  },
  {
    keywords: ['luz', 'energia', 'elétrica', 'eletrica', 'power', 'eletricidade'],
    categoryType: 'expense',
    categoryName: 'Energia Elétrica',
  },
  {
    keywords: ['internet', 'telefone', 'telecom', 'phone'],
    categoryType: 'expense',
    categoryName: 'Internet/Telefone',
  },
  {
    keywords: ['manutenção', 'manutencao', 'manutenção', 'reparo', 'conserto', 'maintenance'],
    categoryType: 'expense',
    categoryName: 'Manutenção',
  },
  {
    keywords: ['seguro', 'insurance'],
    categoryType: 'expense',
    categoryName: 'Seguro',
  },
  {
    keywords: ['limpeza', 'limpeza', 'cleaning'],
    categoryType: 'expense',
    categoryName: 'Limpeza',
  },
  {
    keywords: ['propaganda', 'anúncio', 'anuncio', 'advertisement', 'marketing'],
    categoryType: 'expense',
    categoryName: 'Propaganda/Marketing',
  },
]

/**
 * Detect category type and name from transaction description
 * Returns null if no match found
 */
export function autoCategorizeBankTransaction(
  description: string,
): { categoryType: 'income' | 'expense'; categoryName: string } | null {
  const normalizedDesc = description.toLowerCase().trim()

  for (const mapping of DEFAULT_CATEGORY_MAPPINGS) {
    if (mapping.keywords.some((keyword) => normalizedDesc.includes(keyword))) {
      return {
        categoryType: mapping.categoryType,
        categoryName: mapping.categoryName,
      }
    }
  }

  return null
}

/**
 * Get or create default system categories for a tenant
 * Used during tenant onboarding
 */
export const DEFAULT_SYSTEM_CATEGORIES = [
  // Income
  { type: 'income', name: 'Aluguel Recebido', color: '#10b981' },
  { type: 'income', name: 'Taxa de Condomínio', color: '#10b981' },
  { type: 'income', name: 'Taxas e Juros', color: '#10b981' },

  // Expense
  { type: 'expense', name: 'IPTU/Impostos', color: '#ef4444' },
  { type: 'expense', name: 'Água', color: '#ef4444' },
  { type: 'expense', name: 'Energia Elétrica', color: '#ef4444' },
  { type: 'expense', name: 'Internet/Telefone', color: '#ef4444' },
  { type: 'expense', name: 'Manutenção', color: '#ef4444' },
  { type: 'expense', name: 'Seguro', color: '#ef4444' },
  { type: 'expense', name: 'Limpeza', color: '#ef4444' },
  { type: 'expense', name: 'Propaganda/Marketing', color: '#ef4444' },
] as const
