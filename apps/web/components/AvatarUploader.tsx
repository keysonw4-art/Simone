"use client";

import Image from "next/image";
import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Trash2, UserCircle } from "lucide-react";
import {
  removeAvatarAction,
  uploadAvatarAction,
  type AvatarUploadState,
} from "../actions/profile";

function SubmitButton({ hasCurrent }: { hasCurrent: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-5 py-2.5 bg-[var(--color-brand-sage)] text-white text-[10px] uppercase tracking-widest rounded-sm hover:bg-[var(--color-brand-charcoal)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {pending
        ? "Enviando..."
        : hasCurrent
          ? "Trocar foto"
          : "Enviar foto"}
    </button>
  );
}

export function AvatarUploader({ initialUrl }: { initialUrl: string | null }) {
  const [state, formAction] = useActionState<AvatarUploadState, FormData>(
    uploadAvatarAction,
    undefined,
  );
  const [removePending, startRemove] = useTransition();
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removedLocal, setRemovedLocal] = useState(false);

  const currentUrl = removedLocal
    ? null
    : state?.ok === true
      ? state.url
      : initialUrl;
  const hasCurrent = !!currentUrl;

  const handleRemove = () => {
    if (!confirm("Remover sua foto de perfil?")) return;
    setRemoveError(null);
    startRemove(async () => {
      const result = await removeAvatarAction();
      if (!result.ok) {
        setRemoveError(result.error);
      } else {
        setRemovedLocal(true);
      }
    });
  };

  return (
    <div className="bg-white border border-black/5 rounded-lg p-6 md:p-8">
      <div className="flex items-start gap-6 flex-wrap">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-[var(--color-brand-charcoal)]/5 border border-black/5 flex items-center justify-center flex-shrink-0">
          {currentUrl ? (
            <Image unoptimized width={96} height={96}
              src={currentUrl}
              alt="Foto de perfil"
              className="w-full h-full object-cover"
            />
          ) : (
            <UserCircle className="w-10 h-10 text-[var(--color-brand-charcoal)]/25" />
          )}
        </div>

        <div className="flex-1 min-w-[220px]">
          <h3 className="text-xs uppercase tracking-widest text-[var(--color-brand-charcoal)]/70 font-medium mb-1">
            Foto de perfil
          </h3>
          <p className="text-[10px] text-[var(--color-brand-charcoal)]/50 mb-4 leading-relaxed">
            JPG, PNG, WebP, GIF ou AVIF. Máximo 3 MB. Convertida
            automaticamente para WebP e mantida em armazenamento privado.
          </p>

          <form action={formAction} className="flex flex-col gap-3">
            <input
              type="file"
              onChange={(e) => e.currentTarget.setCustomValidity((e.currentTarget.files?.[0]?.size ?? 0) > 3 * 1024 * 1024 ? "O limite é 3 MB." : "")}
              name="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              required
              className="text-xs text-[var(--color-brand-charcoal)]/70 file:mr-3 file:px-3 file:py-2 file:rounded-sm file:border-0 file:bg-[var(--color-brand-charcoal)]/5 file:text-[var(--color-brand-charcoal)]/70 file:text-[10px] file:uppercase file:tracking-widest hover:file:bg-[var(--color-brand-charcoal)]/10 file:cursor-pointer"
            />
            <div className="flex items-center gap-3 flex-wrap">
              <SubmitButton hasCurrent={hasCurrent} />
              {hasCurrent && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={removePending}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-[10px] uppercase tracking-widest border border-red-200 text-red-600 rounded-sm hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {removePending ? "Removendo..." : "Remover"}
                </button>
              )}
            </div>
            {state?.ok === false && (
              <span className="text-red-500 text-[10px] font-medium">
                {state.error}
              </span>
            )}
            {state?.ok === true && (
              <span className="text-[var(--color-brand-sage)] text-[10px] font-medium">
                Foto atualizada.
              </span>
            )}
            {removeError && (
              <span className="text-red-500 text-[10px] font-medium">
                {removeError}
              </span>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
