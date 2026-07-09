import { auth } from "@repo/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "../../components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    redirect("/"); // ou página não autorizada
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-brand-offwhite)]">
      <Sidebar user={session.user} />
      <main className="flex-1 p-12 relative overflow-hidden">{children}</main>
    </div>
  );
}
