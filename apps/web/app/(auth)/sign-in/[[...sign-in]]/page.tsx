import { SignIn } from '@clerk/nextjs'

export const metadata = { title: 'Entrar — Tenora' }

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Tenora</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestão Patrimonial</p>
        </div>

        <SignIn
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'w-full shadow-lg rounded-xl border border-border',
              headerTitle: 'text-foreground',
              headerSubtitle: 'text-muted-foreground',
              socialButtonsBlockButton: 'border border-border text-foreground hover:bg-accent',
              formButtonPrimary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
              footerActionLink: 'text-primary hover:text-primary/80',
            },
          }}
          forceRedirectUrl="/dashboard"
          signUpUrl="/sign-up"
        />

        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Tenora Tecnologia e Gestão Patrimonial
        </p>
      </div>
    </main>
  )
}
