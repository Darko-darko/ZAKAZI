"use client";

import { useState, useTransition } from "react";

type ShareSiteButtonProps = {
  slug: string;
  providerName: string;
  className?: string;
  messageClassName?: string;
};

export function ShareSiteButton({
  slug,
  providerName,
  className,
  messageClassName,
}: ShareSiteButtonProps) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleShare() {
    const url = `${window.location.origin}/${slug}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: providerName,
          text: `Pogledaj mini sajt za ${providerName}`,
          url,
        });
        setMessage("Link je spreman za deljenje.");
        return;
      }

      await navigator.clipboard.writeText(url);
      setMessage("Link je kopiran.");
    } catch {
      setMessage("Deljenje nije uspelo. Pokusaj ponovo.");
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <button
        type="button"
        onClick={() => startTransition(handleShare)}
        disabled={isPending}
        className={className}
      >
        {isPending ? "Priprema..." : "Share link"}
      </button>
      {message ? (
        <p
          className={`text-sm text-muted-foreground ${messageClassName ?? ""}`}
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
