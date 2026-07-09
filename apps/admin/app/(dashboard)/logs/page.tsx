import Link from "next/link";
import { prisma } from "@repo/database";

type Tab = "system" | "audit";

function normalizeTab(v: string | undefined): Tab {
  return v === "audit" ? "audit" : "system";
}

function parseDescription(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // not JSON — fall back to raw string
  }
  return null;
}

function fmtValue(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function fmtDate(d: Date): string {
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const TABS: { key: Tab; label: string; href: string }[] = [
  { key: "system", label: "Sistema", href: "/logs" },
  { key: "audit", label: "Auditoria", href: "/logs?tab=audit" },
];

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab = normalizeTab(rawTab);

  const [systemLogs, auditLogs] =
    tab === "system"
      ? await Promise.all([
          prisma.systemLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 50,
            include: {
              user: { select: { email: true, publicId: true, name: true } },
            },
          }),
          Promise.resolve(null),
        ])
      : await Promise.all([
          Promise.resolve(null),
          prisma.auditLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 50,
            include: {
              user: { select: { email: true, publicId: true, name: true } },
            },
          }),
        ]);

  return (
    <div>
      <header className="mb-10">
        <h1 className="font-serif text-4xl text-[var(--color-brand-charcoal)] tracking-wide">
          Logs
        </h1>
        <p className="text-[var(--color-brand-charcoal)]/60 mt-2 text-sm uppercase tracking-widest">
          Observabilidade do sistema
        </p>
      </header>

      <div className="flex items-center gap-2 mb-6">
        {TABS.map((t) => {
          const isActive = t.key === tab;
          return (
            <Link
              key={t.key}
              href={t.href}
              className={
                isActive
                  ? "px-4 py-2 text-[10px] uppercase tracking-widest border border-[var(--color-brand-sage)] text-[var(--color-brand-sage)] bg-[var(--color-brand-sage)]/5 rounded-sm"
                  : "px-4 py-2 text-[10px] uppercase tracking-widest border border-black/10 text-[var(--color-brand-charcoal)]/60 hover:border-[var(--color-brand-charcoal)]/30 hover:text-[var(--color-brand-charcoal)] rounded-sm transition-colors"
              }
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <div className="bg-white border border-black/5 rounded-lg overflow-hidden">
        {tab === "system" && systemLogs && (
          <LogsTable
            rows={systemLogs.map((l) => ({
              id: l.id,
              when: l.createdAt,
              userLabel: l.user?.name ?? l.user?.email ?? l.user?.publicId ?? "—",
              actionLabel: l.event,
              origin: l.origin,
              parsed: parseDescription(l.description),
              raw: l.description,
            }))}
            actionColumnLabel="Evento"
            emptyMessage="Sem eventos de sistema registrados"
            showOrigin
          />
        )}
        {tab === "audit" && auditLogs && (
          <LogsTable
            rows={auditLogs.map((l) => ({
              id: l.id,
              when: l.createdAt,
              userLabel:
                l.user?.name ?? l.user?.email ?? l.user?.publicId ?? "—",
              actionLabel: l.action,
              origin: null,
              parsed: parseDescription(l.details),
              raw: l.details,
            }))}
            actionColumnLabel="Ação"
            emptyMessage="Sem ações administrativas registradas"
          />
        )}
      </div>
    </div>
  );
}

type LogRow = {
  id: string;
  when: Date;
  userLabel: string;
  actionLabel: string;
  origin: string | null;
  parsed: Record<string, unknown> | null;
  raw: string | null;
};

function LogsTable({
  rows,
  actionColumnLabel,
  emptyMessage,
  showOrigin = false,
}: {
  rows: LogRow[];
  actionColumnLabel: string;
  emptyMessage: string;
  showOrigin?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-[var(--color-brand-charcoal)]/40 text-sm uppercase tracking-widest">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-black/5 text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/60">
          <th className="text-left px-6 py-4 font-medium">Quando</th>
          <th className="text-left px-6 py-4 font-medium">Usuário</th>
          <th className="text-left px-6 py-4 font-medium">{actionColumnLabel}</th>
          {showOrigin && (
            <th className="text-left px-6 py-4 font-medium">Origem</th>
          )}
          <th className="text-left px-6 py-4 font-medium">Detalhes</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.id}
            className="border-b border-black/5 last:border-b-0 hover:bg-black/[0.015]"
          >
            <td className="px-6 py-3 align-top">
              <span className="font-mono text-[10px] text-[var(--color-brand-charcoal)]/70 whitespace-nowrap">
                {fmtDate(r.when)}
              </span>
            </td>
            <td className="px-6 py-3 align-top">
              <span className="text-xs text-[var(--color-brand-charcoal)]/80 truncate max-w-[180px] block">
                {r.userLabel}
              </span>
            </td>
            <td className="px-6 py-3 align-top">
              <code className="text-[10px] font-mono px-2 py-0.5 bg-[var(--color-brand-sage)]/10 text-[var(--color-brand-sage)] rounded-sm whitespace-nowrap">
                {r.actionLabel}
              </code>
            </td>
            {showOrigin && (
              <td className="px-6 py-3 align-top">
                <span className="font-mono text-[10px] text-[var(--color-brand-charcoal)]/60 whitespace-nowrap">
                  {r.origin ?? "—"}
                </span>
              </td>
            )}
            <td className="px-6 py-3 align-top">
              {r.parsed ? (
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {Object.entries(r.parsed).map(([k, v]) => (
                    <span
                      key={k}
                      className="text-[10px] text-[var(--color-brand-charcoal)]/70 font-mono"
                    >
                      <span className="text-[var(--color-brand-charcoal)]/40">
                        {k}=
                      </span>
                      {fmtValue(v)}
                    </span>
                  ))}
                </div>
              ) : r.raw ? (
                <span className="text-[10px] text-[var(--color-brand-charcoal)]/60 font-mono">
                  {r.raw}
                </span>
              ) : (
                <span className="text-[10px] text-[var(--color-brand-charcoal)]/30">
                  —
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
