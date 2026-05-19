"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  getSiteFontClass,
  normalizeSiteFontChoice,
  type SiteFontChoice,
} from "@/lib/providers/site";
import { createClient } from "@/lib/supabase/client";
import { ShareSiteButton } from "./share-site-button";
import {
  removeSiteGalleryImageAction,
  type SiteBrandingState,
  updateSiteAssetAction,
  updateSiteGalleryImageAction,
  updateSiteBrandingAction,
} from "./actions";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxFileSize = 5 * 1024 * 1024;
const hexColorPattern = /^#[0-9a-fA-F]{6}$/;

type SiteTheme = "default" | "light" | "dark";

type SiteEditorProvider = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  intro_text: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  logo_url: string | null;
  cover_url: string | null;
  cover_focal_x: number;
  cover_focal_y: number;
  primary_color: string;
  text_color: string;
  font_choice: string;
  site_theme: string;
};

type SiteEditorProps = {
  provider: SiteEditorProvider;
  services: SitePreviewService[];
  workers: SitePreviewWorker[];
  gallery: SitePreviewGalleryImage[];
};

type AssetKind = "logo" | "cover";

type SitePreviewService = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number | null;
  sort_order: number;
};

type SitePreviewWorker = {
  id: string;
  name: string;
  photo_url: string | null;
  bio: string | null;
  created_at: string;
};

type SitePreviewGalleryImage = {
  id: string;
  image_url: string;
  sort_order: number;
};

type GallerySlot = {
  id: string | null;
  image_url: string | null;
  sort_order: number;
};

function getFileExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension && ["jpg", "jpeg", "png", "webp"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function getThemeClasses(siteTheme: string) {
  if (siteTheme === "dark") {
    return {
      page: "bg-neutral-950 text-neutral-50",
      card: "border-neutral-800 bg-neutral-900 text-neutral-50",
      heading: "text-neutral-50",
      muted: "text-neutral-300",
      border: "divide-neutral-800 border-neutral-800",
      avatar: "bg-neutral-800 text-neutral-300",
    };
  }

  if (siteTheme === "light") {
    return {
      page: "bg-sky-50 text-slate-950",
      card: "border-sky-100 bg-white text-slate-950 shadow-sm",
      heading: "text-slate-950",
      muted: "text-slate-600",
      border: "divide-sky-100 border-sky-100",
      avatar: "bg-sky-100 text-sky-700",
    };
  }

  return {
    page: "bg-background text-foreground",
    card: "border-border bg-card text-foreground",
    heading: "text-foreground",
    muted: "text-muted-foreground",
    border: "divide-border border-border",
    avatar: "bg-muted text-muted-foreground",
  };
}

function formatPrice(price: number | null) {
  if (price === null) {
    return "Cena po dogovoru";
  }

  return `${price.toLocaleString("sr-RS")} RSD`;
}

function normalizeCoverFocalY(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizeCoverFocalX(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function getCoverDragMetrics(
  frameWidth: number,
  frameHeight: number,
  imageWidth: number,
  imageHeight: number,
) {
  if (frameWidth <= 0 || frameHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) {
    return { overflowX: 0, overflowY: 0 };
  }

  const scale = Math.max(frameWidth / imageWidth, frameHeight / imageHeight);
  const renderedWidth = imageWidth * scale;
  const renderedHeight = imageHeight * scale;

  return {
    overflowX: Math.max(0, renderedWidth - frameWidth),
    overflowY: Math.max(0, renderedHeight - frameHeight),
  };
}

const initialState: SiteBrandingState = {
  ok: false,
  message: "",
};

const gallerySlotCount = 6;

const siteThemeOptions: Array<{
  label: string;
  value: SiteTheme;
  description: string;
  swatchClass: string;
}> = [
  {
    label: "Standard",
    value: "default",
    description: "Cist neutralan izgled.",
    swatchClass: "border-border bg-white",
  },
  {
    label: "Svetla",
    value: "light",
    description: "Prozracna plava pozadina.",
    swatchClass: "border-sky-100 bg-sky-50",
  },
  {
    label: "Tamna",
    value: "dark",
    description: "Taman donji deo.",
    swatchClass: "border-neutral-800 bg-neutral-950",
  },
];

const fontOptions: Array<{
  value: SiteFontChoice;
  label: string;
  description: string;
  previewClassName: string;
  previewText: string;
}> = [
  {
    value: "sans",
    label: "Savremen",
    description: "Cist, neutralan i pregledan za vecinu salona i studija.",
    previewClassName: "font-sans",
    previewText: "Jasan naslov i brz booking tok.",
  },
  {
    value: "serif",
    label: "Elegantan",
    description: "Topliji i izrazeniji stil za premium ili editorial utisak.",
    previewClassName: "font-serif",
    previewText: "Naglasen naslov i mirniji ritam citanja.",
  },
];

function buildGallerySlots(images: SitePreviewGalleryImage[]): GallerySlot[] {
  const bySortOrder = new Map(images.map((image) => [image.sort_order, image]));

  return Array.from({ length: gallerySlotCount }, (_, sortOrder) => {
    const image = bySortOrder.get(sortOrder);

    return {
      id: image?.id ?? null,
      image_url: image?.image_url ?? null,
      sort_order: sortOrder,
    };
  });
}

export function SiteEditor({
  provider,
  services,
  workers,
  gallery,
}: SiteEditorProps) {
  const router = useRouter();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryPreviewUrlsRef = useRef<(string | null)[]>(
    Array.from({ length: gallerySlotCount }, () => null),
  );
  const [state, formAction, pending] = useActionState(
    updateSiteBrandingAction,
    initialState,
  );
  const [isUploading, startUploadTransition] = useTransition();
  const [assetMessage, setAssetMessage] = useState("");
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [gallerySlots, setGallerySlots] = useState<GallerySlot[]>(
    buildGallerySlots(gallery),
  );
  const [draft, setDraft] = useState({
    name: provider.name,
    intro_text: provider.intro_text ?? "",
    description: provider.description ?? "",
    address: provider.address ?? "",
    city: provider.city ?? "",
    phone: provider.phone ?? "",
    logo_url: provider.logo_url,
    cover_url: provider.cover_url,
    cover_focal_x: normalizeCoverFocalX(provider.cover_focal_x),
    cover_focal_y: normalizeCoverFocalY(provider.cover_focal_y),
    primary_color: provider.primary_color,
    text_color: provider.text_color,
    font_choice: normalizeSiteFontChoice(provider.font_choice),
    site_theme: (["default", "light", "dark"].includes(provider.site_theme)
      ? provider.site_theme
      : "default") as SiteTheme,
  });

  function setField(field: keyof typeof draft, value: string | null) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  useEffect(() => {
    const galleryPreviewUrls = galleryPreviewUrlsRef.current;

    return () => {
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }

      for (const previewUrl of galleryPreviewUrls) {
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
      }
    };
  }, [coverPreviewUrl]);

  function uploadAsset(kind: AssetKind, file: File) {
    setAssetMessage("");

    if (!acceptedTypes.includes(file.type)) {
      setAssetMessage("Podrzane su JPG, PNG i WEBP slike.");
      return;
    }

    if (file.size > maxFileSize) {
      setAssetMessage("Slika moze biti najvise 5 MB.");
      return;
    }

    if (kind === "cover") {
      const nextPreviewUrl = URL.createObjectURL(file);
      setCoverPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }

        return nextPreviewUrl;
      });
    }

    startUploadTransition(async () => {
      try {
        const supabase = createClient();
        const extension = getFileExtension(file);
        const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
        const path = `providers/${provider.id}/branding/${kind}/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from("provider-assets")
          .upload(path, file, {
            cacheControl: "31536000",
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          setAssetMessage("Upload nije uspeo. Proveri sliku i probaj ponovo.");
          return;
        }

        const result = await updateSiteAssetAction(kind, path);
        setField(kind === "logo" ? "logo_url" : "cover_url", result.url);
        setAssetMessage("Slika je sacuvana.");
        router.refresh();
      } catch {
        setAssetMessage("Slika nije sacuvana. Pokusaj ponovo.");
      } finally {
        if (kind === "logo" && logoInputRef.current) {
          logoInputRef.current.value = "";
        }

        if (kind === "cover" && coverInputRef.current) {
          coverInputRef.current.value = "";
        }
      }
    });
  }

  function removeAsset(kind: AssetKind) {
    setAssetMessage("");

    if (kind === "cover") {
      setCoverPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }

        return null;
      });
      setDraft((current) => ({
        ...current,
        cover_focal_x: 50,
        cover_focal_y: 50,
      }));
    }

    startUploadTransition(async () => {
      try {
        const result = await updateSiteAssetAction(kind, null);
        setField(kind === "logo" ? "logo_url" : "cover_url", result.url);
        setAssetMessage("Slika je uklonjena.");
        router.refresh();
      } catch {
        setAssetMessage("Slika nije uklonjena. Pokusaj ponovo.");
      }
    });
  }

  function uploadGalleryImage(sortOrder: number, file: File) {
    setAssetMessage("");

    if (!acceptedTypes.includes(file.type)) {
      setAssetMessage("Podrzane su JPG, PNG i WEBP slike.");
      return;
    }

    if (file.size > maxFileSize) {
      setAssetMessage("Slika moze biti najvise 5 MB.");
      return;
    }

    const previousImageUrl = gallerySlots[sortOrder]?.image_url ?? null;
    const nextPreviewUrl = URL.createObjectURL(file);
    const previousPreviewUrl = galleryPreviewUrlsRef.current[sortOrder];

    if (previousPreviewUrl) {
      URL.revokeObjectURL(previousPreviewUrl);
    }

    galleryPreviewUrlsRef.current[sortOrder] = nextPreviewUrl;
    setGallerySlots((current) =>
      current.map((slot) =>
        slot.sort_order === sortOrder
          ? { ...slot, image_url: nextPreviewUrl }
          : slot,
      ),
    );

    startUploadTransition(async () => {
      try {
        const supabase = createClient();
        const extension = getFileExtension(file);
        const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
        const path = `providers/${provider.id}/gallery/${sortOrder + 1}/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from("provider-assets")
          .upload(path, file, {
            cacheControl: "31536000",
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          setGallerySlots((current) =>
            current.map((slot) =>
              slot.sort_order === sortOrder
                ? { ...slot, image_url: previousImageUrl }
                : slot,
            ),
          );
          setAssetMessage("Upload galerije nije uspeo. Proveri sliku i probaj ponovo.");
          return;
        }

        const result = await updateSiteGalleryImageAction(sortOrder, path);
        setGallerySlots((current) =>
          current.map((slot) =>
            slot.sort_order === sortOrder
              ? { ...slot, image_url: result.url }
              : slot,
          ),
        );
        setAssetMessage(`Galerijska slika ${sortOrder + 1} je sacuvana.`);
        router.refresh();
      } catch {
        setGallerySlots((current) =>
          current.map((slot) =>
            slot.sort_order === sortOrder
              ? { ...slot, image_url: previousImageUrl }
              : slot,
          ),
        );
        setAssetMessage("Galerijska slika nije sacuvana. Pokusaj ponovo.");
      } finally {
        const previewUrl = galleryPreviewUrlsRef.current[sortOrder];

        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          galleryPreviewUrlsRef.current[sortOrder] = null;
        }
      }
    });
  }

  function removeGalleryImage(sortOrder: number) {
    setAssetMessage("");
    const previousPreviewUrl = galleryPreviewUrlsRef.current[sortOrder];

    if (previousPreviewUrl) {
      URL.revokeObjectURL(previousPreviewUrl);
      galleryPreviewUrlsRef.current[sortOrder] = null;
    }

    startUploadTransition(async () => {
      try {
        await removeSiteGalleryImageAction(sortOrder);
        setGallerySlots((current) =>
          current.map((slot) =>
            slot.sort_order === sortOrder
              ? { ...slot, id: null, image_url: null }
              : slot,
          ),
        );
        setAssetMessage(`Galerijska slika ${sortOrder + 1} je uklonjena.`);
        router.refresh();
      } catch {
        setAssetMessage("Galerijska slika nije uklonjena. Pokusaj ponovo.");
      }
    });
  }

  return (
    <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(24rem,28rem)] xl:items-start xl:gap-10">
      <form action={formAction} className="min-w-0 space-y-6">
        <input
          type="hidden"
          name="cover_focal_x"
          value={draft.cover_focal_x}
        />
        <input
          type="hidden"
          name="cover_focal_y"
          value={draft.cover_focal_y}
        />
        <section className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-card shadow-sm shadow-black/5">
          <div className="border-b border-border/60 bg-gradient-to-r from-brand-soft/65 via-background to-warm-soft/55 px-5 py-4 sm:px-6">
            <div className="inline-flex items-center rounded-full border border-brand/15 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand shadow-sm shadow-brand/5">
              Sadržaj
            </div>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              Osnovni tekst i kontakt podaci za javnu stranicu za zakazivanje.
            </p>
          </div>

          <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium text-foreground"
              >
                Naziv
              </label>
              <input
                id="name"
                name="name"
                required
                value={draft.name}
                onChange={(event) => setField("name", event.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="intro_text"
                className="text-sm font-medium text-foreground"
              >
                Intro tekst
              </label>
              <textarea
                id="intro_text"
                name="intro_text"
                rows={3}
                value={draft.intro_text}
                onChange={(event) =>
                  setField("intro_text", event.target.value)
                }
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="description"
                className="text-sm font-medium text-foreground"
              >
                Opis
              </label>
              <textarea
                id="description"
                name="description"
                rows={5}
                value={draft.description}
                onChange={(event) =>
                  setField("description", event.target.value)
                }
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="address"
                  className="text-sm font-medium text-foreground"
                >
                  Adresa
                </label>
                <input
                  id="address"
                  name="address"
                  value={draft.address}
                  onChange={(event) => setField("address", event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="city"
                  className="text-sm font-medium text-foreground"
                >
                  Grad
                </label>
                <input
                  id="city"
                  name="city"
                  value={draft.city}
                  onChange={(event) => setField("city", event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="phone"
                className="text-sm font-medium text-foreground"
              >
                Telefon
              </label>
              <input
                id="phone"
                name="phone"
                value={draft.phone}
                onChange={(event) => setField("phone", event.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>
          </div>
        </section>

        <section className="rounded-md border border-border bg-card p-5 sm:p-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">Izgled</h2>
            <p className="text-sm text-muted-foreground">
              Podesi hero deo sa cover slikom i stil sekcija ispod njega.
            </p>
          </div>

          <div className="mt-5 space-y-6">
            <div className="space-y-2">
              <input
                type="hidden"
                id="font_choice"
                name="font_choice"
                value={draft.font_choice}
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Font cele stranice
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ranije 4 opcije realno su se svodile na 2 ista stila. Sada su
                  ostale dve jasne varijante koje se dosledno vide i u preview-u
                  i na javnoj strani.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {fontOptions.map((option) => {
                  const active = draft.font_choice === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setField("font_choice", option.value)}
                      className={
                        active
                          ? "rounded-md border border-ring bg-accent p-4 text-left ring-2 ring-ring/20"
                          : "rounded-md border border-border bg-background p-4 text-left transition hover:bg-accent"
                      }
                    >
                      <span
                        className={`block text-lg font-semibold text-foreground ${option.previewClassName}`}
                      >
                        {option.label}
                      </span>
                      <span
                        className={`mt-2 block text-sm text-muted-foreground ${option.previewClassName}`}
                      >
                        {option.previewText}
                      </span>
                      <span className="mt-3 block text-xs leading-5 text-muted-foreground">
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 rounded-md border border-border bg-background p-4">
              <div>
                <h3 className="font-semibold text-foreground">
                  Hero deo sa cover slikom
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ove boje se odnose na gornji deo stranice: pozadinu ako nema
                  cover slike, naslov, intro tekst i dugmad.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Pozadina hero dela
                  </span>
                  <input
                    type="hidden"
                    name="primary_color"
                    value={draft.primary_color}
                  />
                  <span className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <input
                      type="color"
                      value={
                        hexColorPattern.test(draft.primary_color)
                          ? draft.primary_color
                          : "#000000"
                      }
                      onChange={(event) =>
                        setField("primary_color", event.target.value)
                      }
                      className="h-11 w-14 shrink-0 rounded-lg border border-input bg-background p-1"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">
                        Izaberi boju
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Boja pozadine gornjeg dela stranice.
                      </span>
                    </span>
                  </span>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Tekst i dugmad u hero delu
                  </span>
                  <input
                    type="hidden"
                    name="text_color"
                    value={draft.text_color}
                  />
                  <span className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <input
                      type="color"
                      value={
                        hexColorPattern.test(draft.text_color)
                          ? draft.text_color
                          : "#ffffff"
                      }
                      onChange={(event) =>
                        setField("text_color", event.target.value)
                      }
                      className="h-11 w-14 shrink-0 rounded-lg border border-input bg-background p-1"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">
                        Izaberi boju
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Boja teksta i glavnih dugmadi.
                      </span>
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-3 rounded-md border border-border bg-background p-4">
              <input
                type="hidden"
                name="site_theme"
                value={draft.site_theme}
              />
              <div>
                <h3 className="font-semibold text-foreground">
                  Izgled donjeg dela
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tema za sekcije ispod hero dela: opis, usluge, tim i kontakt.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {siteThemeOptions.map((option) => {
                  const active = draft.site_theme === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setField("site_theme", option.value)}
                      className={
                        active
                          ? "rounded-md border border-ring bg-accent p-3 text-left ring-2 ring-ring/20"
                          : "rounded-md border border-border bg-background p-3 text-left transition hover:bg-accent"
                      }
                    >
                      <span
                        className={`block h-10 rounded-md border ${option.swatchClass}`}
                      />
                      <span className="mt-3 block text-sm font-semibold text-foreground">
                        {option.label}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-border bg-card p-5 sm:p-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">Slike</h2>
            <p className="text-sm text-muted-foreground">
              Logo, cover i galerija se cuvaju odmah po uploadu.
            </p>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <AssetUploader
              inputRef={logoInputRef}
              isUploading={isUploading}
              label="Logo"
              url={draft.logo_url}
              onRemove={() => removeAsset("logo")}
              onUpload={(file) => uploadAsset("logo", file)}
            />
            <AssetUploader
              inputRef={coverInputRef}
              isUploading={isUploading}
              label="Cover fotografija"
              url={coverPreviewUrl ?? draft.cover_url}
              isCover
              onRemove={() => removeAsset("cover")}
              onUpload={(file) => uploadAsset("cover", file)}
            />
          </div>

          <div className="mt-6 space-y-3 rounded-xl border border-border bg-background p-4">
            <div>
              <h3 className="font-semibold text-foreground">Galerija mini sajta</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Ubaci do 6 fotografija. Redosled slotova je isti kao na javnoj stranici.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {gallerySlots.map((slot, index) => (
                <GallerySlotUploader
                  key={slot.sort_order}
                  index={index}
                  isUploading={isUploading}
                  url={slot.image_url}
                  onRemove={() => removeGalleryImage(slot.sort_order)}
                  onUpload={(file) => uploadGalleryImage(slot.sort_order, file)}
                />
              ))}
            </div>
          </div>

          {assetMessage ? (
            <p className="mt-4 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              {isUploading ? "Cuvanje..." : assetMessage}
            </p>
          ) : null}
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={pending}
            className="btn-primary inline-flex min-h-11 items-center justify-center rounded-md px-5 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Cuvanje..." : "Sacuvaj stranicu"}
          </button>
          {state.message ? (
            <p
              className={
                state.ok
                  ? "text-sm font-medium text-foreground"
                  : "text-sm font-medium text-destructive"
              }
              aria-live="polite"
            >
              {state.message}
            </p>
          ) : null}
        </div>
      </form>

      <aside className="xl:sticky xl:top-6 xl:pl-2">
        <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Preview</h2>
          <ShareSiteButton
            slug={provider.slug}
            providerName={draft.name || provider.name}
            className="text-sm font-medium text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 lg:hidden"
            messageClassName="lg:hidden"
          />
        </div>
        <div className="overflow-x-hidden">
          <MiniSitePreview
            draft={draft}
            gallery={gallerySlots}
            services={services}
            slug={provider.slug}
            workers={workers}
            previewCoverUrl={coverPreviewUrl}
            onCoverFocalXChange={(nextValue) =>
              setDraft((current) => ({
                ...current,
                cover_focal_x: normalizeCoverFocalX(nextValue),
              }))
            }
            onCoverFocalYChange={(nextValue) =>
              setDraft((current) => ({
                ...current,
                cover_focal_y: normalizeCoverFocalY(nextValue),
              }))
            }
          />
        </div>
      </aside>
    </div>
  );
}

function AssetUploader({
  inputRef,
  isUploading,
  label,
  onRemove,
  onUpload,
  url,
  isCover = false,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  isUploading: boolean;
  label: string;
  onRemove: () => void;
  onUpload: (file: File) => void;
  url: string | null;
  isCover?: boolean;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-background p-4 shadow-sm shadow-black/5">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {isCover ? (
        <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-3 shadow-sm shadow-black/5">
          <div className="flex aspect-[16/10] items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="px-4 text-center text-sm text-muted-foreground">
                Izaberi cover fotografiju.
              </span>
            )}
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Kadar pomeri direktno na telefonu desno. Tako odmah vidis kako ce
            izgledati na mobilnom.
          </p>
        </div>
      ) : (
        <div className="flex size-24 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="px-3 text-center text-sm text-muted-foreground">
              Nema slike
            </span>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={isUploading}
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            onUpload(file);
          }
        }}
        className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      />
      {url ? (
        <button
          type="button"
          disabled={isUploading}
          onClick={onRemove}
          className="btn-secondary rounded-md px-3 py-2 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          Ukloni
        </button>
      ) : null}
      <p className="text-xs text-muted-foreground">
        JPG, PNG ili WEBP, najvise 5 MB.
      </p>
    </div>
  );
}

function GallerySlotUploader({
  index,
  isUploading,
  onRemove,
  onUpload,
  url,
}: {
  index: number;
  isUploading: boolean;
  onRemove: () => void;
  onUpload: (file: File) => void;
  url: string | null;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm shadow-black/5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">Slika {index + 1}</p>
        <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Slot {index + 1}
        </span>
      </div>
      <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="px-4 text-center text-sm text-muted-foreground">
            Izaberi fotografiju za galeriju.
          </span>
        )}
      </div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={isUploading}
        onChange={(event) => {
          const file = event.target.files?.[0];

          event.target.value = "";

          if (file) {
            onUpload(file);
          }
        }}
        className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      />
      {url ? (
        <button
          type="button"
          disabled={isUploading}
          onClick={onRemove}
          className="btn-secondary rounded-md px-3 py-2 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          Ukloni
        </button>
      ) : null}
      <p className="text-xs text-muted-foreground">
        JPG, PNG ili WEBP, najvise 5 MB.
      </p>
    </div>
  );
}

function MiniSitePreview({
  draft,
  gallery,
  services,
  slug,
  workers,
  previewCoverUrl,
  onCoverFocalXChange,
  onCoverFocalYChange,
}: {
  draft: {
    name: string;
    intro_text: string;
    description: string;
    address: string;
    city: string;
    phone: string;
    logo_url: string | null;
    cover_url: string | null;
    cover_focal_x: number;
    cover_focal_y: number;
    primary_color: string;
    text_color: string;
    font_choice: string;
    site_theme: string;
  };
  gallery: GallerySlot[];
  services: SitePreviewService[];
  slug: string;
  workers: SitePreviewWorker[];
  previewCoverUrl?: string | null;
  onCoverFocalXChange?: (value: number) => void;
  onCoverFocalYChange?: (value: number) => void;
}) {
  const location = [draft.address, draft.city].filter(Boolean).join(", ");
  const heroText = draft.intro_text;
  const theme = getThemeClasses(draft.site_theme);
  const galleryImages = gallery.filter((image) => image.image_url);
  const heroFrameRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startFocalX: number;
    startFocalY: number;
  } | null>(null);
  const [heroImageSize, setHeroImageSize] = useState<{
    url: string;
    width: number;
    height: number;
  } | null>(null);
  const [heroFrameSize, setHeroFrameSize] = useState({
    width: 0,
    height: 0,
  });
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const heroImageUrl = previewCoverUrl ?? draft.cover_url ?? null;

  useEffect(() => {
    if (!heroImageUrl) {
      return;
    }

    let cancelled = false;
    const image = new window.Image();

    image.onload = () => {
      if (cancelled) {
        return;
      }

      setHeroImageSize({
        url: heroImageUrl,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };

    image.onerror = () => {
      if (!cancelled) {
        setHeroImageSize(null);
      }
    };

    image.src = heroImageUrl;

    return () => {
      cancelled = true;
    };
  }, [heroImageUrl]);

  useEffect(() => {
    const frame = heroFrameRef.current;

    if (!frame) {
      return;
    }

    const observer = new window.ResizeObserver((entries) => {
      const nextFrame = entries[0];

      if (!nextFrame) {
        return;
      }

      setHeroFrameSize({
        width: nextFrame.contentRect.width,
        height: nextFrame.contentRect.height,
      });
    });

    observer.observe(frame);

    return () => {
      observer.disconnect();
    };
  }, []);

  const activeHeroImageSize =
    heroImageSize?.url === heroImageUrl ? heroImageSize : null;
  const heroMovement =
    activeHeroImageSize && heroFrameSize.width > 0 && heroFrameSize.height > 0
      ? getCoverDragMetrics(
          heroFrameSize.width,
          heroFrameSize.height,
          activeHeroImageSize.width,
          activeHeroImageSize.height,
        )
      : { overflowX: 0, overflowY: 0 };
  const canMoveHeroX = heroMovement.overflowX > 0;
  const canMoveHeroY = heroMovement.overflowY > 0;

  function updateHeroFocalPoint(clientX: number, clientY: number) {
    const frame = heroFrameRef.current?.getBoundingClientRect();
    const dragState = dragStateRef.current;

    if (!frame || !dragState || !activeHeroImageSize) {
      return;
    }

    const metrics = getCoverDragMetrics(
      frame.width,
      frame.height,
      activeHeroImageSize.width,
      activeHeroImageSize.height,
    );
    const deltaX = clientX - dragState.startClientX;
    const deltaY = clientY - dragState.startClientY;

    if (metrics.overflowX > 0) {
      onCoverFocalXChange?.(
        normalizeCoverFocalX(
          dragState.startFocalX - (deltaX / metrics.overflowX) * 100,
        ),
      );
    }

    if (metrics.overflowY > 0) {
      onCoverFocalYChange?.(
        normalizeCoverFocalY(
          dragState.startFocalY - (deltaY / metrics.overflowY) * 100,
        ),
      );
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="max-w-[15rem] text-sm leading-6 text-muted-foreground">
          Prevuci cover direktno na telefonu da namestis kadar za mobilni hero.
        </p>
        <button
          type="button"
          disabled={!heroImageUrl}
          onClick={() => {
            onCoverFocalXChange?.(50);
            onCoverFocalYChange?.(50);
          }}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Centriraj
        </button>
      </div>
      <div className="mx-auto w-full max-w-[min(100%,24rem)] overflow-hidden rounded-[1.25rem] border-4 border-foreground bg-background shadow-sm min-[380px]:rounded-[2rem] min-[380px]:border-8">
      <div className="h-5 bg-foreground min-[380px]:h-6" />
      <div className={`min-h-[42rem] ${getSiteFontClass(draft.font_choice)}`}>
        <section
          ref={heroFrameRef}
          className="relative flex min-h-[31rem] flex-col justify-end overflow-hidden px-4 pb-5 pt-16 min-[380px]:min-h-[32rem] min-[380px]:px-5 min-[380px]:pb-6 min-[380px]:pt-20"
          style={{
            backgroundColor: draft.primary_color,
            color: draft.text_color,
            touchAction: "none",
          }}
          onPointerDown={(event) => {
            if (!heroImageUrl) {
              return;
            }

            dragStateRef.current = {
              pointerId: event.pointerId,
              startClientX: event.clientX,
              startClientY: event.clientY,
              startFocalX: draft.cover_focal_x,
              startFocalY: draft.cover_focal_y,
            };
            setIsDraggingCover(true);
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (dragStateRef.current?.pointerId !== event.pointerId) {
              return;
            }

            updateHeroFocalPoint(event.clientX, event.clientY);
          }}
          onPointerUp={(event) => {
            if (dragStateRef.current?.pointerId !== event.pointerId) {
              return;
            }

            dragStateRef.current = null;
            setIsDraggingCover(false);
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            dragStateRef.current = null;
            setIsDraggingCover(false);
          }}
        >
          {heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroImageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                cursor: isDraggingCover ? "grabbing" : "grab",
                objectPosition: `${draft.cover_focal_x}% ${draft.cover_focal_y}%`,
              }}
            />
          ) : null}
          {heroImageUrl ? (
            <>
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/22 to-black/55" />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/25 to-transparent" />
            </>
          ) : null}
          <div className="relative">
            {draft.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draft.logo_url}
                alt=""
                className="mb-4 size-14 rounded-2xl border border-white/30 bg-white object-cover shadow-sm shadow-black/15"
              />
            ) : null}
            <div className="rounded-[1.5rem] border border-white/15 bg-black/28 p-4 shadow-sm shadow-black/20">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/28 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/90">
                <span>Online zakazivanje</span>
                <span className="h-1 w-1 rounded-full bg-white/60" />
                <span>zakazi.pro/{slug}</span>
              </div>
              <h3 className="mt-4 break-words text-[clamp(1.9rem,11vw,2.35rem)] font-bold leading-[0.98] tracking-tight">
                {draft.name || "Naziv stranice"}
              </h3>
              {heroText ? (
                <p className="mt-4 break-words text-sm leading-6 text-white/88">
                  {heroText}
                </p>
              ) : null}
              <div className="mt-5 grid gap-2">
                <span
                  className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold shadow-sm shadow-black/10"
                  style={{
                    backgroundColor: draft.text_color,
                    color: draft.primary_color,
                  }}
                >
                  Zakazi termin
                </span>
                {draft.phone ? (
                  <span
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold"
                    style={{
                      borderColor: "color-mix(in oklab, white 24%, transparent)",
                      color: draft.text_color,
                    }}
                  >
                    Pozovi
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section
          className={`space-y-4 px-4 py-5 min-[380px]:px-5 ${theme.page}`}
        >
          {draft.description ? (
            <div className={`rounded-md border p-4 ${theme.card}`}>
              <p
                className={`whitespace-pre-line break-words text-sm leading-6 ${theme.muted}`}
              >
                {draft.description}
              </p>
            </div>
          ) : null}

          {galleryImages.length ? (
            <div className={`rounded-md border p-4 ${theme.card}`}>
              <h4 className={`text-xl font-bold ${theme.heading}`}>Galerija</h4>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {galleryImages.map((image) => (
                  <div
                    key={image.sort_order}
                    className="relative aspect-[4/5] overflow-hidden rounded-xl border border-black/5 bg-black/5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.image_url ?? ""}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <h4 className={`text-xl font-bold ${theme.heading}`}>Usluge</h4>
            <div className={`mt-3 divide-y rounded-md border ${theme.card} ${theme.border}`}>
              {services.length ? (
                services.map((service) => (
                  <div
                    key={service.id}
                    className="flex flex-col gap-2 p-3 min-[360px]:flex-row min-[360px]:items-start min-[360px]:justify-between min-[360px]:gap-3"
                  >
                    <div>
                      <p className={`text-sm font-semibold ${theme.heading}`}>
                        {service.name}
                      </p>
                      <p className={`mt-1 text-xs ${theme.muted}`}>
                        {service.duration_minutes} min
                      </p>
                    </div>
                    <p className={`text-xs font-semibold min-[360px]:shrink-0 ${theme.heading}`}>
                      {formatPrice(service.price)}
                    </p>
                  </div>
                ))
              ) : (
                <p className={`p-3 text-sm ${theme.muted}`}>
                  Usluge jos nisu objavljene.
                </p>
              )}
            </div>
          </div>

          <div className={`rounded-md border p-4 ${theme.card}`}>
            <h4 className={`font-semibold ${theme.heading}`}>Tim</h4>
            <div className="mt-3 space-y-3">
              {workers.length ? (
                workers.slice(0, 4).map((worker) => (
                  <div key={worker.id} className="flex items-center gap-3">
                    {worker.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={worker.photo_url}
                        alt=""
                        className="size-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${theme.avatar}`}
                      >
                        {worker.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className={`break-words text-sm font-medium ${theme.heading}`}>
                        {worker.name}
                      </p>
                      {worker.bio ? (
                        <p
                          className={`mt-0.5 line-clamp-2 break-words text-xs leading-5 ${theme.muted}`}
                        >
                          {worker.bio}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className={`text-sm ${theme.muted}`}>
                  Tim jos nije objavljen.
                </p>
              )}
            </div>
          </div>

          <div className={`rounded-md border p-4 ${theme.card}`}>
            <h4 className={`font-semibold ${theme.heading}`}>Kontakt</h4>
            <div className={`mt-2 space-y-1 text-sm ${theme.muted}`}>
              {location ? <p>{location}</p> : null}
              {draft.phone ? <p>{draft.phone}</p> : null}
              <p>zakazi.pro/{slug}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
          {canMoveHeroX ? "Mozes levo-desno" : "Sirina je vec uskladjena"}
        </span>
        <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
          {canMoveHeroY ? "Mozes gore-dole" : "Visina je vec uskladjena"}
        </span>
      </div>
    </div>
  );
}
