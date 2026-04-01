/**
 * Asaas API Client
 * Brazilian payment processing integration
 */

export interface CreateBoletoPayload {
  customer?: string // Customer ID in Asaas (email or CPF)
  description?: string
  value: number // Amount in BRL (e.g., 100.50)
  dueDate: string // YYYY-MM-DD format
  notificationDisabled?: boolean
}

export interface CreatePixPayload {
  customer?: string
  description?: string
  value: number
  dueDate: string
  notificationDisabled?: boolean
}

export interface BoletoResponse {
  id: string
  customer?: string
  description?: string
  value: number
  dueDate: string
  status: string
  billingType: 'BOLETO'
  pixQrCode?: string
  bankSlipUrl?: string // This is the boleto URL
  bankSlipCode?: string // Boleto code
  invoiceUrl?: string
  transactionReceiptUrl?: string
  originalValue?: number
  originalDueDate?: string
  interestValue?: number
  externalReference?: string
  discount?: {
    value: number
    dueDateLimitDays: number
  }
  fine?: {
    value: number
  }
  interest?: {
    value: number
  }
  deleted?: boolean
  estimated?: boolean
  anticipated?: boolean
  anticipatedBy?: string
  createdAt?: string
  updatedAt?: string
  confirmedDate?: string
  deletedDate?: string
}

export interface PixResponse {
  id: string
  customer?: string
  description?: string
  value: number
  dueDate: string
  status: string
  billingType: 'PIX'
  pixQrCode?: string // QR code as string (base64 or URL)
  pixCopyPaste?: string // PIX code for manual entry
  invoiceUrl?: string
  transactionReceiptUrl?: string
  originalValue?: number
  originalDueDate?: string
  externalReference?: string
  deleted?: boolean
  estimated?: boolean
  confirmed?: boolean
  confirmedDate?: string
  deletedDate?: string
  createdAt?: string
  updatedAt?: string
}

export class AsaasClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey?: string, env?: 'production' | 'sandbox') {
    this.apiKey = apiKey || process.env.ASAAS_API_KEY || ''
    const asaasEnv = env || (process.env.ASAAS_ENV as 'production' | 'sandbox') || 'production'

    if (!this.apiKey) {
      throw new Error('Asaas API key is required. Set ASAAS_API_KEY environment variable.')
    }

    // Asaas uses different URLs for sandbox and production
    this.baseUrl =
      asaasEnv === 'production' ? 'https://api.asaas.com/v3' : 'https://sandbox.asaas.com/api/v3'
  }

  /**
   * Create a boleto payment
   * @param payload Payment data including due date and amount
   * @returns Boleto response with URL and code
   */
  async createBoleto(payload: CreateBoletoPayload): Promise<BoletoResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          ...payload,
          billingType: 'BOLETO',
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(
          `Asaas API error (${response.status}): ${error.message || response.statusText}`,
        )
      }

      const data = (await response.json()) as BoletoResponse
      return data
    } catch (error) {
      throw new Error(
        `Failed to create boleto: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Create a PIX payment
   * @param payload Payment data including due date and amount
   * @returns PIX response with QR code and copy-paste code
   */
  async createPix(payload: CreatePixPayload): Promise<PixResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          ...payload,
          billingType: 'PIX',
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(
          `Asaas API error (${response.status}): ${error.message || response.statusText}`,
        )
      }

      const data = (await response.json()) as PixResponse
      return data
    } catch (error) {
      throw new Error(
        `Failed to create PIX payment: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Retrieve a payment by ID
   * @param paymentId Payment ID from Asaas
   */
  async getPayment(paymentId: string): Promise<BoletoResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(
          `Asaas API error (${response.status}): ${error.message || response.statusText}`,
        )
      }

      const data = (await response.json()) as BoletoResponse
      return data
    } catch (error) {
      throw new Error(
        `Failed to retrieve payment: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
}

// Singleton instance
let asaasClientInstance: AsaasClient | null = null

export function getAsaasClient(apiKey?: string, env?: 'production' | 'sandbox'): AsaasClient {
  if (!asaasClientInstance) {
    asaasClientInstance = new AsaasClient(apiKey, env)
  }
  return asaasClientInstance
}
