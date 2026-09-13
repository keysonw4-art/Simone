import type { NextConfig } from "next";

// Content-Security-Policy do portal do aluno.
// Precisa liberar: player do Vimeo (frame/media), imagens do Supabase (signed
// URLs de avatar/material + buckets públicos) e do Vimeo (thumbs). 'unsafe-inline'
// /'unsafe-eval' são necessários pro runtime do Next/GSAP sem nonce — o risco de
// XSS já é baixo (zero dangerouslySetInnerHTML), então o CSP aqui é defesa em
// profundidade. Pode ser endurecido depois com nonces.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://*.vimeocdn.com https://i.vimeocdn.com https://images.unsplash.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.vimeo.com",
  "frame-src 'self' https://player.vimeo.com",
  "media-src 'self' blob: https://*.vimeo.com https://*.vimeocdn.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  transpilePackages: [
    "@repo/ui",
    "@repo/database",
    "@repo/auth",
    "@repo/storage",
  ],
  serverExternalPackages: ["sharp"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
