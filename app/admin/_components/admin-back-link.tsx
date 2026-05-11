import Link from "next/link";

type AdminBackLinkProps = {
  href?: string;
  label?: string;
};

export function AdminBackLink({
  href = "/admin",
  label = "Nazad na admin",
}: AdminBackLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
    >
      <span aria-hidden="true">&larr;</span>
      <span>{label}</span>
    </Link>
  );
}
