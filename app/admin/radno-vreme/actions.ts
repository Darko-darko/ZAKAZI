"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProvider } from "@/lib/admin/provider";

export type WorkingHoursState = {
  status: "idle" | "success" | "error";
  message: string;
};

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readNullableTime(formData: FormData, key: string) {
  return readString(formData, key) || null;
}

function revalidateProviderPaths(slug: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/radno-vreme");
  revalidatePath("/admin/raspored");
  revalidatePath("/admin/termini");
  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/book`);
}

export async function updateWorkingHoursAction(
  _prevState: WorkingHoursState,
  formData: FormData,
) {
  void _prevState;

  const { supabase, provider } = await getCurrentProvider();
  const rows = [];

  for (let day = 0; day < 7; day += 1) {
    const isClosed = formData.get(`closed_${day}`) === "on";
    const opensAt = isClosed ? null : readNullableTime(formData, `opens_${day}`);
    const closesAt = isClosed ? null : readNullableTime(formData, `closes_${day}`);

    if (!isClosed && (!opensAt || !closesAt || opensAt >= closesAt)) {
      return {
        status: "error" as const,
        message: "Za otvorene dane pocetak mora biti pre kraja radnog vremena.",
      };
    }

    rows.push({
      provider_id: provider.id,
      day_of_week: day,
      opens_at: opensAt,
      closes_at: closesAt,
      is_closed: isClosed,
    });
  }

  const { error } = await supabase
    .from("provider_working_hours")
    .upsert(rows, { onConflict: "provider_id,day_of_week" });

  if (error) {
    return {
      status: "error" as const,
      message: "Radno vreme nije sacuvano. Pokusaj ponovo.",
    };
  }

  revalidateProviderPaths(provider.slug);

  return {
    status: "success" as const,
    message: "Radno vreme je sacuvano.",
  };
}

export async function createNonWorkingDayAction(
  _prevState: WorkingHoursState,
  formData: FormData,
) {
  void _prevState;

  const { supabase, provider } = await getCurrentProvider();
  const dateFrom = readString(formData, "date_from");
  const dateTo = readString(formData, "date_to");
  const reason = readString(formData, "reason") || null;
  const isPublicHoliday = formData.get("is_public_holiday") === "on";

  if (!dateFrom || !dateTo) {
    return {
      status: "error" as const,
      message: "Unesi pocetni i krajnji datum neradnog perioda.",
    };
  }

  if (dateFrom > dateTo) {
    return {
      status: "error" as const,
      message: "Pocetni datum mora biti pre ili isti kao krajnji datum.",
    };
  }

  const { error } = await supabase.from("time_off").insert({
    provider_id: provider.id,
    worker_id: null,
    date_from: dateFrom,
    date_to: dateTo,
    reason,
    is_public_holiday: isPublicHoliday,
  });

  if (error) {
    return {
      status: "error" as const,
      message: "Neradni dan nije sacuvan. Pokusaj ponovo.",
    };
  }

  revalidateProviderPaths(provider.slug);

  return {
    status: "success" as const,
    message: "Neradni dan je sacuvan i odmah je vidljiv na stranici za zakazivanje.",
  };
}

export async function deleteNonWorkingDayAction(formData: FormData) {
  const { supabase, provider } = await getCurrentProvider();
  const id = readString(formData, "id");

  if (!id) {
    return;
  }

  await supabase
    .from("time_off")
    .delete()
    .eq("id", id)
    .eq("provider_id", provider.id)
    .is("worker_id", null);

  revalidateProviderPaths(provider.slug);
}
