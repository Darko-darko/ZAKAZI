import Link from "next/link";
import { getCurrentProvider } from "@/lib/admin/provider";

export const metadata = {
  title: "Smene | zakazi.pro",
};

function formatTime(value: string | null) {
  return value ? value.slice(0, 5) : null;
}

export default async function ShiftsPage() {
  const { supabase, provider } = await getCurrentProvider();

  const { data: shifts } = await supabase
    .from("shifts")
    .select("id, name, start_time, end_time, break_start, break_end")
    .eq("provider_id", provider.id)
    .order("start_time", { ascending: true })
    .order("name", { ascending: true });

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
              Smene
            </h1>
            <p className="text-muted-foreground">{provider.name}</p>
          </div>
          <Link
            href="/admin/smene/novi"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Dodaj smenu
          </Link>
        </header>

        <div className="overflow-hidden rounded-md border border-border bg-card">
          {shifts?.length ? (
            <div className="divide-y divide-border">
              {shifts.map((shift) => (
                <Link
                  key={shift.id}
                  href={`/admin/smene/${shift.id}`}
                  className="grid gap-3 p-5 transition hover:bg-accent sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <h2 className="font-semibold text-foreground">
                      {shift.name}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {shift.break_start && shift.break_end
                      ? `Pauza: ${formatTime(shift.break_start)} - ${formatTime(shift.break_end)}`
                      : "Bez pauze"}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="font-medium text-foreground">Nema smena.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Dodaj smenu da bi je kasnije dodelio rasporedu radnika.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
