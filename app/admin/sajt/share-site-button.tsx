"use client";

import { useState } from "react";

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
  const [isSharing, setIsSharing] = useState(false);

  async function handleShare() {
    setIsSharing(true);
    setMessage("");
    const url = `${window.location.origin}/${slug}`;

    try {
      if (navigator.share) {
        try {
          await navigator.share({
            title: providerName,
            text: "Pogledaj slobodne termine",
            url,
          });
          setMessage("Link je spreman za deljenje.");
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
        }
      }

      await navigator.clipboard.writeText(url);
      setMessage("Link je kopiran.");
    } catch {
      setMessage("Deljenje nije uspelo. Pokusaj ponovo.");
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <button
        type="button"
        onClick={handleShare}
        disabled={isSharing}
        className={className}
      >
        {isSharing ? "Priprema..." : "Share link"}
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
