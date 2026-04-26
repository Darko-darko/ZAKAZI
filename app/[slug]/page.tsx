import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PublicProviderPageProps = {
  params: Promise<{ slug: string }>;
};

function formatPrice(price: number | null) {
  if (price === null) {
    return "Cena po dogovoru";
  }

  return `${price.toLocaleString("sr-RS")} RSD`;
}

export default async function PublicProviderPage({
  params,
}: PublicProviderPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: providers } = await supabase.rpc("get_public_provider", {
    p_slug: slug,
  });
  const provider = providers?.[0];

  if (!provider) {
    notFound();
  }

  const [{ data: services }, { data: workers }, { data: gallery }] =
    await Promise.all([
      supabase.rpc("get_public_services", { p_provider_id: provider.id }),
      supabase.rpc("get_public_workers", { p_provider_id: provider.id }),
      supabase.rpc("get_public_provider_gallery", {
        p_provider_id: provider.id,
      }),
    ]);

  const heroImage = provider.cover_url ?? gallery?.[0]?.image_url ?? null;

  return (
    <main className="flex-1 bg-background">
      <section className="relative min-h-[72svh] overflow-hidden bg-primary text-primary-foreground">
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative mx-auto flex min-h-[72svh] w-full max-w-5xl flex-col justify-end px-5 pb-7 pt-20 sm:px-8">
          {provider.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={provider.logo_url}
              alt=""
              className="mb-5 size-16 rounded-md border border-white/30 bg-white object-cover"
            />
          ) : null}
          <p className="text-sm font-medium uppercase tracking-wide opacity-85">
            Online zakazivanje
          </p>
          <h1 className="mt-2 max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl">
            {provider.name}
          </h1>
          {provider.intro_text || provider.description ? (
            <p className="mt-4 max-w-2xl text-base leading-7 opacity-90 sm:text-lg">
              {provider.intro_text ?? provider.description}
            </p>
          ) : null}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/${provider.slug}/book`}
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-white px-5 font-semibold text-black transition hover:bg-white/90"
            >
              Zakaži termin
            </Link>
            {provider.phone ? (
              <a
                href={`tel:${provider.phone}`}
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/40 px-5 font-semibold text-white transition hover:bg-white/10"
              >
                Pozovi
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Usluge
            </h2>
            <div className="mt-4 divide-y divide-border rounded-md border border-border bg-card">
              {services?.length ? (
                services.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-start justify-between gap-4 p-4"
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        {service.name}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {service.duration_minutes} min
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-foreground">
                      {formatPrice(service.price)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="p-4 text-sm text-muted-foreground">
                  Usluge još nisu objavljene.
                </p>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-md border border-border bg-card p-4">
              <h2 className="font-semibold text-foreground">Kontakt</h2>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                {provider.address || provider.city ? (
                  <p>
                    {[provider.address, provider.city]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                ) : null}
                {provider.phone ? <p>{provider.phone}</p> : null}
              </div>
            </div>
            <div className="rounded-md border border-border bg-card p-4">
              <h2 className="font-semibold text-foreground">Tim</h2>
              <div className="mt-3 space-y-3">
                {workers?.length ? (
                  workers.slice(0, 4).map((worker) => (
                    <div key={worker.id} className="flex items-center gap-3">
                      {worker.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={worker.photo_url}
                          alt=""
                          className="size-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="size-10 rounded-full bg-muted" />
                      )}
                      <p className="text-sm font-medium text-foreground">
                        {worker.name}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Tim još nije objavljen.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
