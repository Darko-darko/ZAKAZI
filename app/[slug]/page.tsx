import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicProviderBySlug } from "@/lib/providers/public";
import {
  getProviderStatusLabel,
  getSiteFontClass,
  isProviderBookableStatus,
} from "@/lib/providers/site";

type PublicProviderPageProps = {
  params: Promise<{ slug: string }>;
};

function formatPrice(price: number | null) {
  if (price === null) {
    return "Cena po dogovoru";
  }

  return `${price.toLocaleString("sr-RS")} RSD`;
}

function getThemeClasses(siteTheme: string | null) {
  if (siteTheme === "dark") {
    return {
      page: "bg-foreground text-background",
      card: "border-background/10 bg-foreground text-background shadow-sm shadow-black/20",
      feature: "border-background/10 bg-background/5",
      heading: "text-background",
      muted: "text-background/75",
      border: "divide-background/10 border-background/10",
      avatar: "bg-background/10 text-background/80",
      badge: "bg-background/10 text-background",
      buttonGhost: "border-background/15 bg-background/10 text-background",
    };
  }

  if (siteTheme === "light") {
    return {
      page: "bg-brand-soft/40 text-foreground",
      card: "border-border/70 bg-background/95 text-foreground shadow-sm shadow-brand/5",
      feature: "border-brand/10 bg-background/80",
      heading: "text-foreground",
      muted: "text-muted-foreground",
      border: "divide-border/70 border-border/70",
      avatar: "bg-warm-soft text-foreground",
      badge: "bg-brand-soft text-brand",
      buttonGhost: "border-border/70 bg-background/75 text-foreground",
    };
  }

  return {
    page: "bg-background text-foreground",
    card: "border-border/80 bg-card text-foreground shadow-sm shadow-black/5",
    feature: "border-border/70 bg-background/85",
    heading: "text-foreground",
    muted: "text-muted-foreground",
    border: "divide-border/70 border-border/70",
    avatar: "bg-brand-soft text-brand",
    badge: "bg-brand-soft text-brand",
    buttonGhost: "border-border/70 bg-background/75 text-foreground",
  };
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function normalizeCoverFocalY(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 50;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizeCoverFocalX(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 50;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function todayInBelgrade() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Belgrade",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("sr-Latn-RS", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Belgrade",
  }).format(new Date(`${value}T12:00:00+01:00`));
}

function formatDateRange(dateFrom: string, dateTo: string) {
  if (dateFrom === dateTo) {
    return formatDate(dateFrom);
  }

  return `${formatDate(dateFrom)} - ${formatDate(dateTo)}`;
}

export default async function PublicProviderPage({
  params,
}: PublicProviderPageProps) {
  const { slug } = await params;
  const provider = await getPublicProviderBySlug(slug);

  if (!provider) {
    notFound();
  }

  const adminSupabase = createAdminClient();
  const bookingAvailable = isProviderBookableStatus(provider.plan_status);
  const [
    { data: services },
    { data: workers },
    { data: gallery },
    { data: nonWorkingDays },
  ] = await Promise.all([
    adminSupabase
      .from("services")
      .select("id, name, duration_minutes, price, sort_order")
      .eq("provider_id", provider.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    adminSupabase
      .from("workers")
      .select("id, name, photo_url, bio")
      .eq("provider_id", provider.id)
      .eq("is_active", true)
      .is("archived_at", null)
      .order("created_at", { ascending: true })
      .order("name", { ascending: true }),
    adminSupabase
      .from("provider_gallery")
      .select("id, image_url, sort_order")
      .eq("provider_id", provider.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    adminSupabase
      .from("time_off")
      .select("id, date_from, date_to, reason, is_public_holiday")
      .eq("provider_id", provider.id)
      .is("worker_id", null)
      .gte("date_to", todayInBelgrade())
      .order("date_from", { ascending: true })
      .limit(6),
  ]);

  const heroImage = provider.cover_url ?? gallery?.[0]?.image_url ?? null;
  const galleryImages = (gallery ?? []).slice(0, 6);
  const heroText = provider.intro_text;
  const theme = getThemeClasses(provider.site_theme);
  const coverFocalX = normalizeCoverFocalX(provider.cover_focal_x);
  const coverFocalY = normalizeCoverFocalY(provider.cover_focal_y);
  const bookingUnavailableMessage = bookingAvailable
    ? null
    : `Online zakazivanje trenutno nije dostupno jer je nalog ${getProviderStatusLabel(provider.plan_status)}.`;

  if (!bookingAvailable) {
    const location = [provider.address, provider.city].filter(Boolean).join(", ");

    return (
      <main
        className={`flex-1 bg-background ${getSiteFontClass(provider.font_choice)}`}
      >
        <section
          className="relative overflow-hidden"
          style={{
            backgroundColor: provider.primary_color,
            color: provider.text_color,
          }}
        >
          {heroImage ? (
            <Image
              src={heroImage}
              alt=""
              fill
              priority
              quality={82}
              sizes="100vw"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: `${coverFocalX}% ${coverFocalY}%` }}
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/22 to-black/58" />

          <div className="relative mx-auto w-full max-w-6xl px-4 pb-10 pt-20 sm:px-8 sm:pb-12 sm:pt-24">
            <div className="max-w-3xl rounded-[1.75rem] border border-white/15 bg-black/28 p-5 shadow-sm shadow-black/25 sm:p-7">
              {provider.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={provider.logo_url}
                  alt=""
                  className="mb-5 size-16 rounded-2xl border border-white/25 bg-white object-cover shadow-sm shadow-black/20"
                />
              ) : null}
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/74">
                Online zakazivanje
              </p>
              <h1 className="mt-3 max-w-2xl break-words text-[clamp(2.35rem,10vw,4.75rem)] font-bold leading-[0.95] tracking-tight">
                {provider.name}
              </h1>
              {heroText ? (
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/88 sm:text-lg">
                  {heroText}
                </p>
              ) : null}
              <div className="mt-5 rounded-2xl border border-amber-200/70 bg-amber-50/92 px-4 py-4 text-sm text-amber-950 shadow-sm">
                {bookingUnavailableMessage}
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {provider.phone ? (
                  <a
                    href={`tel:${provider.phone}`}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl border px-5 font-semibold shadow-sm shadow-black/15 transition hover:-translate-y-0.5 hover:bg-white/12 hover:shadow-md"
                    style={{
                      borderColor: "color-mix(in oklab, white 24%, transparent)",
                      color: provider.text_color,
                    }}
                  >
                    Pozovi salon
                  </a>
                ) : null}
                <span className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-5 font-semibold text-white/72">
                  Novi termini su privremeno iskljuceni
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className={theme.page}>
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className={`rounded-[1.5rem] border p-6 sm:p-7 ${theme.card}`}>
              <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${theme.badge}`}>
                Status
              </div>
              <h2 className={`mt-3 text-2xl font-bold tracking-tight ${theme.heading}`}>
                Booking trenutno nije dostupan
              </h2>
              <p className={`mt-4 text-base leading-7 ${theme.muted}`}>
                Javna stranica je i dalje vidljiva, ali novi online termini ne
                mogu da se rezervisu dok se nalog ponovo ne aktivira.
              </p>

              {services?.length ? (
                <div className={`mt-6 divide-y rounded-[1.25rem] border ${theme.border}`}>
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="flex flex-col gap-3 px-4 py-4 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between"
                    >
                      <div>
                        <p className={`font-semibold ${theme.heading}`}>
                          {service.name}
                        </p>
                        <p className={`mt-1 text-sm ${theme.muted}`}>
                          {service.duration_minutes} min
                        </p>
                      </div>
                      <p className={`text-sm font-semibold min-[420px]:shrink-0 ${theme.heading}`}>
                        {formatPrice(service.price)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <aside className="space-y-5">
              <div className={`rounded-[1.5rem] border p-5 ${theme.card}`}>
                <h2 className={`text-lg font-semibold ${theme.heading}`}>Kontakt</h2>
                <div className={`mt-4 space-y-3 text-sm ${theme.muted}`}>
                  {location ? (
                    <div className={`rounded-2xl border px-4 py-3 ${theme.feature}`}>
                      {location}
                    </div>
                  ) : null}
                  {provider.phone ? (
                    <a
                      href={`tel:${provider.phone}`}
                      className={`block rounded-2xl border px-4 py-3 transition hover:-translate-y-0.5 ${theme.feature}`}
                    >
                      {provider.phone}
                    </a>
                  ) : null}
                  <div className={`rounded-2xl border px-4 py-3 ${theme.feature}`}>
                    zakazi.pro/{provider.slug}
                  </div>
                </div>
              </div>

              {workers?.length ? (
                <div className={`rounded-[1.5rem] border p-5 ${theme.card}`}>
                  <h2 className={`text-lg font-semibold ${theme.heading}`}>Tim</h2>
                  <div className="mt-4 space-y-3">
                    {workers.slice(0, 4).map((worker) => (
                      <div
                        key={worker.id}
                        className={`flex items-center gap-3 rounded-2xl border p-3 ${theme.feature}`}
                      >
                        {worker.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={worker.photo_url}
                            alt=""
                            className="size-11 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className={`flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${theme.avatar}`}
                          >
                            {getInitials(worker.name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-medium ${theme.heading}`}>
                            {worker.name}
                          </p>
                          {worker.bio ? (
                            <p className={`mt-0.5 line-clamp-2 text-xs leading-5 ${theme.muted}`}>
                              {worker.bio}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      className={`flex-1 bg-background ${getSiteFontClass(provider.font_choice)}`}
    >
      <section
        className="relative overflow-hidden"
        style={{
          backgroundColor: provider.primary_color,
          color: provider.text_color,
        }}
      >
        {heroImage ? (
          <Image
            src={heroImage}
            alt=""
            fill
            priority
            quality={82}
            sizes="100vw"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: `${coverFocalX}% ${coverFocalY}%` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/22 to-black/55" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background/20 to-transparent" />

        <div className="relative mx-auto flex min-h-[78svh] w-full max-w-6xl items-end px-4 pb-8 pt-20 sm:px-8 sm:pb-10 sm:pt-24">
          <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-white/20 bg-black/28 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/92">
                <span>Online zakazivanje</span>
                <span className="h-1 w-1 rounded-full bg-white/60" />
                <span>zakazi.pro/{provider.slug}</span>
              </div>

              <div className="mt-5 rounded-[1.75rem] border border-white/15 bg-black/28 p-5 shadow-sm shadow-black/25 sm:p-7">
                {provider.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={provider.logo_url}
                    alt=""
                    className="mb-5 size-16 rounded-2xl border border-white/25 bg-white object-cover shadow-sm shadow-black/20"
                  />
                ) : null}

                <h1 className="max-w-2xl break-words text-[clamp(2.35rem,10vw,4.75rem)] font-bold leading-[0.95] tracking-tight">
                  {provider.name}
                </h1>

                {heroText ? (
                  <p className="mt-4 max-w-2xl text-base leading-7 text-white/88 sm:text-lg">
                    {heroText}
                  </p>
                ) : null}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    href={`/${provider.slug}/book`}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl px-5 font-semibold shadow-sm shadow-black/20 transition hover:-translate-y-0.5 hover:shadow-md"
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
                      className="inline-flex min-h-12 items-center justify-center rounded-xl border px-5 font-semibold shadow-sm shadow-black/15 transition hover:-translate-y-0.5 hover:bg-white/12 hover:shadow-md"
                      style={{
                        borderColor: "color-mix(in oklab, white 24%, transparent)",
                        color: provider.text_color,
                      }}
                    >
                      Pozovi
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="rounded-[1.5rem] border border-white/15 bg-black/28 p-5 text-white shadow-sm shadow-black/20">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                  Brz pregled
                </p>
                <div className="mt-4 space-y-3 text-sm text-white/86">
                  <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-white/60">
                      Termin
                    </p>
                    <p className="mt-1 font-semibold">
                      Online rezervacija u par koraka
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-white/60">
                      Kontakt
                    </p>
                    <p className="mt-1 font-semibold">
                      {provider.phone || "Dodajte broj telefona u editoru"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={theme.page}>
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
          {provider.description ? (
            <div className={`mb-8 rounded-[1.5rem] border p-6 sm:p-7 ${theme.card}`}>
              <div className="mb-4 inline-flex items-center rounded-full bg-warm-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-warm-foreground">
                O nama
              </div>
              <p
                className={`whitespace-pre-line break-words text-base leading-7 ${theme.muted}`}
              >
                {provider.description}
              </p>
            </div>
          ) : null}

          {nonWorkingDays?.length ? (
            <div className={`mb-8 rounded-[1.5rem] border p-6 sm:p-7 ${theme.card}`}>
              <div className={`mb-4 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${theme.badge}`}>
                Važne informacije
              </div>
              <h2 className={`text-2xl font-bold tracking-tight ${theme.heading}`}>
                Neradni dani
              </h2>
              <div className={`mt-4 space-y-4 text-sm ${theme.muted}`}>
                {nonWorkingDays.map((day) => (
                  <div key={day.id} className={`rounded-2xl border p-4 ${theme.feature}`}>
                    <p className={`font-semibold ${theme.heading}`}>
                      {formatDateRange(day.date_from, day.date_to)}
                    </p>
                    <p className="mt-1">
                      {day.reason ||
                        (day.is_public_holiday
                          ? "Praznik."
                          : "Salon ne radi u ovom periodu.")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {galleryImages.length ? (
            <div className={`mb-8 rounded-[1.5rem] border p-6 sm:p-7 ${theme.card}`}>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${theme.badge}`}>
                    Galerija
                  </div>
                  <h2 className={`mt-3 text-2xl font-bold tracking-tight ${theme.heading}`}>
                    Prostor, atmosfera i radovi
                  </h2>
                </div>
                <p className={`text-sm ${theme.muted}`}>{galleryImages.length} fotografija</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {galleryImages.map((image, index) => (
                  <div
                    key={image.id}
                    className="group relative aspect-[4/5] overflow-hidden rounded-[1.25rem] border border-black/5 bg-black/5"
                  >
                    <Image
                      src={image.image_url}
                      alt={`${provider.name} galerija ${index + 1}`}
                      fill
                      quality={72}
                      sizes="(min-width: 1280px) 360px, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className={`rounded-[1.75rem] border p-6 sm:p-7 ${theme.card}`}>
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${theme.badge}`}>
                    Usluge
                  </div>
                  <h2 className={`mt-3 text-2xl font-bold tracking-tight ${theme.heading}`}>
                    Odaberite tretman koji vam odgovara
                  </h2>
                </div>
                <p className={`text-sm ${theme.muted}`}>
                  {services?.length
                    ? `${services.length} dostupnih usluga`
                    : "Usluge uskoro"}
                </p>
              </div>

              <div
                className={`divide-y rounded-[1.25rem] border ${theme.border}`}
              >
                {services?.length ? (
                  services.map((service) => (
                    <div
                      key={service.id}
                      className="group flex flex-col gap-3 px-4 py-4 transition hover:-translate-y-0.5 hover:bg-brand-soft/35 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between"
                    >
                      <div>
                        <p className={`font-semibold ${theme.heading}`}>
                          {service.name}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-sm">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 ${theme.badge}`}>
                            {service.duration_minutes} min
                          </span>
                        </div>
                      </div>
                      <p
                        className={`text-sm font-semibold min-[420px]:shrink-0 ${theme.heading}`}
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

              <div className="mt-6">
                <Link
                  href={`/${provider.slug}/book`}
                  className="btn-primary inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-primary-foreground"
                >
                  Nastavi na zakazivanje
                </Link>
              </div>
            </div>

            <aside className="space-y-5">
              <div className={`rounded-[1.5rem] border p-5 ${theme.card}`}>
                <h2 className={`text-lg font-semibold ${theme.heading}`}>Tim</h2>
                <div className="mt-4 space-y-3">
                  {workers?.length ? (
                    workers.slice(0, 4).map((worker) => (
                      <div
                        key={worker.id}
                        className={`flex items-center gap-3 rounded-2xl border p-3 ${theme.feature}`}
                      >
                        {worker.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={worker.photo_url}
                            alt=""
                            className="size-11 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className={`flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${theme.avatar}`}
                          >
                            {getInitials(worker.name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-medium ${theme.heading}`}>
                            {worker.name}
                          </p>
                          {worker.bio ? (
                            <p className={`mt-0.5 line-clamp-2 text-xs leading-5 ${theme.muted}`}>
                              {worker.bio}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className={`text-sm ${theme.muted}`}>
                      Tim još nije objavljen.
                    </p>
                  )}
                </div>
              </div>

              <div className={`rounded-[1.5rem] border p-5 ${theme.card}`}>
                <h2 className={`text-lg font-semibold ${theme.heading}`}>Kontakt</h2>
                <div className={`mt-4 space-y-3 text-sm ${theme.muted}`}>
                  {provider.address || provider.city ? (
                    <div className={`rounded-2xl border px-4 py-3 ${theme.feature}`}>
                      {[provider.address, provider.city]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  ) : null}
                  {provider.phone ? (
                    <a
                      href={`tel:${provider.phone}`}
                      className={`block rounded-2xl border px-4 py-3 transition hover:-translate-y-0.5 ${theme.feature}`}
                    >
                      {provider.phone}
                    </a>
                  ) : null}
                  <div className={`rounded-2xl border px-4 py-3 ${theme.feature}`}>
                    zakazi.pro/{provider.slug}
                  </div>
                </div>
                <div className="mt-5">
                  <Link
                    href={`/${provider.slug}/book`}
                    className={`inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold transition hover:-translate-y-0.5 ${theme.buttonGhost}`}
                  >
                    Rezerviši online
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
