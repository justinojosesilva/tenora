'use client'

import { useEffect, useRef, useState, useActionState } from 'react'
import { Check, ChevronDown, Loader2, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createOwnerAction } from '@/app/(dashboard)/proprietarios/actions'
import type { FormOwner } from './property-form'

function maskCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').substring(0, 14)
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

type Props = {
  name: string
  initialValue?: string
  initialOwners: FormOwner[]
  disabled?: boolean
}

export function OwnerCombobox({ name, initialValue = '', initialOwners, disabled }: Props) {
  const [owners, setOwners] = useState<FormOwner[]>(initialOwners)
  const [value, setValue] = useState(initialValue)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [cpfCnpj, setCpfCnpj] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const [createState, createFormAction, isCreating] = useActionState(createOwnerAction, null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowCreate(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus search when dropdown opens
  useEffect(() => {
    if (open && !showCreate) {
      setTimeout(() => searchRef.current?.focus(), 0)
    }
  }, [open, showCreate])

  // Handle inline creation success
  useEffect(() => {
    if (createState?.success && createState.ownerId && createState.ownerName) {
      const newOwner = { id: createState.ownerId, name: createState.ownerName }
      setOwners((prev) => [...prev, newOwner].sort((a, b) => a.name.localeCompare(b.name)))
      setValue(createState.ownerId)
      setOpen(false)
      setShowCreate(false)
      setSearch('')
      setCpfCnpj('')
    }
  }, [createState?.success]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = owners.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))

  const selectedOwner = owners.find((o) => o.id === value)

  const handleSelect = (id: string) => {
    setValue(id)
    setOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setValue('')
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={value} />

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'ring-2 ring-ring',
        )}
      >
        <span className={selectedOwner ? 'text-foreground' : 'text-muted-foreground'}>
          {selectedOwner ? selectedOwner.name : 'Selecionar proprietário'}
        </span>
        <div className="flex items-center gap-1">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)}
              className="rounded p-0.5 hover:bg-muted"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              open && 'rotate-180',
            )}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-md border bg-popover shadow-md">
          {/* Search input */}
          <div className="border-b p-2">
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar proprietário..."
              className="h-8 text-sm"
            />
          </div>

          {/* Owner list */}
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {search ? 'Nenhum resultado' : 'Nenhum proprietário cadastrado'}
              </p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => handleSelect(o.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <Check
                    className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      value === o.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="truncate">{o.name}</span>
                </button>
              ))
            )}
          </div>

          {/* Create section */}
          <div className="border-t">
            {!showCreate ? (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex w-full items-center gap-2 rounded-b-md px-3 py-2.5 text-sm text-primary hover:bg-muted"
              >
                <Plus className="h-3.5 w-3.5" />
                Criar novo proprietário
              </button>
            ) : (
              <form action={createFormAction} className="space-y-2 p-3">
                <p className="text-xs font-medium text-muted-foreground">Novo proprietário</p>

                <Input name="name" placeholder="Nome completo *" className="h-8 text-sm" required />

                <div className="relative">
                  <Input
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(maskCpfCnpj(e.target.value))}
                    placeholder="CPF ou CNPJ *"
                    inputMode="numeric"
                    className="h-8 text-sm"
                    required
                  />
                  <input type="hidden" name="cpfCnpj" value={cpfCnpj} />
                </div>

                {createState?.error && (
                  <p className="text-xs text-destructive">{createState.error}</p>
                )}
                {createState?.fieldErrors?.cpfCnpj && (
                  <p className="text-xs text-destructive">{createState.fieldErrors.cpfCnpj[0]}</p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      setShowCreate(false)
                      setCpfCnpj('')
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" size="xs" disabled={isCreating}>
                    {isCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Criar'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
