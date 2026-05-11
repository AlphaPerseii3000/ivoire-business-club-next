export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 rounded-2xl border bg-card p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">Créer un compte</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Rejoins l&apos;Ivoire Business Club
          </p>
        </div>
        <form className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Nom complet
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="ton@email.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Créer mon compte
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Déjà membre ?{" "}
          <a href="/auth/signin" className="text-primary hover:underline">
            Se connecter
          </a>
        </p>
      </div>
    </div>
  );
}
