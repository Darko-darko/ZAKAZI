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

function getFontClass(fontChoice: string | null) {
  if (fontChoice === "serif") {
    return "font-serif";
  }

  if (fontChoice === "elegant") {
    return "font-serif";
  }

  return "font-sans";
}

function getThemeClasses(siteTheme: string | null) {
  if (siteTheme === "dark") {
    return {
      page: "bg-neutral-950 text-neutral-50",
      card: "border-neutral-800 bg-neutral-900 text-neutral-50",
      heading: "text-neutral-50",
      muted: "text-neutral-300",
      border: "divide-neutral-800 border-neutral-800",
      avatar: "bg-neutral-800",
    };
  }

  if (siteTheme === "light") {
    return {
      page: "bg-sky-50 text-slate-950",
      card: "border-sky-100 bg-white text-slate-950 shadow-sm",
      heading: "text-slate-950",
      muted: "text-slate-600",
      border: "divide-sky-100 border-sky-100",
      avatar: "bg-sky-100",
    };
  }

  return {
    page: "bg-background text-foreground",
    card: "border-border bg-card text-foreground",
    heading: "text-foreground",
    muted: "text-muted-foreground",
    border: "divide-border border-border",
    avatar: "bg-muted",
  };
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
  const heroText = provider.intro_text;
  const theme = getThemeClasses(provider.site_theme);

  return (
    <main
      className={`flex-1 bg-background ${getFontClass(provider.font_choice)}`}
    >
      <section
        className="relative min-h-[72svh] overflow-hidden"
        style={{
          backgroundColor: provider.primary_color,
          color: provider.text_color,
        }}
      >
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        {heroImage ? <div className="absolute inset-0 bg-black/45" /> : null}
        <div className="relative mx-auto flex min-h-[72svh] w-full max-w-5xl flex-col justify-end px-4 pb-6 pt-16 sm:px-8 sm:pb-7 sm:pt-20">
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
          <h1 className="mt-2 max-w-2xl break-words text-[clamp(2rem,12vw,3.75rem)] font-bold leading-tight tracking-tight">
            {provider.name}
          </h1>
          {heroText ? (
            <p className="mt-4 max-w-2xl text-base leading-7 opacity-90 sm:text-lg">
              {heroText}
            </p>
          ) : null}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/${provider.slug}/book`}
              className="inline-flex min-h-12 items-center justify-center rounded-md px-5 font-semibold transition hover:opacity-90"
              style={{
                backgroundColor: provider.text_color,
                color: provider.primary_color,
              }}
            >
              Zakaži termin
            </Link>
            {provider.phone ? (
              <a
                href={`tel:${provider.phone}`}
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-current px-5 font-semibold transition hover:bg-white/10"
              >
                Pozovi
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className={theme.page}>
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
        {provider.description ? (
          <div className={`mb-8 rounded-md border p-5 sm:p-6 ${theme.card}`}>
            <p
              className={`whitespace-pre-line break-words text-base leading-7 ${theme.muted}`}
            >
              {provider.description}
            </p>
          </div>
        ) : null}

          <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
          <div>
            <h2 className={`text-2xl font-bold tracking-tight ${theme.heading}`}>
              Usluge
            </h2>
            <div
              className={`mt-4 divide-y rounded-md border ${theme.card} ${theme.border}`}
            >
              {services?.length ? (
                services.map((service) => (
                  <div
                    key={service.id}
                    className="flex flex-col gap-2 p-4 min-[380px]:flex-row min-[380px]:items-start min-[380px]:justify-between min-[380px]:gap-4"
                  >
                    <div>
                      <p className={`font-semibold ${theme.heading}`}>
                        {service.name}
                      </p>
                      <p className={`mt-1 text-sm ${theme.muted}`}>
                        {service.duration_minutes} min
                      </p>
                    </div>
                    <p
                      className={`text-sm font-semibold min-[380px]:shrink-0 ${theme.heading}`}
                    >
                      {formatPrice(service.price)}
                    </p>
                  </div>
                ))
              ) : (
                <p className={`p-4 text-sm ${theme.muted}`}>
                  Usluge još nisu objavljene.
                </p>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className={`rounded-md border p-4 ${theme.card}`}>
              <h2 className={`font-semibold ${theme.heading}`}>Tim</h2>
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
                        <div className={`size-10 rounded-full ${theme.avatar}`} />
                      )}
                      <p className={`text-sm font-medium ${theme.heading}`}>
                        {worker.name}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className={`text-sm ${theme.muted}`}>
                    Tim još nije objavljen.
                  </p>
                )}
              </div>
            </div>
            <div className={`rounded-md border p-4 ${theme.card}`}>
              <h2 className={`font-semibold ${theme.heading}`}>Kontakt</h2>
              <div className={`mt-3 space-y-2 text-sm ${theme.muted}`}>
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
          </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
