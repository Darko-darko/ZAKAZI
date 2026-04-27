"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registerAction, type AuthActionState } from "@/app/auth/actions";
import { PasswordInput } from "@/app/auth/password-input";
import { createProviderSlug } from "@/lib/slug";

const initialState: AuthActionState = {
  status: "idle",
  message: "",
};

type RegisterFormProps = {
  refCode?: string;
};

export function RegisterForm({ refCode = "" }: RegisterFormProps) {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState,
  );

  const field = (name: string, fallback = "") => state.fields?.[name] ?? fallback;
  const [providerName, setProviderName] = useState(field("provider_name"));
  const slug = createProviderSlug(providerName);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="ref" value={field("ref", refCode)} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <label
            htmlFor="provider_name"
            className="text-sm font-medium text-foreground"
          >
            Naziv naloga
          </label>
          <input
            id="provider_name"
            name="provider_name"
            required
            value={providerName}
            onChange={(event) => setProviderName(event.target.value)}
            placeholder="Studio Mila"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <p className="text-sm font-medium text-foreground">URL stranice</p>
          <div className="flex rounded-md border border-border bg-muted">
            <span className="shrink-0 border-r border-border px-3 py-2 text-sm text-muted-foreground">
              zakazi.pro/
            </span>
            <span className="min-w-0 flex-1 px-3 py-2 text-sm font-medium text-foreground">
              {slug}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            URL pravimo automatski po nazivu. Ako je zauzet, sistem dodaje broj.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email vlasnika
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={field("email")}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <PasswordInput
          id="password"
          name="password"
          label="Lozinka"
          autoComplete="new-password"
          required
          minLength={8}
        />

        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium text-foreground">
            Telefon
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={field("phone")}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="city" className="text-sm font-medium text-foreground">
            Grad
          </label>
          <input
            id="city"
            name="city"
            defaultValue={field("city")}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
      </div>

      {refCode ? (
        <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          Registracija koristi referral kod:{" "}
          <span className="font-medium text-foreground">{refCode}</span>
        </p>
      ) : null}

      {state.message ? (
        <p
          className={
            state.status === "success"
              ? "rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground"
              : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || state.status === "success"}
        className="w-full rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Kreiranje naloga..." : "Registruj nalog"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Već imaš nalog?{" "}
        <Link href="/login" className="font-medium text-foreground">
          Prijavi se
        </Link>
      </p>
    </form>
  );
}
