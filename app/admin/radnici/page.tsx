import Link from "next/link";
import { getCurrentProvider } from "@/lib/admin/provider";

export const metadata = {
  title: "Radnici | zakazi.pro",
};

type WorkersPageProps = {
  searchParams: Promise<{ status?: string }>;
};

function getStatusLabel(worker: {
  archived_at: string | null;
  is_active: boolean;
}) {
  if (worker.archived_at) {
    return "Arhiviran";
  }

  return worker.is_active ? "Online" : "U pripremi";
}

function getFilterClass(active: boolean) {
  return active
    ? "btn-primary rounded-md px-3 py-2 text-sm font-medium text-primary-foreground"
    : "btn-secondary rounded-md px-3 py-2 text-sm font-medium text-foreground";
}

export default async function WorkersPage({ searchParams }: WorkersPageProps) {
  const { status } = await searchParams;
  const selectedStatus =
    status === "archived" || status === "all" ? status : "active";
  const { supabase, provider } = await getCurrentProvider();

  let query = supabase
    .from("workers")
    .select(
      "id, name, bio, photo_url, is_active, archived_at, created_at",
    )
    .eq("provider_id", provider.id)
    .order("created_at", { ascending: true });

  if (selectedStatus === "active") {
    query = query.is("archived_at", null);
  }

  if (selectedStatus === "archived") {
    query = query.not("archived_at", "is", null);
  }

  const { data: workers } = await query;

  return (
    <main className="flex flex-1 px-6 py-10">
      <section className="mx-auto w-full max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              Admin
            </Link>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              Radnici
            </h1>
            <p className="text-muted-foreground">{provider.name}</p>
          </div>
          <Link
            href="/admin/radnici/novi"
            className="btn-primary inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Dodaj radnika
          </Link>
        </header>

        <nav className="flex flex-wrap gap-2">
          <Link
            href="/admin/radnici"
            className={getFilterClass(selectedStatus === "active")}
          >
            Aktivni
          </Link>
          <Link
            href="/admin/radnici?status=archived"
            className={getFilterClass(selectedStatus === "archived")}
          >
            Arhivirani
          </Link>
          <Link
            href="/admin/radnici?status=all"
            className={getFilterClass(selectedStatus === "all")}
          >
            Svi
          </Link>
        </nav>

        <div className="overflow-hidden rounded-md border border-border bg-card">
          {workers?.length ? (
            <div className="divide-y divide-border">
              {workers.map((worker) => (
                <Link
                  key={worker.id}
                  href={`/admin/radnici/${worker.id}`}
                  className="grid gap-3 p-5 transition hover:bg-accent sm:grid-cols-[1fr_auto]"
                >
                  <div className="flex gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                      {worker.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={worker.photo_url}
                          alt={worker.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">
                          {worker.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-foreground">
                          {worker.name}
                        </h2>
                        <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
                          {getStatusLabel(worker)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {worker.bio || "Nema unet bio."}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {worker.archived_at
                      ? "Sakriven iz online zakazivanja"
                      : worker.is_active
                        ? "Prima online termine"
                        : "Nije objavljen"}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="font-medium text-foreground">Nema radnika.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Dodaj prvog radnika da bi kasnije mogao da prima termine.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
