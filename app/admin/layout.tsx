import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { getCurrentProvider } from "@/lib/admin/provider";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { provider } = await getCurrentProvider();
  const isSuspended = provider.plan_status === "suspended";
  const isCancelled = provider.plan_status === "cancelled";
  const navItems = [
    { href: "/admin/termini", label: "Termini" },
    { href: "/admin/sajt", label: "Javna strana" },
    { href: "/admin/nalog", label: "Nalog" },
    { href: "/admin/naplata", label: "Naplata" },
  ];

  return (
    <>
      {isSuspended || isCancelled ? (
        <div className="border-b border-warm/30 bg-warm-soft/80 px-4 py-3 text-sm text-foreground sm:px-6">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {isSuspended
                ? "Nalog je trenutno suspendovan, pa je javno online zakazivanje iskljuceno."
                : "Nalog je otkazan, pa je javno online zakazivanje iskljuceno."}
            </p>
            <Link
              href="/admin/naplata"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Otvori naplatu
            </Link>
          </div>
        </div>
      ) : null}
      <div className="border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex min-h-9 items-center justify-center rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground transition hover:bg-accent"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <form action={logoutAction}>
            <button className="inline-flex min-h-9 items-center justify-center rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground transition hover:bg-accent">
              Odjavi se
            </button>
          </form>
        </div>
      </div>
      {children}
    </>
  );
}
