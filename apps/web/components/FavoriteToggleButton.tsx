"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import {
  toggleFavoriteLessonAction,
  toggleFavoriteModuleAction,
} from "../actions/favorites";

type Props =
  | { kind: "lesson"; id: string; initial: boolean; compact?: boolean }
  | { kind: "module"; id: string; initial: boolean; compact?: boolean };

export function FavoriteToggleButton(props: Props) {
  const [favorited, setFavorited] = useState(props.initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const compact = "compact" in props ? props.compact : false;

  const handleClick = () => {
    setError(null);
    const previous = favorited;
    setFavorited(!previous);
    startTransition(async () => {
      const result =
        props.kind === "lesson"
          ? await toggleFavoriteLessonAction(props.id)
          : await toggleFavoriteModuleAction(props.id);
      if (!result.ok) {
        setFavorited(previous);
        setError(result.error);
      } else {
        setFavorited(result.favorited);
      }
    });
  };

  const label = favorited ? "Favoritado" : "Favoritar";
  const title = pending
    ? "Aguarde..."
    : favorited
      ? "Remover dos favoritos"
      : "Salvar nos favoritos";

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-label={title}
        title={title}
        className={`p-2 rounded-sm border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          favorited
            ? "border-[var(--color-brand-gold)]/40 bg-[var(--color-brand-gold)]/10 text-[var(--color-brand-gold)]"
            : "border-black/10 text-[var(--color-brand-charcoal)]/40 hover:border-[var(--color-brand-gold)]/40 hover:text-[var(--color-brand-gold)]"
        }`}
      >
        <Star
          className="w-4 h-4"
          fill={favorited ? "currentColor" : "none"}
        />
      </button>
    );
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-label={title}
        title={title}
        className={`flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest rounded-sm border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          favorited
            ? "border-[var(--color-brand-gold)]/40 bg-[var(--color-brand-gold)]/10 text-[var(--color-brand-gold)]"
            : "border-black/10 text-[var(--color-brand-charcoal)]/60 hover:border-[var(--color-brand-gold)]/40 hover:text-[var(--color-brand-gold)]"
        }`}
      >
        <Star className="w-3.5 h-3.5" fill={favorited ? "currentColor" : "none"} />
        {label}
      </button>
      {error && (
        <span className="text-red-500 text-[10px] font-medium">{error}</span>
      )}
    </div>
  );
}
