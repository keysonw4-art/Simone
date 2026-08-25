import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://simone-site-web.vercel.app";

/**
 * Sitemap das páginas públicas. Rotas privadas (/aluno/*) e de API ficam de
 * fora — não são indexáveis. Atualize quando surgirem novas páginas públicas.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = ["", "/planos", "/termos", "/privacidade"];

  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
