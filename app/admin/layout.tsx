import Link from "next/link";
import { getCurrentProvider } from "@/lib/admin/provider";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { provider } = await getCurrentProvider();
  const isSuspended = provider.plan_status === "suspended";
  const isCancelled = provider.plan_status === "cancelled";

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
      {children}
    </>
  );
}
