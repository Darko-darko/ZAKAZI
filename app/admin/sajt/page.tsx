import Link from "next/link";
import { SiteEditor } from "./site-editor";
import { ShareSiteButton } from "./share-site-button";
import { getCurrentProvider } from "@/lib/admin/provider";

export const metadata = {
  title: "Vasa stranica | zakazi.pro",
};

export default async function AdminSitePage() {
  const { supabase, provider: currentProvider } = await getCurrentProvider();
  const providerBaseSelect =
    "id, name, slug, description, intro_text, address, city, phone, logo_url, cover_url, cover_focal_x, cover_focal_y, primary_color, text_color, font_choice";
  const providerFallbackSelect =
    "id, name, slug, description, intro_text, address, city, phone, logo_url, cover_url, primary_color, text_color, font_choice";
  const providerWithThemeResult = await supabase
    .from("providers")
    .select(`${providerBaseSelect}, site_theme`)
    .eq("id", currentProvider.id)
    .eq("user_id", currentProvider.user_id)
    .maybeSingle();
  const providerResult = providerWithThemeResult.error
    ? await supabase
        .from("providers")
        .select(providerFallbackSelect)
        .eq("id", currentProvider.id)
        .eq("user_id", currentProvider.user_id)
        .maybeSingle()
    : providerWithThemeResult;
  const provider = providerResult.data
    ? {
        ...providerResult.data,
        cover_focal_x:
          "cover_focal_x" in providerResult.data &&
          typeof providerResult.data.cover_focal_x === "number"
            ? providerResult.data.cover_focal_x
            : 50,
        cover_focal_y:
          "cover_focal_y" in providerResult.data &&
          typeof providerResult.data.cover_focal_y === "number"
            ? providerResult.data.cover_focal_y
            : 50,
        site_theme:
          "site_theme" in providerResult.data &&
          typeof providerResult.data.site_theme === "string"
            ? providerResult.data.site_theme
            : "default",
      }
    : null;

  if (!provider) {
    throw new Error("Stranica nije pronadjena.");
  }

  const [{ data: services }, { data: workers }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, duration_minutes, price, sort_order")
      .eq("provider_id", currentProvider.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("workers")
      .select("id, name, photo_url, bio, created_at")
      .eq("provider_id", currentProvider.id)
      .eq("is_active", true)
      .is("archived_at", null)
      .order("created_at", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  return (
    <main className="flex flex-1 bg-[radial-gradient(circle_at_top,theme(colors.brand-soft),transparent_42%),linear-gradient(to_bottom,theme(colors.background),theme(colors.background))] px-4 py-8 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-[92rem] space-y-8">
        <header className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-sm shadow-black/5">
          <div className="flex flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                <span>Admin</span>
                <span className="h-1 w-1 rounded-full bg-brand/40" />
                <span>Editor stranice</span>
              </div>
              <div className="space-y-2">
                <Link
                  href="/admin"
                  className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
                >
                  Admin
                </Link>
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Vasa stranica
                </h1>
                <p className="max-w-xl text-muted-foreground">
                  Uredi javnu stranicu za zakazi.pro/{provider.slug}
                </p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-border/70 bg-gradient-to-br from-background via-background to-warm-soft p-4 sm:min-w-[18rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Javni link
              </p>
              <p className="mt-2 text-sm text-foreground">
                Podeli svoju stranicu sa klijentima ili je proveri uzivo.
              </p>
              <div className="mt-4">
                <ShareSiteButton
                  slug={provider.slug}
                  providerName={provider.name}
                  className="btn-secondary inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-8">
          <div className="space-y-8">
            <SiteEditor
              provider={provider}
              services={services ?? []}
              workers={workers ?? []}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
