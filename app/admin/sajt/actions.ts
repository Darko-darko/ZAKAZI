"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProvider } from "@/lib/admin/provider";

export type SiteBrandingState = {
  ok: boolean;
  message: string;
};

const fontChoices = new Set(["default", "serif", "modern", "elegant"]);
const siteThemes = new Set(["default", "light", "dark"]);
const hexColorPattern = /^#[0-9a-fA-F]{6}$/;

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readNullableString(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value || null;
}

function readColor(formData: FormData, key: string, fallback: string) {
  const value = readString(formData, key);
  return hexColorPattern.test(value) ? value : fallback;
}

function readFontChoice(formData: FormData) {
  const value = readString(formData, "font_choice");
  return fontChoices.has(value) ? value : "default";
}

function readSiteTheme(formData: FormData) {
  const value = readString(formData, "site_theme");
  return siteThemes.has(value) ? value : "default";
}

export async function updateSiteBrandingAction(
  _state: SiteBrandingState,
  formData: FormData,
): Promise<SiteBrandingState> {
  const { supabase, provider } = await getCurrentProvider();
  const name = readString(formData, "name");

  if (!name) {
    return { ok: false, message: "Naziv mini sajta je obavezan." };
  }

  const update = {
    name,
    intro_text: readNullableString(formData, "intro_text"),
    description: readNullableString(formData, "description"),
    address: readNullableString(formData, "address"),
    city: readNullableString(formData, "city"),
    phone: readNullableString(formData, "phone"),
    font_choice: readFontChoice(formData),
    site_theme: readSiteTheme(formData),
    primary_color: readColor(formData, "primary_color", "#000000"),
    text_color: readColor(formData, "text_color", "#ffffff"),
  };
  const { error } = await supabase
    .from("providers")
    .update(update)
    .eq("id", provider.id)
    .eq("user_id", provider.user_id);
  const updateError =
    error && error.code === "PGRST204"
      ? (
          await supabase
            .from("providers")
            .update({
              name: update.name,
              intro_text: update.intro_text,
              description: update.description,
              address: update.address,
              city: update.city,
              phone: update.phone,
              font_choice: update.font_choice,
              primary_color: update.primary_color,
              text_color: update.text_color,
            })
            .eq("id", provider.id)
            .eq("user_id", provider.user_id)
        ).error
      : error;

  if (updateError) {
    return {
      ok: false,
      message: "Izmene nisu sacuvane. Pokusaj ponovo.",
    };
  }

  revalidatePath("/admin/sajt");
  revalidatePath(`/${provider.slug}`);

  return { ok: true, message: "Mini sajt je sacuvan." };
}

export async function updateSiteAssetAction(
  asset: "logo" | "cover",
  assetPath: string | null,
) {
  const { supabase, provider } = await getCurrentProvider();
  const normalizedPath = assetPath?.trim() || null;

  if (
    normalizedPath &&
    !normalizedPath.startsWith(`providers/${provider.id}/branding/${asset}/`)
  ) {
    throw new Error("Putanja slike nije ispravna.");
  }

  const publicUrl = normalizedPath
    ? supabase.storage.from("provider-assets").getPublicUrl(normalizedPath).data
        .publicUrl
    : null;

  const update =
    asset === "logo" ? { logo_url: publicUrl } : { cover_url: publicUrl };

  const { error } = await supabase
    .from("providers")
    .update(update)
    .eq("id", provider.id)
    .eq("user_id", provider.user_id);

  if (error) {
    throw new Error("Slika nije sacuvana. Pokusaj ponovo.");
  }

  revalidatePath("/admin/sajt");
  revalidatePath(`/${provider.slug}`);

  return { url: publicUrl };
}
