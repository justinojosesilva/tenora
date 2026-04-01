/**
 * Analytics utilities for tracking payment and billing events in PostHog
 */

import posthog from 'posthog-js'

export type PaymentEvent = 'pix_generated' | 'boleto_generated' | 'payment_received'

export interface PaymentEventProperties {
  chargeId?: string
  chargeType?: 'pix' | 'boleto' | 'transfer'
  amount?: number
  reference?: string
  paidAt?: string
  paidAmount?: number
  [key: string]: unknown
}

/**
 * Track a payment-related event in PostHog
 * Useful for tracking billing charges and payments
 */
export function trackPaymentEvent(event: PaymentEvent, properties?: PaymentEventProperties) {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.capture(event, properties)
  }
}

/**
 * Track when a PIX charge is generated
 */
export function trackPixGenerated(chargeId: string, amount: number, reference?: string) {
  trackPaymentEvent('pix_generated', {
    chargeId,
    chargeType: 'pix',
    amount,
    reference,
  })
}

/**
 * Track when a Boleto charge is generated
 */
export function trackBoletoGenerated(chargeId: string, amount: number, reference?: string) {
  trackPaymentEvent('boleto_generated', {
    chargeId,
    chargeType: 'boleto',
    amount,
    reference,
  })
}

/**
 * Track when a payment is received
 */
export function trackPaymentReceived(
  chargeId: string,
  chargeType: 'pix' | 'boleto' | 'transfer',
  paidAmount: number,
  paidAt: string,
) {
  trackPaymentEvent('payment_received', {
    chargeId,
    chargeType,
    paidAmount,
    paidAt,
  })
}
