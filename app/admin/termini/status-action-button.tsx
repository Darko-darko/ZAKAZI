"use client";

type StatusActionButtonProps = {
  children: React.ReactNode;
  confirmMessage: string;
};

export function StatusActionButton({
  children,
  confirmMessage,
}: StatusActionButtonProps) {
  return (
    <button
      className="min-h-9 w-full rounded-md border border-border px-2 text-xs font-semibold text-foreground transition hover:bg-accent"
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}

type StatusActionCheckboxProps = {
  confirmMessage: string;
  checked?: boolean;
  label: string;
};

export function StatusActionCheckbox({
  confirmMessage,
  checked = false,
  label,
}: StatusActionCheckboxProps) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-border px-2 text-xs font-semibold text-foreground transition hover:bg-accent">
      <input
        type="checkbox"
        defaultChecked={checked}
        className="size-4 accent-primary"
        onChange={(event) => {
          if (event.currentTarget.checked === checked) {
            return;
          }

          if (!window.confirm(confirmMessage)) {
            event.currentTarget.checked = checked;
            return;
          }

          event.currentTarget.form?.requestSubmit();
        }}
      />
      {label}
    </label>
  );
}
