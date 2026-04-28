"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProvider } from "@/lib/admin/provider";

type WorkingHoursState = {
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

  revalidatePath("/admin");
  revalidatePath("/admin/radno-vreme");
  revalidatePath("/admin/raspored");

  return {
    status: "success" as const,
    message: "Radno vreme je sacuvano.",
  };
}
