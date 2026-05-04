"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthActionState } from "@/app/auth/actions";
import { PasswordInput } from "@/app/auth/password-input";
import { ResendConfirmationForm } from "@/app/auth/resend-confirmation-form";

const initialState: AuthActionState = {
  status: "idle",
  message: "",
};

type LoginFormProps = {
  notice?: string;
};

export function LoginForm({ notice }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.fields?.email}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
      </div>

      <PasswordInput
        id="password"
        name="password"
        label="Lozinka"
        autoComplete="current-password"
        required
      />

      {notice && state.status === "idle" ? (
        <p className="rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300">
          {notice}
        </p>
      ) : null}

      {state.message ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      {state.canResendConfirmation && state.fields?.email ? (
        <ResendConfirmationForm email={state.fields.email} />
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Prijava..." : "Prijavi se"}
      </button>

      <p className="text-center text-sm">
        <Link href="/forgot-password" className="font-medium text-foreground">
          Zaboravili ste lozinku?
        </Link>
      </p>

      <p className="text-center text-sm text-muted-foreground">
        Nemaš nalog?{" "}
        <Link href="/register" className="font-medium text-foreground">
          Registruj nalog
        </Link>
      </p>
    </form>
  );
}
