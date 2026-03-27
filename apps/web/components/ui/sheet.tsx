'use client'

import { Dialog } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

function SheetRoot(props: Dialog.Root.Props) {
  return <Dialog.Root {...props} />
}

function SheetTrigger(props: Dialog.Trigger.Props) {
  return <Dialog.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ className, ...props }: Dialog.Close.Props) {
  return (
    <Dialog.Close
      data-slot="sheet-close"
      className={cn(
        'rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
        className,
      )}
      {...props}
    />
  )
}

function SheetPortal(props: Dialog.Portal.Props) {
  return <Dialog.Portal {...props} />
}

function SheetBackdrop({ className, ...props }: Dialog.Backdrop.Props) {
  return (
    <Dialog.Backdrop
      data-slot="sheet-backdrop"
      className={cn(
        'fixed inset-0 z-40 bg-black/50',
        'transition-opacity duration-200',
        'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
        className,
      )}
      {...props}
    />
  )
}

function SheetContent({ className, ...props }: Dialog.Popup.Props) {
  return (
    <Dialog.Popup
      data-slot="sheet-content"
      className={cn(
        'fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-background shadow-xl outline-none',
        'transition-transform duration-300 ease-in-out',
        'data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full',
        className,
      )}
      {...props}
    />
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex items-center justify-between gap-3 border-b px-5 py-4', className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: Dialog.Title.Props) {
  return (
    <Dialog.Title
      data-slot="sheet-title"
      className={cn('font-semibold leading-tight', className)}
      {...props}
    />
  )
}

function SheetCloseButton({ className }: { className?: string }) {
  return (
    <SheetClose className={className}>
      <X className="h-4 w-4" />
      <span className="sr-only">Fechar</span>
    </SheetClose>
  )
}

export const Sheet = {
  Root: SheetRoot,
  Trigger: SheetTrigger,
  Close: SheetClose,
  CloseButton: SheetCloseButton,
  Portal: SheetPortal,
  Backdrop: SheetBackdrop,
  Content: SheetContent,
  Header: SheetHeader,
  Title: SheetTitle,
}
