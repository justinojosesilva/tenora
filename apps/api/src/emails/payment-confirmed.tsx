import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Row,
  Section,
  Text,
} from '@react-email/components'

export interface PaymentConfirmedEmailProps {
  tenantName: string
  propertyAddress: string
  amount: string
  paidDate: string
  reference: string
  dashboardUrl: string
}

export function PaymentConfirmedEmail({
  tenantName,
  propertyAddress,
  amount,
  paidDate,
  reference,
  dashboardUrl,
}: PaymentConfirmedEmailProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header with Tenora logo */}
          <Section style={header}>
            <Text style={logo}>✅ TENORA</Text>
          </Section>

          {/* Main content */}
          <Section style={content}>
            <Text style={greeting}>
              Olá, <strong>{tenantName}</strong>!
            </Text>

            <Text style={subtitle}>Seu pagamento foi confirmado com sucesso!</Text>

            {/* Success badge */}
            <Section style={successBadge}>
              <Text style={badgeText}>✓ PAGAMENTO CONFIRMADO</Text>
            </Section>

            {/* Payment details table */}
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
                <Text style={detailLabel}>Valor Pago</Text>
                <Text style={{ ...detailValue, color: '#059669', fontWeight: 'bold' }}>
                  R$ {amount}
                </Text>
              </Row>
              <Hr style={detailDivider} />
              <Row style={detailRow}>
                <Text style={detailLabel}>Data do Pagamento</Text>
                <Text style={detailValue}>{paidDate}</Text>
              </Row>
            </Section>

            {/* Additional info */}
            <Section style={infoSection}>
              <Text style={infoText}>
                Seu pagamento foi processado com sucesso e será creditado conforme o seu contrato.
              </Text>
            </Section>

            {/* CTA */}
            <Text style={ctaText}>Acesse seu dashboard para conferir o histórico:</Text>
            <Button style={ctaButton} href={dashboardUrl}>
              Ver Histórico de Pagamentos →
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
  color: '#059669',
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

const successBadge = {
  backgroundColor: '#d1fae5',
  border: '1px solid #a7f3d0',
  borderRadius: '6px',
  padding: '12px 16px',
  marginBottom: '24px',
  textAlign: 'center' as const,
}

const badgeText = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#059669',
  margin: '0',
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

const infoSection = {
  backgroundColor: '#f0f9ff',
  borderRadius: '6px',
  padding: '16px',
  marginBottom: '24px',
  borderLeftWidth: 4,
  borderLeftColor: '#2563eb',
  borderLeftStyle: 'solid' as const,
}

const infoText = {
  fontSize: '13px',
  color: '#1e40af',
  margin: '0',
  lineHeight: '1.6',
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
