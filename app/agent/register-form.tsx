"use client";

import { useActionState, useState } from "react";
import {
  registerProviderForClientAction,
  type AgentRegisterState,
} from "./actions";
import { createProviderSlug } from "@/lib/slug";

const initialState: AgentRegisterState = {
  status: "idle",
  message: "",
};

type FieldDefaults = {
  provider_name: string;
  email: string;
  phone: string;
  city: string;
};

function FormFields({
  defaultValues,
  pending,
}: {
  defaultValues: FieldDefaults;
  pending: boolean;
}) {
  const [providerName, setProviderName] = useState(defaultValues.provider_name);
  const slug = createProviderSlug(providerName);

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <label
            htmlFor="provider_name"
            className="text-sm font-medium text-foreground"
          >
            Naziv salona
          </label>
          <input
            id="provider_name"
            name="provider_name"
            required
            value={providerName}
            onChange={(event) => setProviderName(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
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
            URL pravimo automatski po nazivu. Klijent ga može menjati kasnije.
          </p>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label
            htmlFor="email"
            className="text-sm font-medium text-foreground"
          >
            Email klijenta
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={defaultValues.email}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
          <p className="text-xs text-muted-foreground">
            Klijent se sa ovim emailom prijavljuje. Email mora biti dostupan
            klijentu (za reset lozinke kasnije).
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium text-foreground">
            Telefon
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={defaultValues.phone}
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
            defaultValue={defaultValues.city}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:w-auto"
      >
        {pending ? "Registrujem..." : "Registruj salon"}
      </button>
    </>
  );
}

export function RegisterProviderForm() {
  const [state, formAction, pending] = useActionState(
    registerProviderForClientAction,
    initialState,
  );
  const [copied, setCopied] = useState(false);

  const defaultValues: FieldDefaults = {
    provider_name: state.fields?.provider_name ?? "",
    email: state.fields?.email ?? "",
    phone: state.fields?.phone ?? "",
    city: state.fields?.city ?? "",
  };

  const formKey =
    state.status === "success"
      ? `success-${state.providerSlug ?? ""}`
      : "form";

  async function copyPassword() {
    if (!state.generatedPassword) {
      return;
    }
    try {
      await navigator.clipboard.writeText(state.generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-5">
      {state.status === "success" && state.generatedPassword ? (
        <div className="rounded-md border border-green-500/40 bg-green-500/10 p-5 text-foreground">
          <p className="text-sm font-semibold text-green-700 dark:text-green-300">
            Salon &quot;{state.providerName}&quot; je registrovan
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Privremenu lozinku vidiš samo jednom. Vlasnik može odmah na /login
            da izabere &quot;Zaboravili ste lozinku?&quot; i postavi svoju lozinku
            preko emaila.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <code className="rounded-md border border-border bg-background px-3 py-2 font-mono text-base font-bold tracking-wider text-foreground">
              {state.generatedPassword}
            </code>
            <button
              type="button"
              onClick={copyPassword}
              className="btn-secondary inline-flex min-h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-foreground"
            >
              {copied ? "Kopirano ✓" : "Kopiraj"}
            </button>
          </div>
          {state.providerSlug ? (
            <p className="mt-3 text-xs text-muted-foreground">
              URL salona: zakazi.pro/{state.providerSlug}
            </p>
          ) : null}
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {state.message}
        </div>
      ) : null}

      <form action={formAction} className="space-y-5">
        <FormFields
          key={formKey}
          defaultValues={defaultValues}
          pending={pending}
        />
      </form>
    </div>
  );
}
