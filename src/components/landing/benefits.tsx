export function Benefits() {
  const items = [
    "Accès à des opportunités concrètes",
    "Un réseau qualifié",
    "Des mises en relation ciblées",
    "Des événements business exclusifs",
  ];
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 text-center">
        <h2 className="text-3xl font-bold">Ce que tu obtiens</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item} className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow">
              <p className="text-lg font-semibold">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
