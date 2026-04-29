import Link from "next/link";
import { getCurrentProvider } from "@/lib/admin/provider";
import {
  createNonWorkingDayAction,
  deleteNonWorkingDayAction,
  updateWorkingHoursAction,
} from "./actions";
import { NonWorkingDaysForm } from "./non-working-days-form";
import { WorkingHoursForm } from "./working-hours-form";

export const metadata = {
  title: "Radno vreme | zakazi.pro",
};

const defaultHours = Array.from({ length: 7 }, (_, day) => ({
  day_of_week: day,
  opens_at: day >= 1 && day <= 5 ? "09:00:00" : null,
  closes_at: day >= 1 && day <= 5 ? "17:00:00" : null,
  is_closed: !(day >= 1 && day <= 5),
}));

export default async function WorkingHoursPage() {
  const { supabase, provider } = await getCurrentProvider();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Belgrade",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const [{ data: hours }, { data: nonWorkingDays }] = await Promise.all([
    supabase
      .from("provider_working_hours")
      .select("day_of_week, opens_at, closes_at, is_closed")
      .eq("provider_id", provider.id)
      .order("day_of_week", { ascending: true }),
    supabase
      .from("time_off")
      .select("id, date_from, date_to, reason, is_public_holiday")
      .eq("provider_id", provider.id)
      .is("worker_id", null)
      .gte("date_to", today)
      .order("date_from", { ascending: true }),
  ]);

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
              Radno vreme
            </h1>
            <p className="text-muted-foreground">{provider.name}</p>
          </div>
          <Link
            href="/admin/raspored"
            className="btn-secondary inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-foreground"
          >
            Raspored radnika
          </Link>
        </header>

        <div className="rounded-md border border-border bg-background p-4 text-sm text-muted-foreground">
          Ovo je okvir kada ordinacija ili salon prima termine. Smene i custom
          vreme radnika se seku sa ovim vremenom pri prikazu slobodnih termina.
        </div>

        <WorkingHoursForm
          action={updateWorkingHoursAction}
          hours={hours?.length ? hours : defaultHours}
        />

        <NonWorkingDaysForm
          action={createNonWorkingDayAction}
          deleteAction={deleteNonWorkingDayAction}
          days={nonWorkingDays ?? []}
        />
      </section>
    </main>
  );
}
