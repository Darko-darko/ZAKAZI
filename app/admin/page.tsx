import { redirect } from "next/navigation";
import { getCurrentProvider } from "@/lib/admin/provider";

export const metadata = {
  title: "Admin | zakazi.pro",
};

export default async function AdminPage() {
  await getCurrentProvider();
  redirect("/admin/termini");
}
