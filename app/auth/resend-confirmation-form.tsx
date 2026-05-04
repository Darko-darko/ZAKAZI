"use client";

import { useActionState } from "react";
import {
  resendConfirmationAction,
  type AuthActionState,
} from "@/app/auth/actions";

const initialState: AuthActionState = {
  status: "idle",
  message: "",
};

type ResendConfirmationFormProps = {
  email: string;
};

export function ResendConfirmationForm({
  email,
}: ResendConfirmationFormProps) {
  void email;

  const [state, formAction, pending] = useActionState(
    resendConfirmationAction,
    initialState,
  );

  return (
    <div className="space-y-3">
      {state.message ? (
        <p
          className={
            state.status === "success"
              ? "rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300"
              : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        formAction={formAction}
        formNoValidate
        disabled={pending}
        className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Slanje..." : "Pošalji ponovo potvrdu emaila"}
      </button>
    </div>
  );
}
