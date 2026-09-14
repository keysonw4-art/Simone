import { requireAdminPage } from "@/lib/requireAdmin";
import Link from "next/link";
import {
  Users,
  UserCheck,
  PlayCircle,
  BookOpen,
  ArrowUpRight,
  History,
} from "lucide-react";
import { prisma } from "@repo/database";
import { CountUpNumber } from "../../components/CountUpNumber";
import { SignupsChart } from "../../components/SignupsChart";

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function thirtyDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d;
}

async function loadSignupsByMonth(months = 6) {
  const now = new Date();
  const from = startOfMonth(
    new Date(now.getFullYear(), now.getMonth() - (months - 1), 1),
  );

  const rows = await prisma.user.findMany({
    where: { deletedAt: null, createdAt: { gte: from } },
    select: { createdAt: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    buckets.set(key, 0);
  }

  for (const r of rows) {
    const key = `${r.createdAt.getFullYear()}-${r.createdAt.getMonth()}`;
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([key, count]) => {
    const [, mIdx] = key.split("-").map(Number);
    return { month: MONTH_LABELS[mIdx ?? 0] ?? "?", count };
  });
}

export default async function DashboardPage() {
  await requireAdminPage();
  const since = thirtyDaysAgo();

  const [
    totalStudents,
    activeAccessUsers,
    publishedCourses,
    watchedLast30,
    completedLast30,
    topCourses,
    recentAudits,
    signupsMonthly,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT", deletedAt: null } }),
    // Alunos com acesso ativo = têm ao menos um entitlement não expirado.
    prisma.entitlement.findMany({
      where: { expiresAt: { gt: new Date() } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.course.count({ where: { isArchived: false, deletedAt: null } }),
    prisma.progress.count({ where: { lastWatchedAt: { gte: since } } }),
    prisma.progress.count({
      where: { isCompleted: true, completedAt: { gte: since } },
    }),
    prisma.course.findMany({
      where: { deletedAt: null, isArchived: false },
      select: {
        id: true,
        title: true,
        slug: true,
        modules: {
          where: { deletedAt: null },
          select: {
            lessons: {
              where: { deletedAt: null },
              select: { _count: { select: { progress: true } } },
            },
          },
        },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        user: { select: { name: true, email: true, publicId: true } },
      },
    }),
    loadSignupsByMonth(6),
  ]);

  const topRanked = topCourses
    .map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      progressCount: c.modules.reduce(
        (acc, m) =>
          acc + m.lessons.reduce((sum, l) => sum + l._count.progress, 0),
        0,
      ),
    }))
    .sort((a, b) => b.progressCount - a.progressCount)
    .slice(0, 5)
    .filter((c) => c.progressCount > 0);

  return (
    <div>
      <header className="mb-12">
        <h1 className="font-serif text-4xl text-[var(--color-brand-charcoal)] tracking-wide">
          Visão Geral
        </h1>
        <p className="text-[var(--color-brand-charcoal)]/60 mt-2 text-sm uppercase tracking-widest">
          Performance em tempo real
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard
          icon={<Users className="w-12 h-12" />}
          label="Total de Alunos"
          value={totalStudents}
        />
        <KpiCard
          icon={<UserCheck className="w-12 h-12" />}
          label="Alunos Ativos"
          value={activeAccessUsers.length}
          accent="gold"
        />
        <KpiCard
          icon={<BookOpen className="w-12 h-12" />}
          label="Cursos Publicados"
          value={publishedCourses}
        />
        <KpiCard
          icon={<PlayCircle className="w-12 h-12" />}
          label="Aulas Assistidas (30d)"
          value={watchedLast30}
          subtitle={`${completedLast30} conclusões no período`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-8 border border-black/5 rounded-lg shadow-sm h-96 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-brand-charcoal)]/60 font-medium">
              Novos Cadastros (últimos 6 meses)
            </div>
          </div>
          <div className="h-72">
            <SignupsChart data={signupsMonthly} />
          </div>
        </div>

        <div className="bg-white p-8 border border-black/5 rounded-lg shadow-sm">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-brand-charcoal)]/60 font-medium mb-6">
            Cursos Mais Assistidos
          </div>
          {topRanked.length === 0 ? (
            <p className="text-xs text-[var(--color-brand-charcoal)]/40 uppercase tracking-widest text-center py-8">
              Sem registros de progresso ainda
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {topRanked.map((c, i) => (
                <li key={c.id} className="flex items-center gap-3">
                  <span className="font-serif text-2xl text-[var(--color-brand-gold)]/60 w-6">
                    {i + 1}
                  </span>
                  <Link
                    href={`/cursos/${c.id}`}
                    className="flex-1 min-w-0 text-sm font-medium text-[var(--color-brand-charcoal)] hover:text-[var(--color-brand-sage)] truncate transition-colors"
                  >
                    {c.title}
                  </Link>
                  <span className="text-xs text-[var(--color-brand-charcoal)]/50 whitespace-nowrap">
                    {c.progressCount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white p-8 border border-black/5 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--color-brand-charcoal)]/60 font-medium">
            <History className="w-3.5 h-3.5" />
            Atividade Recente
          </div>
          <Link
            href="/logs"
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-[var(--color-brand-sage)] hover:text-[var(--color-brand-charcoal)] transition-colors"
          >
            Ver todos <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        {recentAudits.length === 0 ? (
          <p className="text-xs text-[var(--color-brand-charcoal)]/40 uppercase tracking-widest text-center py-8">
            Sem ações administrativas registradas
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {recentAudits.map((log) => (
              <li
                key={log.id}
                className="flex items-center gap-4 py-3 text-sm"
              >
                <span className="font-mono text-[10px] text-[var(--color-brand-charcoal)]/50 whitespace-nowrap">
                  {log.createdAt.toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-xs text-[var(--color-brand-charcoal)]/70 whitespace-nowrap">
                  {log.user.name ?? log.user.email ?? log.user.publicId}
                </span>
                <code className="text-[10px] font-mono px-2 py-0.5 bg-[var(--color-brand-sage)]/10 text-[var(--color-brand-sage)] rounded-sm whitespace-nowrap">
                  {log.action}
                </code>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  subtitle,
  accent = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtitle?: string;
  accent?: "default" | "gold";
}) {
  const borderClass =
    accent === "gold"
      ? "border-[var(--color-brand-gold)]/30"
      : "border-black/5";
  const iconColor =
    accent === "gold"
      ? "text-[var(--color-brand-gold)]"
      : "text-[var(--color-brand-charcoal)]";
  const labelColor =
    accent === "gold"
      ? "text-[var(--color-brand-gold)] font-medium"
      : "text-[var(--color-brand-charcoal)]/60";

  return (
    <div
      className={`bg-white p-8 border ${borderClass} rounded-lg shadow-sm relative overflow-hidden group`}
    >
      <div
        className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity ${iconColor}`}
      >
        {icon}
      </div>
      <div
        className={`text-[10px] uppercase tracking-[0.2em] ${labelColor} mb-3`}
      >
        {label}
      </div>
      <div className="text-5xl font-serif text-[var(--color-brand-charcoal)]">
        <CountUpNumber value={value} />
      </div>
      {subtitle && (
        <div className="mt-4 text-[10px] uppercase tracking-wider text-[var(--color-brand-charcoal)]/50">
          {subtitle}
        </div>
      )}
    </div>
  );
}
