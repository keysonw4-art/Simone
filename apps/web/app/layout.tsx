import "@repo/ui/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import LenisProvider from "../components/LenisProvider";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", weight: ["300", "400", "500", "600", "700"] });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-didot", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Simone Mendes | Plataforma de Cursos",
  description: "Educação Digital para Personal Organizers",
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
