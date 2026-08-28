import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createCourseAction } from "../../../../actions/courses";
import { CourseForm } from "../../../../components/CourseForm";

export default function NovoCursoPage() {
  return (
    <div>
      <Link
        href="/cursos"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/60 hover:text-[var(--color-brand-sage)] mb-6 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Módulos
      </Link>

      <header className="mb-10">
        <h1 className="font-serif text-4xl text-[var(--color-brand-charcoal)] tracking-wide">
          Novo Módulo
        </h1>
        <p className="text-[var(--color-brand-charcoal)]/60 mt-2 text-sm uppercase tracking-widest">
          Cadastre uma nova peça de conteúdo
        </p>
      </header>

      <CourseForm action={createCourseAction} submitLabel="Criar Módulo" />
    </div>
  );
}
