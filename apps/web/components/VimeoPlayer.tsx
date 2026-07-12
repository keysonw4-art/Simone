"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";

type State =
  | { kind: "loading" }
  | { kind: "ready"; url: string }
  | { kind: "unauthorized" }
  | { kind: "forbidden" }
  | { kind: "no_video" }
  | { kind: "error"; message: string };

export function VimeoPlayer({ lessonId }: { lessonId: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/lesson/${lessonId}/video`, {
          cache: "no-store",
        });
        if (!alive) return;
        if (res.status === 401) return setState({ kind: "unauthorized" });
        if (res.status === 403) return setState({ kind: "forbidden" });
        if (res.status === 404) return setState({ kind: "no_video" });
        if (!res.ok) {
          return setState({
            kind: "error",
            message: `HTTP ${res.status}`,
          });
        }
        const data = (await res.json()) as { url: string };
        setState({ kind: "ready", url: data.url });
      } catch (err) {
        if (!alive) return;
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "erro desconhecido",
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, [lessonId]);

  return (
    <div className="aspect-video w-full bg-black rounded-lg overflow-hidden shadow-xl mb-8 border border-black/5 flex items-center justify-center relative">
      {state.kind === "loading" && (
        <div className="text-[var(--color-brand-offwhite)]/40 text-xs uppercase tracking-widest">
          Carregando vídeo...
        </div>
      )}

      {state.kind === "ready" && (
        <iframe
          src={state.url}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute top-0 left-0 w-full h-full"
        />
      )}

      {state.kind === "unauthorized" && (
        <div className="text-center px-6">
          <Lock className="w-8 h-8 text-[var(--color-brand-offwhite)]/40 mx-auto mb-3" />
          <p className="text-[var(--color-brand-offwhite)]/60 text-sm">
            Faça login para assistir.
          </p>
        </div>
      )}

      {state.kind === "forbidden" && (
        <div className="text-center px-6">
          <Lock className="w-8 h-8 text-[var(--color-brand-gold)] mx-auto mb-3" />
          <p className="text-[var(--color-brand-offwhite)]/80 text-sm mb-1">
            Assinatura necessária
          </p>
          <p className="text-[var(--color-brand-offwhite)]/50 text-xs">
            Esta aula exige um plano ativo.
          </p>
        </div>
      )}

      {state.kind === "no_video" && (
        <div className="text-[var(--color-brand-offwhite)]/40 font-serif text-lg">
          Vídeo indisponível no momento
        </div>
      )}

      {state.kind === "error" && (
        <div className="text-center px-6">
          <p className="text-red-300 text-sm">Falha ao carregar o vídeo.</p>
          <p className="text-[var(--color-brand-offwhite)]/40 text-[10px] mt-1 font-mono">
            {state.message}
          </p>
        </div>
      )}
    </div>
  );
}
