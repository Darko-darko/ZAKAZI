"use client";

import { useMemo, useState } from "react";

type ReferralLinkActionsProps = {
  refCode: string;
  compact?: boolean;
};

const REFERRAL_BASE_URL = "https://zakazi.pro";

export function ReferralLinkActions({
  refCode,
  compact = false,
}: ReferralLinkActionsProps) {
  const [message, setMessage] = useState("");
  const link = useMemo(
    () => `${REFERRAL_BASE_URL}/register?ref=${refCode}`,
    [refCode],
  );

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setMessage("Link je kopiran.");
    } catch {
      setMessage("Kopiranje nije uspelo.");
    }
  }

  async function shareLink() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "zakazi.pro referral link",
          text: "Registruj nalog preko mog linka",
          url: link,
        });
        setMessage("Link je spreman za deljenje.");
        return;
      }

      await copyLink();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setMessage("Deljenje nije uspelo.");
    }
  }

  return (
    <div className="space-y-2">
      <div className="rounded-md border border-border bg-background px-2 py-2">
        <p
          className={`break-all font-mono text-xs font-medium text-foreground ${
            compact ? "max-w-[18rem]" : ""
          }`}
        >
          {link}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"
        >
          Kopiraj link
        </button>
        <button
          type="button"
          onClick={shareLink}
          className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"
        >
          Share
        </button>
      </div>
      {message ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {message}
        </p>
      ) : null}
    </div>
  );
}
