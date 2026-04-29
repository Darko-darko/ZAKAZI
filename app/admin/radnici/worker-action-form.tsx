"use client";

import { useActionState } from "react";

type WorkerActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const initialWorkerActionState: WorkerActionState = {
  status: "idle",
  message: "",
};

type WorkerActionFormProps = {
  action: (prevState: WorkerActionState) => Promise<WorkerActionState>;
  label: string;
  pendingLabel?: string;
  disabled?: boolean;
  variant?: "primary" | "secondary";
};

export function WorkerActionForm({
  action,
  label,
  pendingLabel = "Cuvanje...",
  disabled = false,
  variant = "primary",
}: WorkerActionFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    initialWorkerActionState,
  );
  const buttonClass =
    variant === "secondary"
      ? "btn-secondary rounded-md px-4 py-2.5 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      : "btn-primary rounded-md px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <form action={formAction} className="space-y-2">
      <button type="submit" disabled={disabled || pending} className={buttonClass}>
        {pending ? pendingLabel : label}
      </button>
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
