"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type OnboardingAccessProps = {
  code?: string;
  linkError?: string;
};

type AccessStatus = "checking" | "ready" | "invalid";

export function OnboardingAccess({
  code,
  linkError,
}: OnboardingAccessProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<AccessStatus>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function prepareSession() {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const hashError =
        hashParams.get("error") || hashParams.get("error_description");
      const hasHashSession =
        hashParams.get("access_token") && hashParams.get("type") === "signup";

      if (linkError || hashError) {
        setStatus("invalid");
        setMessage(
          "Link za potvrdu je istekao ili nije validan. Zatražite novu potvrdu emaila.",
        );
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (ignore) {
          return;
        }

        if (error) {
          setStatus("invalid");
          setMessage(
            "Link za potvrdu je istekao ili nije validan. Zatražite novu potvrdu emaila.",
          );
          return;
        }

        window.history.replaceState({}, "", "/register/onboarding");
        setStatus("ready");
        router.refresh();
        return;
      }

      if (!hasHashSession) {
        setStatus("invalid");
        setMessage("Prijavi se da nastaviš onboarding ili zatraži novu potvrdu emaila.");
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (ignore) {
        return;
      }

      if (!data.session) {
        setStatus("invalid");
        setMessage(
          "Link za potvrdu je istekao ili nije validan. Zatražite novu potvrdu emaila.",
        );
        return;
      }

      window.history.replaceState({}, "", "/register/onboarding");
      setStatus("ready");
      router.refresh();
    }

    void prepareSession();

    return () => {
      ignore = true;
    };
  }, [code, linkError, router, supabase]);

  if (status === "checking" || status === "ready") {
    return (
      <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
        Proveravamo potvrdu naloga...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {message}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/login"
          className="btn-primary inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 font-medium text-primary-foreground sm:w-auto"
        >
          Prijavi se
        </Link>
        <Link
          href="/register"
          className="inline-flex w-full items-center justify-center rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent sm:w-auto"
        >
          Nazad na registraciju
        </Link>
      </div>
    </div>
  );
}
