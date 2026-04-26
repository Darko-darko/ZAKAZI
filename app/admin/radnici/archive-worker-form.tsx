"use client";

import { useState } from "react";

type ArchiveWorkerFormProps = {
  action: (formData: FormData) => void | Promise<void>;
};

export function ArchiveWorkerForm({ action }: ArchiveWorkerFormProps) {
  const [isConfirming, setIsConfirming] = useState(false);

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
    <form action={action} className="w-full space-y-3">
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
          className="rounded-md border border-destructive/40 px-4 py-2.5 text-sm font-medium text-destructive transition hover:bg-destructive/10"
        >
          Potvrdi arhiviranje
        </button>
        <button
          type="button"
          onClick={() => setIsConfirming(false)}
          className="rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent"
        >
          Odustani
        </button>
      </div>
    </form>
  );
}
