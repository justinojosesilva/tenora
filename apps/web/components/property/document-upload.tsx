'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { Upload, FileText, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@clerk/nextjs'

type Document = {
  id: string
  name: string
  contentType: string
  sizeBytes: number
  url: string
  createdAt: string
}

type UploadState = {
  fileId?: string
  fileName: string
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}

type Props = {
  propertyId: string
}

export function DocumentUpload({ propertyId }: Props) {
  const { getToken } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadState, setUploadState] = useState<UploadState | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchDocuments = useCallback(async () => {
    try {
      const token = await getToken()
      if (!token) return

      const response = await fetch(`/api/document/list?propertyId=${propertyId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setDocuments(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }, [propertyId, getToken])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleUpload = useCallback(
    async (file: File) => {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
      if (!validTypes.includes(file.type)) {
        setUploadState({
          fileName: file.name,
          progress: 0,
          status: 'error',
          error: 'Formato não suportado. Use PDF ou imagens (JPEG, PNG, WebP)',
        })
        return
      }

      if (file.size > 10 * 1024 * 1024) {
        setUploadState({
          fileName: file.name,
          progress: 0,
          status: 'error',
          error: 'Arquivo deve ter no máximo 10MB',
        })
        return
      }

      setUploadState({
        fileName: file.name,
        progress: 0,
        status: 'uploading',
      })

      try {
        const token = await getToken()
        if (!token) throw new Error('Não autenticado')

        // Get upload URL from API
        const getUrlResponse = await fetch('/api/document/upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            propertyId,
            filename: file.name,
            contentType: file.type,
            sizeBytes: file.size,
          }),
        })

        if (!getUrlResponse.ok) {
          const error = await getUrlResponse.json()
          throw new Error(error.error || 'Erro ao obter URL de upload')
        }

        const { uploadUrl } = await getUrlResponse.json()

        // Upload file to R2
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              setUploadState((prev) =>
                prev ? { ...prev, progress: Math.round((e.loaded / e.total) * 100) } : null,
              )
            }
          })

          xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
              resolve()
            } else {
              reject(new Error(`Upload falhou com status ${xhr.status}`))
            }
          })

          xhr.addEventListener('error', () => {
            reject(new Error('Erro na conexão durante upload'))
          })

          xhr.open('PUT', uploadUrl, true)
          xhr.setRequestHeader('Content-Type', file.type)
          xhr.send(file)
        })

        setUploadState({
          fileName: file.name,
          progress: 100,
          status: 'success',
        })

        await fetchDocuments()

        setTimeout(() => {
          setUploadState(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        }, 2000)
      } catch (error) {
        setUploadState((prev) =>
          prev
            ? {
                ...prev,
                status: 'error',
                error: error instanceof Error ? error.message : 'Erro ao fazer upload do arquivo',
              }
            : null,
        )
      }
    },
    [propertyId, getToken, fetchDocuments],
  )

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files?.[0]) {
      handleUpload(files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files?.[0]) {
      handleUpload(files[0])
    }
  }

  const handleDelete = async (documentId: string) => {
    setIsDeleting(true)
    try {
      const token = await getToken()
      if (!token) throw new Error('Não autenticado')

      const response = await fetch('/api/document/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ documentId }),
      })

      if (response.ok) {
        await fetchDocuments()
      } else {
        const error = await response.json()
        console.error('Erro ao deletar documento:', error)
      }
    } catch (error) {
      console.error('Erro ao deletar documento:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {!uploadState || uploadState.status === 'error' ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/30 hover:border-primary/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleChange}
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
          />
          <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Arraste arquivos ou clique para selecionar</p>
          <p className="mt-1 text-xs text-muted-foreground">PDF ou imagens (máx. 10MB)</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => fileInputRef.current?.click()}
          >
            Selecionar arquivo
          </Button>
        </div>
      ) : null}

      {/* Upload Progress */}
      {uploadState && uploadState.status === 'uploading' && (
        <div className="rounded-lg border bg-muted/40 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{uploadState.fileName}</p>
            <span className="text-sm font-semibold text-muted-foreground">
              {uploadState.progress}%
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Success */}
      {uploadState && uploadState.status === 'success' && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-green-900">{uploadState.fileName}</p>
            <p className="text-xs text-green-700">Upload concluído com sucesso</p>
          </div>
        </div>
      )}

      {/* Upload Error */}
      {uploadState && uploadState.status === 'error' && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-red-900">{uploadState.fileName}</p>
            <p className="mt-0.5 text-xs text-red-700">{uploadState.error}</p>
          </div>
        </div>
      )}

      {/* Documents List */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Documentos enviados</h4>
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm font-medium text-primary hover:underline"
                    >
                      {doc.name}
                    </a>
                    <p className="text-xs text-muted-foreground">
                      {(doc.sizeBytes / 1024).toFixed(1)} KB •{' '}
                      {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(doc.id)}
                  disabled={isDeleting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!uploadState && documents.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">Nenhum documento enviado ainda</p>
      )}
    </div>
  )
}
