"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ImagePlus } from "lucide-react";
import {
  uploadCourseThumbnailAction,
  type ThumbnailUploadState,
} from "../actions/uploads";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-5 py-2.5 bg-[var(--color-brand-sage)] text-white text-[10px] uppercase tracking-widest rounded-sm hover:bg-[var(--color-brand-charcoal)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {pending ? "Enviando..." : "Enviar Thumbnail"}
    </button>
  );
}

type Props = {
  courseId: string;
  currentUrl: string | null;
};

export function CourseThumbnailUploader({ courseId, currentUrl }: Props) {
  const bound = uploadCourseThumbnailAction.bind(null, courseId);
  const [state, formAction] = useActionState<ThumbnailUploadState, FormData>(
    bound,
    undefined,
  );
  const [previewName, setPreviewName] = useState<string | null>(null);

  const liveUrl = state?.ok === true ? state.url : currentUrl;

  return (
    <div className="bg-white border border-black/5 rounded-lg p-6 max-w-2xl">
      <div className="flex items-start gap-6">
        <div className="w-32 h-32 flex-shrink-0 bg-[var(--color-brand-charcoal)]/5 rounded-sm overflow-hidden flex items-center justify-center border border-black/5">
          {liveUrl ? (
            <img
              src={liveUrl}
              alt="Thumbnail atual"
              className="w-full h-full object-cover"
            />
          ) : (
            <ImagePlus className="w-8 h-8 text-[var(--color-brand-charcoal)]/20" />
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium mb-1">
            Thumbnail do Módulo
          </h3>
          <p className="text-[10px] text-[var(--color-brand-charcoal)]/50 mb-4 leading-relaxed">
            Upload converte automaticamente para WebP. Máximo 5 MB. Formatos
            aceitos: JPG, PNG, WebP, GIF, AVIF.
          </p>

          <form action={formAction} className="flex flex-col gap-3">
            <input
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              required
              onChange={(e) =>
                setPreviewName(e.currentTarget.files?.[0]?.name ?? null)
              }
              className="text-xs text-[var(--color-brand-charcoal)]/70 file:mr-3 file:px-3 file:py-2 file:rounded-sm file:border-0 file:bg-[var(--color-brand-charcoal)]/5 file:text-[var(--color-brand-charcoal)]/70 file:text-[10px] file:uppercase file:tracking-widest hover:file:bg-[var(--color-brand-charcoal)]/10 file:cursor-pointer"
            />
            {previewName && (
              <span className="text-[10px] text-[var(--color-brand-charcoal)]/50 font-mono">
                {previewName}
              </span>
            )}
            <div>
              <SubmitButton />
            </div>
            {state?.ok === false && (
              <span className="text-red-500 text-[10px] font-medium">
                {state.error}
              </span>
            )}
            {state?.ok === true && (
              <span className="text-[var(--color-brand-sage)] text-[10px] font-medium">
                Thumbnail atualizada.
              </span>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
