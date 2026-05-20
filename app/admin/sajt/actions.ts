"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProvider } from "@/lib/admin/provider";
import { normalizeSiteFontChoice } from "@/lib/providers/site";

export type SiteBrandingState = {
  ok: boolean;
  message: string;
};

const fontChoices = new Set(["sans", "serif", "default", "modern", "elegant"]);
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

  if (!fontChoices.has(value)) {
    return "default";
  }

  return normalizeSiteFontChoice(value) === "serif" ? "serif" : "default";
}

function readSiteTheme(formData: FormData) {
  const value = readString(formData, "site_theme");
  return siteThemes.has(value) ? value : "default";
}

function readCoverFocalY(formData: FormData) {
  const value = Number.parseInt(readString(formData, "cover_focal_y"), 10);

  if (Number.isNaN(value)) {
    return 50;
  }

  return Math.min(100, Math.max(0, value));
}

function readCoverFocalX(formData: FormData) {
  const value = Number.parseInt(readString(formData, "cover_focal_x"), 10);

  if (Number.isNaN(value)) {
    return 50;
  }

  return Math.min(100, Math.max(0, value));
}

export async function updateSiteBrandingAction(
  _state: SiteBrandingState,
  formData: FormData,
): Promise<SiteBrandingState> {
  const { supabase, provider } = await getCurrentProvider();
  const name = readString(formData, "name");

  if (!name) {
    return { ok: false, message: "Naziv stranice je obavezan." };
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
    cover_focal_x: readCoverFocalX(formData),
    cover_focal_y: readCoverFocalY(formData),
    primary_color: readColor(formData, "primary_color", "#000000"),
    text_color: readColor(formData, "text_color", "#ffffff"),
  };
  const legacyCompatibleUpdate = {
    name: update.name,
    intro_text: update.intro_text,
    description: update.description,
    address: update.address,
    city: update.city,
    phone: update.phone,
    font_choice: update.font_choice,
    primary_color: update.primary_color,
    text_color: update.text_color,
  };

  const { error } = await supabase
    .from("providers")
    .update(update)
    .eq("id", provider.id)
    .eq("user_id", provider.user_id);
  const updateError = error
    ? (
        await supabase
          .from("providers")
          .update(legacyCompatibleUpdate)
          .eq("id", provider.id)
          .eq("user_id", provider.user_id)
      ).error
    : null;

  if (updateError) {
    return {
      ok: false,
      message: "Izmene nisu sacuvane. Pokusaj ponovo.",
    };
  }

  revalidatePath("/admin/sajt");
  revalidatePath(`/${provider.slug}`);

  return { ok: true, message: "Stranica je sacuvana." };
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

export async function updateSiteGalleryImageAction(
  sortOrder: number,
  assetPath: string,
) {
  const { supabase, provider } = await getCurrentProvider();
  const normalizedPath = assetPath.trim();

  if (sortOrder < 0 || sortOrder > 5) {
    throw new Error("Pozicija galerije nije ispravna.");
  }

  if (
    !normalizedPath.startsWith(
      `providers/${provider.id}/gallery/${sortOrder + 1}/`,
    )
  ) {
    throw new Error("Putanja galerijske slike nije ispravna.");
  }

  const publicUrl = supabase.storage
    .from("provider-assets")
    .getPublicUrl(normalizedPath).data.publicUrl;

  const { data: existingImage, error: existingError } = await supabase
    .from("provider_gallery")
    .select("id")
    .eq("provider_id", provider.id)
    .eq("sort_order", sortOrder)
    .maybeSingle();

  if (existingError) {
    throw new Error("Galerijska slika nije sacuvana. Pokusaj ponovo.");
  }

  const { error } = existingImage
    ? await supabase
        .from("provider_gallery")
        .update({ image_url: publicUrl })
        .eq("id", existingImage.id)
        .eq("provider_id", provider.id)
    : await supabase.from("provider_gallery").insert({
        provider_id: provider.id,
        sort_order: sortOrder,
        image_url: publicUrl,
      });

  if (error) {
    throw new Error("Galerijska slika nije sacuvana. Pokusaj ponovo.");
  }

  revalidatePath("/admin/sajt");
  revalidatePath(`/${provider.slug}`);

  return { url: publicUrl };
}

export async function removeSiteGalleryImageAction(sortOrder: number) {
  const { supabase, provider } = await getCurrentProvider();

  if (sortOrder < 0 || sortOrder > 5) {
    throw new Error("Pozicija galerije nije ispravna.");
  }

  const { error } = await supabase
    .from("provider_gallery")
    .delete()
    .eq("provider_id", provider.id)
    .eq("sort_order", sortOrder);

  if (error) {
    throw new Error("Galerijska slika nije uklonjena. Pokusaj ponovo.");
  }

  revalidatePath("/admin/sajt");
  revalidatePath(`/${provider.slug}`);

  return { ok: true };
}
