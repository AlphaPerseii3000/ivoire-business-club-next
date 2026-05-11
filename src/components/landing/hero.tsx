export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-secondary/10 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Bâtir son futur en{" "}
          <span className="bg-gradient-to-r from-primary to-ibc-gold-light bg-clip-text text-transparent">
            Afrique
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Avec l&apos;Ivoire Business Club, accède aux meilleures opportunités business en Côte d&apos;Ivoire.
          Le réseau de référence pour investir, entreprendre ou développer ton activité.
        </p>
        <p className="mt-4 text-xl font-semibold text-primary">
          &ldquo;Investir ou entreprendre ne s&apos;improvise pas&rdquo;
        </p>
        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <a
            href="/pricing"
            className="rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
          >
            Rejoins le club
          </a>
          <a
            href="#mission"
            className="rounded-lg border px-8 py-3 text-lg font-semibold hover:bg-muted transition-colors"
          >
            En savoir plus
          </a>
        </div>
      </div>
    </section>
  );
}
