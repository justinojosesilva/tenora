/**
 * Email templates for Tenora notifications
 */

export interface ChargeGeneratedEmailParams {
  tenantName: string
  propertyAddress: string
  chargeAmount: string
  dueDate: string
  reference: string
  dashboardUrl: string
}

export interface PaymentConfirmedEmailParams {
  tenantName: string
  propertyAddress: string
  amount: string
  paidDate: string
  reference: string
  dashboardUrl: string
}

export interface LeaseExpiryEmailParams {
  tenantName: string
  propertyAddress: string
  endDate: string
  daysLeft: number
  dashboardUrl: string
}

export function buildChargeGeneratedEmail(params: ChargeGeneratedEmailParams): string {
  const { tenantName, propertyAddress, chargeAmount, dueDate, reference, dashboardUrl } = params
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; background: #f9fafb; padding: 32px 16px; color: #111827;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,.1);">
    <h2 style="color: #1f2937; margin-top: 0;">📋 Nova Cobrança Gerada</h2>
    <p>Olá, <strong>${tenantName}</strong>!</p>
    <p>Uma nova cobrança foi gerada para o seu contrato. Veja os detalhes:</p>
    <table style="width:100%; background:#f3f4f6; border-radius:6px; padding:16px; margin:16px 0; border-collapse:collapse;">
      <tr><td style="padding:4px 0; color:#6b7280;">Imóvel</td><td style="padding:4px 0; font-weight:600;">${propertyAddress}</td></tr>
      <tr><td style="padding:4px 0; color:#6b7280;">Referência</td><td style="padding:4px 0; font-weight:600;">${reference}</td></tr>
      <tr><td style="padding:4px 0; color:#6b7280;">Valor</td><td style="padding:4px 0; font-weight:600; color:#059669;">R$ ${chargeAmount}</td></tr>
      <tr><td style="padding:4px 0; color:#6b7280;">Vencimento</td><td style="padding:4px 0; font-weight:600;">${dueDate}</td></tr>
    </table>
    <p>Acesse o portal para visualizar todas as suas cobranças:</p>
    <a href="${dashboardUrl}" style="display:inline-block; background:#2563eb; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:600; margin-top:8px;">
      Acessar Cobranças →
    </a>
    <p style="margin-top:32px; font-size:12px; color:#9ca3af;">
      Esta é uma mensagem automática do sistema Tenora. Por favor, não responda este e-mail.
    </p>
  </div>
</body>
</html>`
}

export function buildPaymentConfirmedEmail(params: PaymentConfirmedEmailParams): string {
  const { tenantName, propertyAddress, amount, paidDate, reference, dashboardUrl } = params
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; background: #f9fafb; padding: 32px 16px; color: #111827;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,.1);">
    <h2 style="color: #059669; margin-top: 0;">✅ Pagamento Confirmado</h2>
    <p>Olá, <strong>${tenantName}</strong>!</p>
    <p>Seu pagamento foi confirmado com sucesso! Veja os detalhes:</p>
    <table style="width:100%; background:#f3f4f6; border-radius:6px; padding:16px; margin:16px 0; border-collapse:collapse;">
      <tr><td style="padding:4px 0; color:#6b7280;">Imóvel</td><td style="padding:4px 0; font-weight:600;">${propertyAddress}</td></tr>
      <tr><td style="padding:4px 0; color:#6b7280;">Referência</td><td style="padding:4px 0; font-weight:600;">${reference}</td></tr>
      <tr><td style="padding:4px 0; color:#6b7280;">Valor Pago</td><td style="padding:4px 0; font-weight:600; color:#059669;">R$ ${amount}</td></tr>
      <tr><td style="padding:4px 0; color:#6b7280;">Data do Pagamento</td><td style="padding:4px 0; font-weight:600;">${paidDate}</td></tr>
    </table>
    <p>Acesse o portal para conferir seu histórico de pagamentos:</p>
    <a href="${dashboardUrl}" style="display:inline-block; background:#2563eb; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:600; margin-top:8px;">
      Ver Histórico →
    </a>
    <p style="margin-top:32px; font-size:12px; color:#9ca3af;">
      Esta é uma mensagem automática do sistema Tenora. Por favor, não responda este e-mail.
    </p>
  </div>
</body>
</html>`
}

export function buildLeaseExpiryEmail(params: LeaseExpiryEmailParams): string {
  const { tenantName, propertyAddress, endDate, daysLeft, dashboardUrl } = params
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; background: #f9fafb; padding: 32px 16px; color: #111827;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,.1);">
    <h2 style="color: #b45309; margin-top: 0;">⚠️ Contrato Próximo do Vencimento</h2>
    <p>Olá, <strong>${tenantName}</strong>!</p>
    <p>Seu contrato de locação referente ao imóvel abaixo vence em <strong>${daysLeft} dias</strong>:</p>
    <table style="width:100%; background:#f3f4f6; border-radius:6px; padding:16px; margin:16px 0; border-collapse:collapse;">
      <tr><td style="padding:4px 0; color:#6b7280;">Imóvel</td><td style="padding:4px 0; font-weight:600;">${propertyAddress}</td></tr>
      <tr><td style="padding:4px 0; color:#6b7280;">Data de Vencimento</td><td style="padding:4px 0; font-weight:600;">${endDate}</td></tr>
      <tr><td style="padding:4px 0; color:#6b7280;">Dias Restantes</td><td style="padding:4px 0; font-weight:600; color:#b45309;">${daysLeft} dias</td></tr>
    </table>
    <p>Acesse o dashboard para mais informações ou para renovar o contrato:</p>
    <a href="${dashboardUrl}" style="display:inline-block; background:#2563eb; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:600; margin-top:8px;">
      Acessar Dashboard →
    </a>
    <p style="margin-top:32px; font-size:12px; color:#9ca3af;">
      Esta é uma mensagem automática do sistema Tenora. Por favor, não responda este e-mail.
    </p>
  </div>
</body>
</html>`
}
