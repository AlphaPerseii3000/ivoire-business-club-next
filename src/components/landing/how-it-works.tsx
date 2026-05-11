export function HowItWorks() {
  const steps = [
    { num: "1", title: "Tu rejoins le club", desc: "Accède à une communauté engagée et orientée business." },
    { num: "2", title: "Tu accèdes aux opportunités", desc: "Projets, partenaires, investissements, clients." },
    { num: "3", title: "Tu passes à l'action", desc: "Mises en relation, deals, collaborations concrètes." },
  ];

  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-center text-3xl font-bold">Comment ça marche ?</h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.num} className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                {s.num}
              </div>
              <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
