"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PasswordInput } from "@/app/auth/password-input";
import {
  deleteAccountAction,
  initialState,
  type AccountActionState,
  updateAccountPasswordAction,
  updateLoginEmailAction,
  updateNotificationEmailsAction,
} from "./actions";

function MessageBox({ state }: { state: AccountActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={
        state.status === "success"
          ? "rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300"
          : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      }
    >
      {state.message}
    </p>
  );
}

export function AccountSettingsForm({
  currentLoginEmail,
  notificationEmails,
}: {
  currentLoginEmail: string;
  notificationEmails: string;
}) {
  const [notificationsState, notificationsAction, notificationsPending] =
    useActionState(updateNotificationEmailsAction, initialState);
  const [loginEmailState, loginEmailAction, loginEmailPending] = useActionState(
    updateLoginEmailAction,
    initialState,
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    updateAccountPasswordAction,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteAccountAction,
    initialState,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">
            Login email
          </h2>
          <p className="text-sm text-muted-foreground">
            Ovaj email koristis za prijavu. Posle promene moraces da potvrdis novu adresu preko email poruke.
          </p>
        </div>

        <form action={loginEmailAction} className="mt-5 space-y-4">
          <div className="space-y-2">
            <label htmlFor="login_email" className="text-sm font-medium text-foreground">
              Novi login email
            </label>
            <input
              id="login_email"
              name="login_email"
              type="email"
              defaultValue={currentLoginEmail}
              autoComplete="email"
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
            <p className="text-xs text-muted-foreground">
              Trenutno: {currentLoginEmail}
            </p>
          </div>

          <MessageBox state={loginEmailState} />

          <button
            type="submit"
            disabled={loginEmailPending}
            className="btn-primary inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loginEmailPending ? "Cuvanje..." : "Promeni login email"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">
            Lozinka
          </h2>
          <p className="text-sm text-muted-foreground">
            Promeni lozinku dok si prijavljen. Ako je ikad zaboravis, reset link je dostupan i na strani za prijavu.
          </p>
        </div>

        <form action={passwordAction} className="mt-5 space-y-4">
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
            label="Potvrda nove lozinke"
            autoComplete="new-password"
            required
            minLength={8}
          />

          <MessageBox state={passwordState} />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={passwordPending}
              className="btn-primary inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {passwordPending ? "Cuvanje..." : "Promeni lozinku"}
            </button>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-foreground underline underline-offset-4"
            >
              Zaboravljena lozinka
            </Link>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">
            Emailovi za obavestenja
          </h2>
          <p className="text-sm text-muted-foreground">
            Ovde unesi jednu ili vise email adresa za booking admin obavestenja, reminder poruke i predracune.
          </p>
        </div>

        <form action={notificationsAction} className="mt-5 space-y-4">
          <div className="space-y-2">
            <label htmlFor="notification_emails" className="text-sm font-medium text-foreground">
              Primaoci obavestenja
            </label>
            <textarea
              id="notification_emails"
              name="notification_emails"
              rows={5}
              defaultValue={notificationEmails}
              placeholder={"vlasnik@studio.rs\nrecepcija@studio.rs"}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
            <p className="text-xs text-muted-foreground">
              Razdvoji adrese novim redom, zarezom ili tacka-zarezom.
            </p>
          </div>

          <MessageBox state={notificationsState} />

          <button
            type="submit"
            disabled={notificationsPending}
            className="btn-primary inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {notificationsPending ? "Cuvanje..." : "Sacuvaj emailove"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-destructive/20 bg-card p-5 shadow-sm sm:p-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">
            Brisanje naloga
          </h2>
          <p className="text-sm text-muted-foreground">
            Brisanjem naloga uklanjas pristup i podatke povezane sa tim nalogom. Ova akcija je trajna.
          </p>
        </div>

        <form action={deleteAction} className="mt-5 space-y-4">
          <div className="space-y-2">
            <label htmlFor="delete_confirmation" className="text-sm font-medium text-foreground">
              Ako ste sigurni, upisite: Jesam
            </label>
            <input
              id="delete_confirmation"
              name="delete_confirmation"
              required
              placeholder="Jesam"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <MessageBox state={deleteState} />

          <button
            type="submit"
            disabled={deletePending}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-destructive px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deletePending ? "Brisanje..." : "Obrisi nalog"}
          </button>
        </form>
      </section>
    </div>
  );
}
