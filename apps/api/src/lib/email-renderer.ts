import { render } from '@react-email/render'
import type { ReactElement } from 'react'

/**
 * Renders a React Email component to HTML string.
 * Used for sending emails via Resend.
 */
export function renderEmail(component: ReactElement): string {
  return render(component)
}
