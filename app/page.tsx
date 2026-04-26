import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-24">
      <div className="max-w-2xl w-full text-center space-y-6">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
          Online zakazivanje termina
        </h1>
        <p className="text-lg text-muted-foreground">
          Salon, studio ili ordinacija — dobijaš mini sajt sa booking
          funkcijom za par minuta. Klijenti zakazuju termin bez poziva,
          24 sata dnevno.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-6 py-3 font-medium hover:opacity-90 transition"
          >
            Registruj nalog
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md border border-border text-foreground px-6 py-3 font-medium hover:bg-accent transition"
          >
            Prijavi se
          </Link>
        </div>
      </div>
    </main>
  );
}
