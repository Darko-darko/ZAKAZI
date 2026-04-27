"use client";

import { useActionState, useState } from "react";

type WorkerActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const initialWorkerActionState: WorkerActionState = {
  status: "idle",
  message: "",
};

type ArchiveWorkerFormProps = {
  action: (
    prevState: WorkerActionState,
    formData: FormData,
  ) => Promise<WorkerActionState>;
};

export function ArchiveWorkerForm({ action }: ArchiveWorkerFormProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(
    action,
    initialWorkerActionState,
  );

  if (!isConfirming) {
    return (
      <button
        type="button"
        onClick={() => setIsConfirming(true)}
        className="rounded-md border border-destructive/40 px-4 py-2.5 text-sm font-medium text-destructive transition hover:bg-destructive/10"
      >
        Arhiviraj radnika
      </button>
    );
  }

  return (
    <form action={formAction} className="w-full space-y-3">
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4">
        <p className="text-sm font-medium text-foreground">
          Arhiviranje trenutno krije radnika iz glavne liste i online
          zakazivanja. Istorija ostaje sacuvana.
        </p>
      </div>
      <div className="space-y-2">
        <label
          htmlFor="confirm_archive"
          className="text-sm font-medium text-foreground"
        >
          Za arhiviranje upisi da
        </label>
        <input
          id="confirm_archive"
          name="confirm_archive"
          pattern="da"
          required
          autoFocus
          className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-destructive/40 px-4 py-2.5 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Cuvanje..." : "Potvrdi arhiviranje"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setIsConfirming(false)}
          className="rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Odustani
        </button>
      </div>
      {state.message ? (
        <p
          className={
            state.status === "error"
              ? "text-sm font-medium text-destructive"
              : "text-sm font-medium text-foreground"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
