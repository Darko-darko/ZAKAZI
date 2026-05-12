import Link from "next/link";

const benefits = [
  {
    title: "Manje prekida tokom rada",
    text: "Klijenti biraju slobodan termin sami, dok ti i tim radite bez stalnih poziva i poruka.",
  },
  {
    title: "Jedan uredan raspored",
    text: "Usluge, radnici, smene i termini su na jednom mestu, spremni za salon, studio ili ordinaciju.",
  },
  {
    title: "Stranica koja prodaje",
    text: "Svaki biznis dobija javnu stranicu sa opisom, kontaktom i jasnim putem do zakazivanja.",
  },
];

const steps = [
  "Uneses osnovne podatke, radnike i usluge.",
  "Podelis svoj zakazi.pro link klijentima.",
  "Klijenti zakazuju termin 24/7, bez naloga.",
];

const miniSiteServices = [
  { name: "Tretman lica", duration: "45 min", price: "3.200 RSD" },
  { name: "Relaks masaza", duration: "60 min", price: "4.000 RSD" },
  { name: "Konsultacije", duration: "20 min", price: "0 RSD" },
];

const plans = [
  {
    name: "Trial",
    price: "0 RSD / 30 dana",
    note: "Za probu, podesavanje naloga i prve online termine",
    features: ["Stranica za zakazivanje", "Online booking", "Osnovni raspored"],
  },
  {
    name: "Standard",
    price: "2.990 RSD",
    note: "Za salone i studije koji zele stabilan online booking bez komplikovanja",
    features: ["Vise radnika", "Usluge i smene", "Email obavestenja"],
  },
];

export default function HomePage() {
  return (
    <main className="flex-1 bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <span className="h-3 w-3 rounded-full bg-brand" />
            <span>zakazi.pro</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/login"
              className="rounded-md px-3 py-2 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
            >
              Prijava
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-brand px-4 py-2 font-medium text-brand-foreground transition hover:opacity-90"
            >
              Probaj besplatno
            </Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-border bg-brand-soft">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 sm:px-6 sm:py-18 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <p className="mb-4 w-fit rounded-full border border-brand bg-background px-3 py-1 text-sm font-medium text-brand">
              Napravljeno za usluzne biznise u Srbiji
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              Online zakazivanje za salone, studije i ordinacije
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              zakazi.pro daje tvom biznisu profesionalnu stranicu za
              zakazivanje i booking tok. Klijenti biraju uslugu, radnika i
              slobodan termin bez poziva, cekanja i dopisivanja.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-md bg-brand px-6 py-3 font-medium text-brand-foreground transition hover:opacity-90"
              >
                Pokreni svoj booking
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md border-2 border-brand px-6 py-3 font-medium text-foreground transition hover:bg-background"
              >
                Vec imam nalog
              </Link>
            </div>
            <div className="mt-8 grid gap-4 text-sm text-muted-foreground sm:grid-cols-3">
              <div>
                <strong className="block text-2xl text-brand">24/7</strong>
                zakazivanje termina
              </div>
              <div>
                <strong className="block text-2xl text-brand">Bez naloga</strong>
                za tvoje klijente
              </div>
              <div>
                <strong className="block text-2xl text-brand">RSD</strong>
                spremno za lokalno poslovanje
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="rounded-md border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Stranica za zakazivanje</p>
                  <h2 className="mt-1 text-2xl font-semibold">Studio Aurora</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Kozmeticki tretmani i masaze, Novi Sad
                  </p>
                </div>
                <span className="rounded-full bg-warm-soft px-3 py-1 text-xs font-medium text-warm-foreground">
                  zakazi.pro/aurora
                </span>
              </div>

              <div className="grid gap-3 py-5 sm:grid-cols-3">
                {["Tretman lica", "Masaza", "Konsultacije"].map((service) => (
                  <div
                    key={service}
                    className="rounded-md border border-border bg-brand-soft p-3"
                  >
                    <p className="text-sm font-medium">{service}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      od 30 min
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-md border border-border">
                <div className="border-b border-border p-4">
                  <p className="text-sm font-medium">Izaberi termin</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Danas, 27. april
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
                  {["09:00", "10:30", "12:00", "15:30"].map((time, index) => (
                    <div
                      key={time}
                      className={
                        index === 1
                          ? "rounded-md bg-brand px-3 py-2 text-center text-sm font-medium text-brand-foreground"
                          : "rounded-md border border-border px-3 py-2 text-center text-sm"
                      }
                    >
                      {time}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-md bg-warm-soft p-4 text-sm text-warm-foreground">
                <p className="font-medium">Potvrda termina</p>
                <p className="mt-1 text-muted-foreground">
                  Klijent ostavlja ime i telefon. Biznis dobija uredan termin u
                  rasporedu.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase text-muted-foreground">
            Za vlasnika
          </p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            Vise zakazanih termina, manje administracije
          </h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {benefits.map((benefit) => (
            <article
              key={benefit.title}
              className="rounded-lg border border-border bg-card p-5 shadow-sm"
            >
              <span className="mb-4 block h-1 w-12 rounded-full bg-warm" />
              <h3 className="text-lg font-semibold">{benefit.title}</h3>
              <p className="mt-3 leading-7 text-muted-foreground">
                {benefit.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-brand-soft">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase text-brand">
              Primer stranice za zakazivanje
            </p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Stranica koju mozes odmah da posaljes klijentima
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Stranica za zakazivanje prikazuje sta radis, gde se nalazis i
              koji termini su slobodni. Klijent ne mora da instalira aplikaciju
              niti da pravi nalog.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
            <div className="overflow-hidden rounded-md border border-border">
              <div className="bg-brand p-5 text-brand-foreground">
                <p className="text-sm opacity-90">Salon, studio ili ordinacija</p>
                <h3 className="mt-2 text-2xl font-semibold">Aurora Beauty Studio</h3>
                <p className="mt-2 text-sm opacity-90">
                  Cara Dusana 18, Novi Sad • pon-sub 09-20h
                </p>
              </div>

              <div className="grid gap-0 md:grid-cols-[1fr_0.85fr]">
                <div className="p-5">
                  <p className="text-sm font-semibold text-brand">Usluge</p>
                  <div className="mt-4 grid gap-3">
                    {miniSiteServices.map((service) => (
                      <div
                        key={service.name}
                        className="flex items-center justify-between gap-4 rounded-md border border-border p-3"
                      >
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {service.duration}
                          </p>
                        </div>
                        <p className="text-sm font-semibold">{service.price}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border bg-muted p-5 md:border-l md:border-t-0">
                  <p className="text-sm font-semibold text-brand">
                    Slobodni termini
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {["09:30", "11:00", "13:30", "17:00"].map((time) => (
                      <span
                        key={time}
                        className="rounded-md bg-background px-3 py-2 text-center text-sm font-medium"
                      >
                        {time}
                      </span>
                    ))}
                  </div>
                  <button className="mt-4 w-full rounded-md bg-brand px-4 py-3 font-medium text-brand-foreground">
                    Zakazi termin
                  </button>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Potvrda stize klijentu i vlasniku.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-muted">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-14 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase text-muted-foreground">
              Kako radi
            </p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Od prazne stranice do prvog online termina
            </h2>
          </div>
          <div className="grid gap-4">
            {steps.map((step, index) => (
              <div
                key={step}
                className="flex gap-4 rounded-lg border border-border bg-background p-5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand text-sm font-semibold text-brand-foreground">
                  {index + 1}
                </span>
                <p className="pt-1 text-lg font-medium">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase text-muted-foreground">
              Planovi
            </p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Kreni jednostavno, nadogradi kad poraste potraznja
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            Svaki nalog krece sa 30 dana probnog perioda za 0 RSD. Posle toga
            nastavljas sa Standard planom za svakodnevni rad.
          </p>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className="rounded-lg border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {plan.note}
                  </p>
                </div>
                <p className="rounded-md bg-warm-soft px-3 py-1 text-sm font-semibold text-warm-foreground">
                  {plan.price}
                </p>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-brand-soft">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-5 py-12 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div>
            <h2 className="text-3xl font-bold">
              Spreman za prvi online termin?
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Postavi osnovne podatke i podeli link klijentima. Bez velikog
              sistema, bez komplikovanja.
            </p>
          </div>
          <Link
            href="/register"
            className="inline-flex w-full items-center justify-center rounded-md bg-brand px-6 py-3 font-medium text-brand-foreground transition hover:opacity-90 sm:w-auto"
          >
            Registruj nalog
          </Link>
        </div>
      </section>
    </main>
  );
}
