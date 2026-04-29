"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import {
  updatePasswordAction,
  type AuthActionState,
} from "@/app/auth/actions";
import { PasswordInput } from "@/app/auth/password-input";
import { createClient } from "@/lib/supabase/client";

const initialState: AuthActionState = {
  status: "idle",
  message: "",
};

type ExchangeStatus = "checking" | "ready" | "invalid";

type ResetPasswordFormProps = {
  code?: string;
  linkError?: string;
};

export function ResetPasswordForm({
  code,
  linkError,
}: ResetPasswordFormProps) {
  const [state, formAction, pending] = useActionState(
    updatePasswordAction,
    initialState,
  );
  const [exchangeStatus, setExchangeStatus] =
    useState<ExchangeStatus>("checking");
  const [exchangeMessage, setExchangeMessage] = useState("");
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let ignore = false;

    async function prepareSession() {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const hashError =
        hashParams.get("error") || hashParams.get("error_description");
      const hasHashSession =
        hashParams.get("access_token") && hashParams.get("type") === "recovery";

      if (linkError || hashError) {
        setExchangeStatus("invalid");
        setExchangeMessage(
          "Reset link je istekao ili nije validan. Zatražite novi link.",
        );
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (ignore) {
          return;
        }
        if (error) {
          setExchangeStatus("invalid");
          setExchangeMessage(
            "Reset link je istekao ili nije validan. Zatražite novi link.",
          );
          return;
        }
        window.history.replaceState({}, "", "/reset-password");
        setExchangeStatus("ready");
        return;
      }

      if (!hasHashSession) {
        setExchangeStatus("invalid");
        setExchangeMessage(
          "Reset link je istekao ili nije validan. Zatražite novi link.",
        );
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (ignore) {
        return;
      }
      if (data.session) {
        window.history.replaceState({}, "", "/reset-password");
        setExchangeStatus("ready");
      } else {
        setExchangeStatus("invalid");
        setExchangeMessage(
          "Reset link je istekao ili nije validan. Zatražite novi link.",
        );
      }
    }

    void prepareSession();

    return () => {
      ignore = true;
    };
  }, [code, linkError, supabase]);

  if (exchangeStatus === "checking") {
    return (
      <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
        Proveravamo reset link...
      </p>
    );
  }

  if (exchangeStatus === "invalid") {
    return (
      <div className="space-y-5">
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {exchangeMessage}
        </p>
        <Link
          href="/forgot-password"
          className="btn-primary inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 font-medium text-primary-foreground"
        >
          Zatraži novi reset link
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <PasswordInput
        id="password"
        name="password"
        label="Nova lozinka"
        autoComplete="new-password"
        required
        minLength={8}
      />

      <PasswordInput
        id="confirm_password"
        name="confirm_password"
        label="Potvrda lozinke"
        autoComplete="new-password"
        required
        minLength={8}
      />

      {state.message ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full rounded-md px-4 py-2.5 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Čuvanje..." : "Promeni lozinku"}
      </button>
    </form>
  );
}
