import { auth } from "@repo/auth";
import { redirect } from "next/navigation";
import { StudentHeader } from "../../components/StudentHeader";

export default async function AlunoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-brand-offwhite)]">
      <StudentHeader user={session.user} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
