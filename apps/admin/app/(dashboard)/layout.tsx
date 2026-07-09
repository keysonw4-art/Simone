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
      <Sidebar
        user={{
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        }}
      />
      <main className="flex-1 p-12 relative overflow-hidden">{children}</main>
    </div>
  );
}
