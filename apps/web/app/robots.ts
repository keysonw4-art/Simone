import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://simone-site-web.vercel.app";

/**
 * Libera o rastreamento das páginas públicas (marketing/SEO/AISO/GEO — inclui
 * crawlers de IA, sem bloqueio a GPTBot/PerplexityBot etc.) e barra as áreas
 * privadas e de API. Áreas privadas já exigem login no middleware; o Disallow
 * evita que bots gastem crawl budget e apareçam com páginas de redirect.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/aluno/", "/api/", "/login", "/signup", "/validacao/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
