const COMBINING_DIACRITICALS = /[̀-ͯ]/g;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_DIACRITICALS, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

export function randomSlugSuffix(): string {
  return Math.random().toString(36).slice(2, 7);
}
