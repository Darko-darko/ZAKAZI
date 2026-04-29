import Link from "next/link";
import { getCurrentProvider } from "@/lib/admin/provider";
import { updateScheduleMatrixAction } from "./actions";
import { ScheduleMatrixForm } from "./schedule-matrix-form";

export const metadata = {
  title: "Raspored | zakazi.pro",
};

type ScheduleRow = {
  worker_id: string;
  day_of_week: number;
  shift_id: string | null;
  custom_start_time: string | null;
  custom_end_time: string | null;
};

export default async function SchedulePage() {
  const { supabase, provider } = await getCurrentProvider();
  const [{ data: workers }, { data: shifts }, { data: schedules }] =
    await Promise.all([
      supabase
        .from("workers")
        .select("id, name, is_active")
        .eq("provider_id", provider.id)
        .is("archived_at", null)
        .order("created_at", { ascending: true }),
      supabase
        .from("shifts")
        .select("id, name, start_time, end_time")
        .eq("provider_id", provider.id)
        .order("start_time", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("worker_schedule")
        .select("worker_id, day_of_week, shift_id, custom_start_time, custom_end_time")
        .order("day_of_week", { ascending: true }),
    ]);

  return (
    <main className="flex flex-1 px-6 py-10">
      <section className="mx-auto w-full max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              Admin
            </Link>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              Raspored radnika
            </h1>
            <p className="text-muted-foreground">{provider.name}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/radno-vreme"
              className="btn-secondary inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-foreground"
            >
              Radno vreme
            </Link>
            <Link
              href="/admin/smene"
              className="btn-secondary inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-foreground"
            >
              Smene
            </Link>
          </div>
        </header>

        <ScheduleMatrixForm
          action={updateScheduleMatrixAction}
          workers={workers ?? []}
          shifts={shifts ?? []}
          schedules={(schedules ?? []) as ScheduleRow[]}
        />
      </section>
    </main>
  );
}
