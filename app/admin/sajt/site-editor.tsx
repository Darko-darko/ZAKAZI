"use client";

import { useRouter } from "next/navigation";
import { useActionState, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  type SiteBrandingState,
  updateSiteAssetAction,
  updateSiteBrandingAction,
} from "./actions";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxFileSize = 5 * 1024 * 1024;
const hexColorPattern = /^#[0-9a-fA-F]{6}$/;

type FontChoice = "default" | "serif" | "modern" | "elegant";
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
  primary_color: string;
  text_color: string;
  font_choice: string;
  site_theme: string;
};

type SiteEditorProps = {
  provider: SiteEditorProvider;
  services: SitePreviewService[];
  workers: SitePreviewWorker[];
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

function getFontClass(fontChoice: string) {
  if (fontChoice === "serif") {
    return "font-serif";
  }

  if (fontChoice === "modern") {
    return "font-sans";
  }

  if (fontChoice === "elegant") {
    return "font-serif";
  }

  return "font-sans";
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

const initialState: SiteBrandingState = {
  ok: false,
  message: "",
};

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

export function SiteEditor({ provider, services, workers }: SiteEditorProps) {
  const router = useRouter();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState(
    updateSiteBrandingAction,
    initialState,
  );
  const [isUploading, startUploadTransition] = useTransition();
  const [assetMessage, setAssetMessage] = useState("");
  const [draft, setDraft] = useState({
    name: provider.name,
    intro_text: provider.intro_text ?? "",
    description: provider.description ?? "",
    address: provider.address ?? "",
    city: provider.city ?? "",
    phone: provider.phone ?? "",
    logo_url: provider.logo_url,
    cover_url: provider.cover_url,
    primary_color: provider.primary_color,
    text_color: provider.text_color,
    font_choice: (["default", "serif", "modern", "elegant"].includes(
      provider.font_choice,
    )
      ? provider.font_choice
      : "default") as FontChoice,
    site_theme: (["default", "light", "dark"].includes(provider.site_theme)
      ? provider.site_theme
      : "default") as SiteTheme,
  });

  function setField(field: keyof typeof draft, value: string | null) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

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

  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
      <form action={formAction} className="min-w-0 space-y-6">
        <section className="rounded-md border border-border bg-card p-5 sm:p-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">Sadrzaj</h2>
            <p className="text-sm text-muted-foreground">
              Osnovni tekst i kontakt podaci za javni mini sajt.
            </p>
          </div>

          <div className="mt-5 space-y-5">
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
              <label
                htmlFor="font_choice"
                className="text-sm font-medium text-foreground"
              >
                Font celog mini sajta
              </label>
              <select
                id="font_choice"
                name="font_choice"
                value={draft.font_choice}
                onChange={(event) =>
                  setField("font_choice", event.target.value)
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              >
                <option value="default">Default</option>
                <option value="modern">Modern</option>
                <option value="serif">Serif</option>
                <option value="elegant">Elegant</option>
              </select>
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
                  <span className="flex gap-3">
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
                      className="h-11 w-14 rounded-md border border-input bg-background p-1"
                    />
                    <input
                      name="primary_color"
                      value={draft.primary_color}
                      onChange={(event) =>
                        setField("primary_color", event.target.value)
                      }
                      className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                    />
                  </span>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Tekst i dugmad u hero delu
                  </span>
                  <span className="flex gap-3">
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
                      className="h-11 w-14 rounded-md border border-input bg-background p-1"
                    />
                    <input
                      name="text_color"
                      value={draft.text_color}
                      onChange={(event) =>
                        setField("text_color", event.target.value)
                      }
                      className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                    />
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
              Logo i cover se cuvaju odmah po uploadu.
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
              url={draft.cover_url}
              wide
              onRemove={() => removeAsset("cover")}
              onUpload={(file) => uploadAsset("cover", file)}
            />
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
            {pending ? "Cuvanje..." : "Sacuvaj mini sajt"}
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

      <aside className="lg:sticky lg:top-6">
        <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Preview</h2>
          <a
            href={`/${provider.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            Otvori javno
          </a>
        </div>
        <div className="overflow-x-hidden">
          <MiniSitePreview
            draft={draft}
            services={services}
            slug={provider.slug}
            workers={workers}
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
  wide = false,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  isUploading: boolean;
  label: string;
  onRemove: () => void;
  onUpload: (file: File) => void;
  url: string | null;
  wide?: boolean;
}) {
  return (
    <div className="space-y-3 rounded-md border border-border bg-background p-4">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div
        className={
          wide
            ? "flex aspect-[16/9] items-center justify-center overflow-hidden rounded-md border border-border bg-muted"
            : "flex size-24 items-center justify-center overflow-hidden rounded-md border border-border bg-muted"
        }
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="px-3 text-center text-sm text-muted-foreground">
            Nema slike
          </span>
        )}
      </div>
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

function MiniSitePreview({
  draft,
  services,
  slug,
  workers,
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
    primary_color: string;
    text_color: string;
    font_choice: string;
    site_theme: string;
  };
  services: SitePreviewService[];
  slug: string;
  workers: SitePreviewWorker[];
}) {
  const location = [draft.address, draft.city].filter(Boolean).join(", ");
  const heroText = draft.intro_text;
  const theme = getThemeClasses(draft.site_theme);

  return (
    <div className="mx-auto w-full max-w-[min(100%,24rem)] overflow-hidden rounded-[1.25rem] border-4 border-foreground bg-background shadow-sm min-[380px]:rounded-[2rem] min-[380px]:border-8">
      <div className="h-5 bg-foreground min-[380px]:h-6" />
      <div className={`min-h-[42rem] ${getFontClass(draft.font_choice)}`}>
        <section
          className="relative flex min-h-[26rem] flex-col justify-end overflow-hidden px-4 pb-5 pt-16 min-[380px]:min-h-[28rem] min-[380px]:px-5 min-[380px]:pb-6 min-[380px]:pt-20"
          style={{
            backgroundColor: draft.primary_color,
            color: draft.text_color,
          }}
        >
          {draft.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draft.cover_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
          {draft.cover_url ? (
            <div className="absolute inset-0 bg-black/45" />
          ) : null}
          <div className="relative">
            {draft.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draft.logo_url}
                alt=""
                className="mb-4 size-14 rounded-md border border-white/40 bg-white object-cover"
              />
            ) : null}
            <p className="text-xs font-semibold uppercase">
              Online zakazivanje
            </p>
            <h3 className="mt-2 break-words text-[clamp(1.75rem,11vw,2.25rem)] font-bold leading-tight">
              {draft.name || "Naziv mini sajta"}
            </h3>
            {heroText ? (
              <p className="mt-4 break-words text-sm leading-6 opacity-90">
                {heroText}
              </p>
            ) : null}
            <div className="mt-5 grid gap-2">
              <span
                className="inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold"
                style={{
                  backgroundColor: draft.text_color,
                  color: draft.primary_color,
                }}
              >
                Zakazi termin
              </span>
              {draft.phone ? (
                <span
                  className="inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold"
                  style={{
                    backgroundColor: draft.primary_color,
                    color: draft.text_color,
                  }}
                >
                  Pozovi
                </span>
              ) : null}
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
  );
}
