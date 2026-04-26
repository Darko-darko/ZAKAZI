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

function assertShiftTimes(
  startTime: string,
  endTime: string,
  breakStart: string | null,
  breakEnd: string | null,
) {
  if (!startTime || !endTime || startTime >= endTime) {
    throw new Error("Pocetak smene mora biti pre kraja smene.");
  }

  if ((breakStart && !breakEnd) || (!breakStart && breakEnd)) {
    throw new Error("Unesi i pocetak i kraj pauze, ili ostavi oba prazna.");
  }

  if (breakStart && breakEnd && breakStart >= breakEnd) {
    throw new Error("Pocetak pauze mora biti pre kraja pauze.");
  }
}

function readShiftPayload(formData: FormData) {
  const name = readString(formData, "name");
  const startTime = readString(formData, "start_time");
  const endTime = readString(formData, "end_time");
  const breakStart = readNullableTime(formData, "break_start");
  const breakEnd = readNullableTime(formData, "break_end");

  if (!name) {
    throw new Error("Naziv smene je obavezan.");
  }

  assertShiftTimes(startTime, endTime, breakStart, breakEnd);

  return {
    name,
    start_time: startTime,
    end_time: endTime,
    break_start: breakStart,
    break_end: breakEnd,
  };
}

export async function createShiftAction(formData: FormData) {
  const { supabase, provider } = await getCurrentProvider();

  const { error } = await supabase.from("shifts").insert({
    provider_id: provider.id,
    ...readShiftPayload(formData),
  });

  if (error) {
    throw new Error("Smena nije sacuvana. Pokusaj ponovo.");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/smene");
  redirect("/admin/smene");
}

export async function updateShiftAction(shiftId: string, formData: FormData) {
  const { supabase, provider } = await getCurrentProvider();

  const { error } = await supabase
    .from("shifts")
    .update(readShiftPayload(formData))
    .eq("id", shiftId)
    .eq("provider_id", provider.id);

  if (error) {
    throw new Error("Izmene nisu sacuvane. Pokusaj ponovo.");
  }

  revalidatePath("/admin/smene");
  revalidatePath(`/admin/smene/${shiftId}`);
  redirect("/admin/smene");
}
