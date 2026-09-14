import "@repo/ui/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import LenisProvider from "../components/LenisProvider";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", weight: ["300", "400", "500", "600", "700"] });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-didot", weight: ["400", "500", "600", "700"] });

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://simone-site-web.vercel.app";

// Per-request CSP nonces require dynamic rendering, including public catalog pages.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Simone Mendes | Cursos de Organização",
    template: "%s | Simone Mendes",
  },
  description:
    "Cursos, metodologias e materiais de organização com Simone Mendes. Transforme a sua relação com a casa, no seu tempo.",
  keywords: [
    "organização",
    "personal organizer",
    "organização de casa",
    "método de organização",
    "Simone Mendes",
    "cursos de organização",
  ],
  authors: [{ name: "Simone Mendes" }],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "Simone Mendes",
    title: "Simone Mendes | Cursos de Organização",
    description:
      "Cursos, metodologias e materiais de organização com Simone Mendes. Transforme a sua relação com a casa, no seu tempo.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${montserrat.variable} ${playfair.variable} font-sans bg-[var(--color-brand-offwhite)] text-[var(--color-brand-charcoal)] antialiased min-h-screen flex flex-col`}>
        <LenisProvider>{children}</LenisProvider>
      </body>
    </html>
  );
}
