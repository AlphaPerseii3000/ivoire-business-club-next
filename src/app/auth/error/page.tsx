export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-8 shadow-lg text-center">
        <h1 className="text-2xl font-bold text-destructive">Erreur d&apos;authentification</h1>
        <p className="text-muted-foreground">
          Une erreur est survenue lors de la connexion. Veuillez réessayer.
        </p>
        <a
          href="/auth/signin"
          className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Retour à la connexion
        </a>
      </div>
    </div>
  );
}
