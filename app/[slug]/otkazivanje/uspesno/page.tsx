import Link from "next/link";

type CancellationSuccessPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CancellationSuccessPage({
  params,
  searchParams,
}: CancellationSuccessPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const emailStatus = firstParam(query.email);

  return (
    <main className="flex flex-1 bg-background px-5 py-8">
      <section className="mx-auto flex w-full max-w-md flex-col justify-center">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
              aria-hidden
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </span>
          <p className="mt-4 text-sm font-medium uppercase tracking-wide text-amber-700">
            Termin je otkazan
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            Otkazivanje je uspesno evidentirano.
          </h1>
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              emailStatus === "sent"
                ? "border-brand/20 bg-brand-soft/40 text-foreground"
                : "border-amber-300/40 bg-amber-50 text-amber-900"
            }`}
          >
            {emailStatus === "sent"
              ? "Potvrda otkazivanja poslata je na email adresu sa koje je termin zakazan."
              : "Termin je otkazan, ali potvrdu emailom trenutno nismo poslali. Promena je ipak evidentirana."}
          </div>
          <Link
            href={`/${slug}`}
            className="btn-primary mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl px-4 font-semibold text-primary-foreground"
          >
            Nazad na stranicu
          </Link>
        </div>
      </section>
    </main>
  );
}
