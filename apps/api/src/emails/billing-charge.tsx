import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Row,
  Section,
  Text,
} from '@react-email/components'

export interface BillingChargeEmailProps {
  tenantName: string
  propertyAddress: string
  chargeAmount: string
  dueDate: string
  reference: string
  dashboardUrl: string
  pixCode?: string
  boletoUrl?: string
}

export function BillingChargeEmail({
  tenantName,
  propertyAddress,
  chargeAmount,
  dueDate,
  reference,
  dashboardUrl,
  pixCode,
  boletoUrl,
}: BillingChargeEmailProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header with Tenora logo */}
          <Section style={header}>
            <Text style={logo}>📋 TENORA</Text>
          </Section>

          {/* Main content */}
          <Section style={content}>
            <Text style={greeting}>
              Olá, <strong>{tenantName}</strong>!
            </Text>

            <Text style={subtitle}>Uma nova cobrança foi gerada para o seu contrato.</Text>

            {/* Charge details table */}
            <Section style={detailsSection}>
              <Row style={detailRow}>
                <Text style={detailLabel}>Imóvel</Text>
                <Text style={detailValue}>{propertyAddress}</Text>
              </Row>
              <Hr style={detailDivider} />
              <Row style={detailRow}>
                <Text style={detailLabel}>Referência</Text>
                <Text style={detailValue}>{reference}</Text>
              </Row>
              <Hr style={detailDivider} />
              <Row style={detailRow}>
                <Text style={detailLabel}>Valor</Text>
                <Text style={{ ...detailValue, color: '#059669', fontWeight: 'bold' }}>
                  R$ {chargeAmount}
                </Text>
              </Row>
              <Hr style={detailDivider} />
              <Row style={detailRow}>
                <Text style={detailLabel}>Vencimento</Text>
                <Text style={detailValue}>{dueDate}</Text>
              </Row>
            </Section>

            {/* Payment methods */}
            <Text style={paymentMethodsTitle}>Formas de Pagamento:</Text>

            <Section style={paymentSection}>
              {pixCode && (
                <Section style={paymentMethodBox}>
                  <Text style={paymentMethodLabel}>💳 Código PIX Cópia e Cola</Text>
                  <Text style={pixCodeBlock}>{pixCode}</Text>
                  <Button style={copyButton} onClick={() => navigator.clipboard.writeText(pixCode)}>
                    Copiar Código PIX
                  </Button>
                </Section>
              )}

              {boletoUrl && (
                <Section style={paymentMethodBox}>
                  <Text style={paymentMethodLabel}>📄 Boleto Bancário</Text>
                  <Link href={boletoUrl} style={boletoButton}>
                    Baixar Boleto →
                  </Link>
                </Section>
              )}
            </Section>

            {/* CTA */}
            <Text style={ctaText}>Acesse seu dashboard para mais detalhes:</Text>
            <Button style={ctaButton} href={dashboardUrl}>
              Acessar Dashboard →
            </Button>

            {/* Footer */}
            <Hr style={footerDivider} />
            <Text style={footer}>
              Esta é uma mensagem automática do sistema Tenora. Por favor, não responda este e-mail.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f9fafb',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  color: '#111827',
}

const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 16px',
}

const header = {
  textAlign: 'center' as const,
  paddingBottom: '24px',
  borderBottomWidth: 1,
  borderBottomColor: '#e5e7eb',
  borderBottomStyle: 'solid' as const,
}

const logo = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#2563eb',
  margin: '0',
}

const content = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  padding: '32px',
  marginTop: '16px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
}

const greeting = {
  fontSize: '18px',
  lineHeight: '1.5',
  marginTop: '0',
  marginBottom: '8px',
  color: '#1f2937',
}

const subtitle = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#6b7280',
  marginBottom: '24px',
}

const detailsSection = {
  backgroundColor: '#f3f4f6',
  borderRadius: '6px',
  padding: '16px',
  marginBottom: '24px',
}

const detailRow = {
  marginBottom: '8px',
}

const detailLabel = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '0',
  marginBottom: '4px',
}

const detailValue = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#1f2937',
  margin: '0',
}

const detailDivider = {
  borderTopColor: '#e5e7eb',
  borderTopStyle: 'solid' as const,
  borderTopWidth: 1,
  margin: '12px 0',
}

const paymentMethodsTitle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1f2937',
  marginTop: '24px',
  marginBottom: '12px',
}

const paymentSection = {
  marginBottom: '24px',
}

const paymentMethodBox = {
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '16px',
  marginBottom: '12px',
  backgroundColor: '#f9fafb',
}

const paymentMethodLabel = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#1f2937',
  margin: '0 0 8px 0',
}

const pixCodeBlock = {
  backgroundColor: '#ffffff',
  border: '1px dashed #d1d5db',
  borderRadius: '4px',
  padding: '12px',
  fontFamily: 'monospace',
  fontSize: '12px',
  color: '#374151',
  wordBreak: 'break-all' as const,
  margin: '8px 0',
}

const copyButton = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  padding: '8px 16px',
  borderRadius: '4px',
  textDecoration: 'none',
  fontSize: '12px',
  fontWeight: '600',
  display: 'inline-block',
}

const boletoButton = {
  backgroundColor: '#059669',
  color: '#ffffff',
  padding: '10px 16px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: '600',
  display: 'inline-block',
}

const ctaText = {
  fontSize: '14px',
  color: '#6b7280',
  marginBottom: '12px',
  margin: '16px 0 8px 0',
}

const ctaButton = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: '600',
  display: 'inline-block',
}

const footerDivider = {
  borderTopColor: '#e5e7eb',
  borderTopStyle: 'solid' as const,
  borderTopWidth: 1,
  margin: '24px 0',
}

const footer = {
  fontSize: '12px',
  color: '#9ca3af',
  marginTop: '0',
}
