import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Award, ExternalLink } from "lucide-react";
import { prisma } from "@repo/database";
import { auth } from "@repo/auth";

export default async function MeusCertificadosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const certificates = await prisma.certificate.findMany({
    where: { userId: session.user.id },
    orderBy: { issuedAt: "desc" },
    include: {
      course: { select: { slug: true } },
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <Link
        href="/aluno"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/50 hover:text-[var(--color-brand-sage)] transition-colors mb-10"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar
      </Link>

      <header className="mb-12">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-brand-charcoal)]/60 mb-2">
          Certificados
        </p>
        <h1 className="font-serif text-4xl md:text-5xl text-[var(--color-brand-charcoal)] tracking-tight">
          Meus certificados
        </h1>
        <p className="text-sm text-[var(--color-brand-charcoal)]/70 mt-4 max-w-xl leading-relaxed">
          Certificados são emitidos automaticamente quando você conclui 100%
          das aulas de um curso. Cada um tem um código público de validação
          verificável.
        </p>
      </header>

      {certificates.length === 0 ? (
        <div className="bg-white border border-black/5 rounded-lg p-16 text-center">
          <Award className="w-10 h-10 text-[var(--color-brand-charcoal)]/20 mx-auto mb-4" />
          <p className="text-sm text-[var(--color-brand-charcoal)]/60 mb-2">
            Nenhum certificado emitido ainda.
          </p>
          <p className="text-xs text-[var(--color-brand-charcoal)]/40">
            Complete todas as aulas de um curso para ganhar o seu.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {certificates.map((cert) => (
            <article
              key={cert.id}
              className="bg-white border border-black/5 rounded-lg p-6 flex items-center justify-between gap-6 flex-wrap"
            >
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-full bg-[var(--color-brand-gold)]/10 border border-[var(--color-brand-gold)]/30 flex items-center justify-center text-[var(--color-brand-gold)] flex-shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif text-xl text-[var(--color-brand-charcoal)] tracking-wide mb-1">
                    {cert.courseTitle}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/50">
                    <span className="font-mono">{cert.publicCode}</span>
                    <span>•</span>
                    <span>
                      Emitido em{" "}
                      {cert.issuedAt.toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <Link
                href={`/validacao/${cert.publicCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-[var(--color-brand-sage)]/30 text-[var(--color-brand-sage)] text-[10px] uppercase tracking-widest rounded-sm hover:bg-[var(--color-brand-sage)]/5 transition-colors"
              >
                Ver validação <ExternalLink className="w-3 h-3" />
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
