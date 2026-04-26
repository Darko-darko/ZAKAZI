"use client";

import type { FormHTMLAttributes, ReactNode } from "react";
import { useRouter } from "next/navigation";

type FilterFormProps = {
  slug: string;
  children: ReactNode;
} & Omit<
  FormHTMLAttributes<HTMLFormElement>,
  "action" | "method" | "onChange"
>;

export function FilterForm({ slug, children, ...rest }: FilterFormProps) {
  const router = useRouter();

  function handleChange(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value !== "") {
        params.set(key, value);
      }
    }

    const query = params.toString();
    router.replace(query ? `/${slug}/book?${query}` : `/${slug}/book`, {
      scroll: false,
    });
  }

  return (
    <form
      action={`/${slug}/book`}
      method="get"
      onChange={handleChange}
      {...rest}
    >
      {children}
    </form>
  );
}
