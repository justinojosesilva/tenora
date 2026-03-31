'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@clerk/nextjs'

type Props = {
  initialName: string
  initialCnpj: string | null
  initialLogo: string | null
  initialContactEmail: string | null
}

export function GeneralTab({ initialName, initialCnpj, initialLogo, initialContactEmail }: Props) {
  const { getToken } = useAuth()
  const [name, setName] = useState(initialName)
  const [cnpj, setCnpj] = useState(initialCnpj || '')
  const [contactEmail, setContactEmail] = useState(initialContactEmail || '')
  const [logoPreview, setLogoPreview] = useState(initialLogo || '')
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const token = await getToken()
      if (!token) throw new Error('Não autenticado')

      const response = await fetch(`${apiUrl}/trpc/settings.updateTenantSettings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          json: {
            name,
            cnpj: cnpj || undefined,
            contactEmail: contactEmail || undefined,
            logo: logoPreview || undefined,
          },
        }),
      })

      if (!response.ok) throw new Error('Erro ao salvar')
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      alert('Erro ao salvar configurações')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Arquivo deve ter no máximo 5MB')
      return
    }

    // For now, create a preview URL. In production, upload to R2
    const reader = new FileReader()
    reader.onload = (e) => {
      const preview = e.target?.result as string
      setLogoPreview(preview)
      // TODO: Upload to R2 via API endpoint
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações Gerais</CardTitle>
          <CardDescription>Gerencie as informações básicas da sua imobiliária</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div className="space-y-2">
            <Label>Logo da Imobiliária</Label>
            <div className="flex items-end gap-4">
              {logoPreview && (
                <Image
                  src={logoPreview}
                  alt="Logo preview"
                  width={64}
                  height={64}
                  className="rounded-lg object-cover border"
                />
              )}
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Carregar logo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleLogoUpload(file)
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Formatos suportados: JPG, PNG, WebP. Tamanho máximo: 5MB
            </p>
          </div>

          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="company-name">Nome da Imobiliária</Label>
            <Input
              id="company-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Imobiliária São Paulo"
            />
          </div>

          {/* CNPJ */}
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="XX.XXX.XXX/XXXX-XX"
            />
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <Label htmlFor="contact-email">Email de Contato</Label>
            <Input
              id="contact-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="contato@imobiliaria.com"
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar alterações'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
