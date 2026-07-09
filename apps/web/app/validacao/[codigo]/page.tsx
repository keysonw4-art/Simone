import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { prisma } from "@repo/database";

export default async function ValidacaoPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const publicCode = codigo.trim().toUpperCase();

  const certificate = await prisma.certificate.findUnique({
    where: { publicCode },
  });

  return (
    <div className="min-h-screen bg-[var(--color-brand-offwhite)] py-16 md:py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/50 hover:text-[var(--color-brand-sage)] transition-colors mb-12"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o início
        </Link>

        <header className="mb-12">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-brand-charcoal)]/60 mb-3">
            Validação de Certificado
          </p>
          <h1 className="font-serif text-4xl md:text-5xl text-[var(--color-brand-charcoal)] tracking-tight leading-[1.1]">
            Código{" "}
            <span className="font-mono text-2xl md:text-3xl text-[var(--color-brand-charcoal)]/70 tracking-normal">
              {publicCode}
            </span>
          </h1>
        </header>

        {certificate ? (
          <div className="bg-white border border-[var(--color-brand-sage)]/20 rounded-lg overflow-hidden">
            <div className="bg-[var(--color-brand-sage)]/5 border-b border-[var(--color-brand-sage)]/10 px-8 py-6 flex items-center gap-4">
              <CheckCircle2 className="w-8 h-8 text-[var(--color-brand-sage)] flex-shrink-0" />
              <div>
                <div className="text-xs uppercase tracking-widest text-[var(--color-brand-sage)] font-medium">
                  Certificado autêntico
                </div>
                <div className="text-sm text-[var(--color-brand-charcoal)]/70 mt-0.5">
                  Emitido pela plataforma Simone Mendes.
                </div>
              </div>
            </div>

            <dl className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <Field label="Aluno" value={certificate.studentName} />
              <Field label="Curso" value={certificate.courseTitle} />
              <Field
                label="Data de emissão"
                value={certificate.issuedAt.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              />
              <Field label="Código público" value={certificate.publicCode} mono />
            </dl>
          </div>
        ) : (
          <div className="bg-white border border-red-200 rounded-lg overflow-hidden">
            <div className="bg-red-50 border-b border-red-100 px-8 py-6 flex items-center gap-4">
              <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
              <div>
                <div className="text-xs uppercase tracking-widest text-red-600 font-medium">
                  Código inválido
                </div>
                <div className="text-sm text-[var(--color-brand-charcoal)]/70 mt-0.5">
                  Não encontramos um certificado com este código.
                </div>
              </div>
            </div>
            <div className="p-8 text-sm text-[var(--color-brand-charcoal)]/70 leading-relaxed">
              <p className="mb-3">Verifique se:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>o código foi digitado corretamente;</li>
                <li>
                  o formato é <code className="font-mono">CERT-AAAA-NNNNN</code>;
                </li>
                <li>o certificado ainda não foi revogado.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-[var(--color-brand-charcoal)]/50 mb-1">
        {label}
      </dt>
      <dd
        className={
          mono
            ? "text-base font-mono text-[var(--color-brand-charcoal)]"
            : "text-base text-[var(--color-brand-charcoal)]"
        }
      >
        {value}
      </dd>
    </div>
  );
}
