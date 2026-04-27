"use client";

import { useState } from "react";

type PasswordInputProps = {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
};

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
    >
      <path
        d="M2.75 12s3.25-5.5 9.25-5.5 9.25 5.5 9.25 5.5-3.25 5.5-9.25 5.5S2.75 12 2.75 12Z"
        className="fill-sky-500/15 stroke-sky-600"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3.2"
        className="fill-cyan-400 stroke-cyan-700"
        strokeWidth="1.3"
      />
      <circle cx="12" cy="12" r="1.35" className="fill-slate-950" />
      <circle cx="10.9" cy="10.85" r="0.65" className="fill-white" />
    </svg>
  );
}

export function PasswordInput({
  id,
  name,
  label,
  autoComplete,
  required,
  minLength,
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={isVisible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          className="w-full rounded-md border border-input bg-background px-3 py-2 pr-12 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
        <button
          type="button"
          aria-label={isVisible ? "Sakrij lozinku" : "Prikazi lozinku"}
          title={isVisible ? "Sakrij lozinku" : "Prikazi lozinku"}
          onClick={() => setIsVisible((current) => !current)}
          className="absolute right-1 top-1/2 inline-flex h-8 w-10 -translate-y-1/2 items-center justify-center rounded-md transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          {isVisible ? (
            <span aria-hidden="true" className="text-lg leading-none">
              &#128584;
            </span>
          ) : (
            <EyeIcon />
          )}
        </button>
      </div>
    </div>
  );
}
