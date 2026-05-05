import Link from "next/link";
import type { ReactNode } from "react";

type AdminAlertBoxProps = {
  title: string;
  description?: string;
  href?: string;
  children?: ReactNode;
};

export function AdminAlertBox({
  title,
  description,
  href,
  children,
}: AdminAlertBoxProps) {
  const baseClass =
    "block rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive";
  const content = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        {description ? (
          <p className="mt-1 opacity-90">{description}</p>
        ) : null}
        {children}
      </div>
      <span className="shrink-0 rounded-full border border-current/20 px-2 py-0.5 text-[11px] font-semibold">
        Hitno
      </span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={`${baseClass} transition hover:opacity-90`}>
        {content}
      </Link>
    );
  }

  return <div className={baseClass}>{content}</div>;
}
