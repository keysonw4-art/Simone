export const PAGE_SIZE = 50;

export function parsePage(value: string | string[] | undefined): number {
  if (typeof value !== "string" || !/^\d{1,5}$/.test(value)) return 1;
  return Math.max(1, Math.min(10000, Number(value)));
}

export function Pagination({ page, hasMore, href }: {
  page: number; hasMore: boolean; href: string;
}) {
  const separator = href.includes("?") ? "&" : "?";
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-4 mt-6 text-sm">
      {page > 1 ? <a href={`${href}${separator}page=${page - 1}`}>Anterior</a> : <span />}
      <span>Página {page}</span>
      {hasMore ? <a href={`${href}${separator}page=${page + 1}`}>Próxima</a> : <span />}
    </nav>
  );
}
