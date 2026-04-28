"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProvider } from "@/lib/admin/provider";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readNullableTime(formData: FormData, key: string) {
  return readString(formData, key) || null;
}

function validateCustomTime(startTime: string | null, endTime: string | null) {
  return Boolean(startTime && endTime && startTime < endTime);
}

export async function updateScheduleMatrixAction(formData: FormData) {
  const { supabase, provider } = await getCurrentProvider();
  const { data: workers } = await supabase
    .from("workers")
    .select("id")
    .eq("provider_id", provider.id)
    .is("archived_at", null);

  const workerIds = workers?.map((worker) => worker.id) ?? [];

  if (!workerIds.length) {
    redirect("/admin/raspored");
  }

  const rows = [];

  for (const workerId of workerIds) {
    for (let day = 0; day < 7; day += 1) {
      const key = `${workerId}_${day}`;
      const mode = readString(formData, `mode_${key}`);

      if (mode === "shift") {
        const shiftId = readString(formData, `shift_${key}`);

        if (shiftId) {
          rows.push({
            worker_id: workerId,
            day_of_week: day,
            shift_id: shiftId,
            custom_start_time: null,
            custom_end_time: null,
            custom_break_start: null,
            custom_break_end: null,
          });
        }
      }

      if (mode === "custom") {
        const customStart = readNullableTime(formData, `custom_start_${key}`);
        const customEnd = readNullableTime(formData, `custom_end_${key}`);

        if (!validateCustomTime(customStart, customEnd)) {
          throw new Error("Custom pocetak mora biti pre custom kraja.");
        }

        rows.push({
          worker_id: workerId,
          day_of_week: day,
          shift_id: null,
          custom_start_time: customStart,
          custom_end_time: customEnd,
          custom_break_start: null,
          custom_break_end: null,
        });
      }
    }
  }

  const shiftIds = Array.from(
    new Set(
      rows
        .map((row) => row.shift_id)
        .filter((shiftId): shiftId is string => Boolean(shiftId)),
    ),
  );

  if (shiftIds.length) {
    const { data: shifts, error: shiftsError } = await supabase
      .from("shifts")
      .select("id")
      .eq("provider_id", provider.id)
      .in("id", shiftIds);

    if (shiftsError || !shifts || shifts.length !== shiftIds.length) {
      throw new Error("Izabrana smena nije ispravna.");
    }
  }

  const { error: deleteError } = await supabase
    .from("worker_schedule")
    .delete()
    .in("worker_id", workerIds);

  if (deleteError) {
    throw new Error(`Raspored nije sacuvan: ${deleteError.message}`);
  }

  if (rows.length) {
    const { error: insertError } = await supabase
      .from("worker_schedule")
      .insert(rows);

    if (insertError) {
      throw new Error(`Raspored nije sacuvan: ${insertError.message}`);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/raspored");
  revalidatePath("/admin/radnici");
  redirect("/admin/raspored");
}
