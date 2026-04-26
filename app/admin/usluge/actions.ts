"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProvider } from "@/lib/admin/provider";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readPositiveInt(formData: FormData, key: string, fallback: number) {
  const value = Number(readString(formData, key) || fallback);

  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.round(value);
}

function readNullableMoney(formData: FormData) {
  const rawValue = readString(formData, "price");

  if (!rawValue) {
    return null;
  }

  const value = Number(rawValue);

  if (!Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.round(value);
}

function readSortOrder(formData: FormData) {
  const value = Number(readString(formData, "sort_order") || 0);

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value);
}

export async function createServiceAction(formData: FormData) {
  const { supabase, provider } = await getCurrentProvider();
  const name = readString(formData, "name");

  if (!name) {
    throw new Error("Naziv usluge je obavezan.");
  }

  const { error } = await supabase.from("services").insert({
    provider_id: provider.id,
    name,
    duration_minutes: readPositiveInt(formData, "duration_minutes", 30),
    price: readNullableMoney(formData),
    sort_order: readSortOrder(formData),
    is_active: formData.get("is_active") === "on",
  });

  if (error) {
    throw new Error("Usluga nije sacuvana. Pokusaj ponovo.");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/usluge");
  redirect("/admin/usluge");
}

export async function updateServiceAction(
  serviceId: string,
  formData: FormData,
) {
  const { supabase, provider } = await getCurrentProvider();
  const name = readString(formData, "name");

  if (!name) {
    throw new Error("Naziv usluge je obavezan.");
  }

  const { error } = await supabase
    .from("services")
    .update({
      name,
      duration_minutes: readPositiveInt(formData, "duration_minutes", 30),
      price: readNullableMoney(formData),
      sort_order: readSortOrder(formData),
      is_active: formData.get("is_active") === "on",
    })
    .eq("id", serviceId)
    .eq("provider_id", provider.id);

  if (error) {
    throw new Error("Izmene nisu sacuvane. Pokusaj ponovo.");
  }

  revalidatePath("/admin/usluge");
  revalidatePath(`/admin/usluge/${serviceId}`);
  redirect("/admin/usluge");
}
