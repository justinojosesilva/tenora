import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'Tenora — Gestão Patrimonial',
  description: 'Plataforma de gestão para imobiliárias',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html
        lang="pt-BR"
        className={cn('font-sans antialiased', geistSans.variable, geistMono.variable)}
      >
        <body className="bg-background text-foreground">{children}</body>
      </html>
    </ClerkProvider>
  )
}
