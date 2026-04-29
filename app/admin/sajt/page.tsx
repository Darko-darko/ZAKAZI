import Link from "next/link";
import { SiteEditor } from "./site-editor";
import { ShareSiteButton } from "./share-site-button";
import { getCurrentProvider } from "@/lib/admin/provider";

export const metadata = {
  title: "Mini sajt | zakazi.pro",
};

export default async function AdminSitePage() {
  const { supabase, provider: currentProvider } = await getCurrentProvider();
  const providerSelect =
    "id, name, slug, description, intro_text, address, city, phone, logo_url, cover_url, primary_color, text_color, font_choice";
  const providerWithThemeResult = await supabase
    .from("providers")
    .select(`${providerSelect}, site_theme`)
    .eq("id", currentProvider.id)
    .eq("user_id", currentProvider.user_id)
    .maybeSingle();
  const providerResult = providerWithThemeResult.error
    ? await supabase
        .from("providers")
        .select(providerSelect)
        .eq("id", currentProvider.id)
        .eq("user_id", currentProvider.user_id)
        .maybeSingle()
    : providerWithThemeResult;
  const provider = providerResult.data
    ? {
        ...providerResult.data,
        site_theme:
          "site_theme" in providerResult.data &&
          typeof providerResult.data.site_theme === "string"
            ? providerResult.data.site_theme
            : "default",
      }
    : null;

  if (!provider) {
    throw new Error("Mini sajt nije pronadjen.");
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
    <main className="flex flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              Admin
            </Link>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              Mini sajt
            </h1>
            <p className="text-muted-foreground">
              Uredi javnu stranicu za zakazi.pro/{provider.slug}
            </p>
          </div>
          <ShareSiteButton
            slug={provider.slug}
            providerName={provider.name}
            className="btn-secondary inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          />
        </header>

        <SiteEditor
          provider={provider}
          services={services ?? []}
          workers={workers ?? []}
        />
      </section>
    </main>
  );
}
