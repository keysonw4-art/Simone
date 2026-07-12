"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function TrailerModal({
  vimeoVideoId,
  onClose,
}: {
  vimeoVideoId: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const src = `https://player.vimeo.com/video/${vimeoVideoId}?title=0&byline=0&portrait=0&autoplay=1`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Trailer"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="absolute top-4 right-4 md:top-6 md:right-6 text-white/70 hover:text-white transition-colors"
      >
        <X className="w-8 h-8" />
      </button>

      <div
        className="w-full max-w-5xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={src}
          className="absolute inset-0 w-full h-full"
          frameBorder={0}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title="Trailer"
        />
      </div>
    </div>
  );
}
